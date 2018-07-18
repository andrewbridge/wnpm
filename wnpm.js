(function() {
	'use strict';

	const NPM_URL = 'https://api.npms.io/v2/search';
	const GITHUB_URL = 'https://api.github.com/repos';
	const GITCDN_URL = 'https://gitcdn.link/repo';
	const UNPKG_URL = 'https://unpkg.com';

	function jsonFetch() {
		return new Promise((resolve, reject) => {
			fetch(...arguments).then(r => r.ok ? r.json().then(resolve, reject) : reject(r), reject);
		});
	}

	function search(query, filters) {
		if (typeof filters === 'object') {
			for (let filter in filters) {
				const content = filters[filter];
				query += `+${filter}:${content instanceof Array ? content.join(',') : content}`;
			}
		}
		return jsonFetch(`${NPM_URL}?q=${query}`);
	}

	function getCdnUrl(npmPackage, cdnProvider) {
		return new Promise(async (resolve, reject) => {
			switch(cdnProvider) {
				case 'github':
					try {
						resolve(getGitHubCdnUrl(npmPackage));
					} catch(e) {
						reject(e);
					}
					break;
				case 'unpkg':
					resolve(getPackageCdn(npmPackage, UNPKG_URL));
					break;
			}
		});
	}

	async function getGitHubCdnUrl(npmPackage) {
		if (npmPackage.links.repository.match(/github\.com/) === null) {
			const msg = `${npmPackage.name} does not use github as it's repository. Found ${npmPackage.links.respository}`;
			console.error(msg);
			throw new Error({msg, details: npmPackage});
		}

		console.log(`Loading via GitHub using ${npmPackage.links.respository}`);
		const repoPath = npmPackage.links.repository.replace(/(^.*github\.com\/|\/$)/g, '');

		// NPM likes semver parsable versions, so there often isn't a leading 'v'. GitHub suggests using the v.
		let tags;
		try {
			tags = await jsonFetch(`${GITHUB_URL}/${repoPath}/tags`);
			if (tags.length === 0) {
				throw tags;
			}
		} catch (e) {
			const msg = `No tags found for ${npmPackage.name}'s listed repo. Unable to pull stable release. Aborting`;
			console.error(msg);
			throw new Error({msg, details: e});
			return;
		}

		const tag = tags.find(tag => tag.name === npmPackage.version || tag.name === `v${npmPackage.version}`);

		let releaseTag;
		if (typeof tag === 'undefined') {
			// Neither version tag looks usable. Let's grab the latest release for the repo from the GitHub API
			releaseTag = tags[0].name;
			console.warn(`Unable to find a suitable repo tag for version ${npmPackage.version}. Using the latest tag (${releaseTag}) instead.`);
		} else {
			releaseTag = tag.name;
		}

		return `${GITCDN_URL}/${repoPath}/${releaseTag}`;
	}

	function getPackageCdn(npmPackage, cdnUrl) {
		return `${cdnUrl}/${npmPackage.name}@${npmPackage.version}`;
	}

	class WNPM {
		static get(query, opts) {
			const defaultOpts = {
				npmFilters: {
					not: ['deprecated','insecure','unstable']
				}, 
				cdnProviders: ['unpkg','github']
			};
			opts = Object.assign({}, defaultOpts, opts);
			return new Promise(async (resolve, reject) => {
				let npmResults;
				try {
					npmResults = await search(query, opts.npmFilters);
				} catch(e) {
					const msg = 'Error searching NPM registry.';
					console.error(msg);
					reject({msg, details: e});
					return;
				}

				if (npmResults.total === 0) {
					const msg = `No results found for ${query}.`;
					console.error(msg);
					reject({msg, details: npmResults});
					return;
				}

				if (parseInt(npmResults.results[0].searchScore) < 100 && !('forcePackage' in opts)) {
					const msg = `Couldn't find an exact match for ${query}.\n\n` +
					`Use wnpm.search to determine the correct package name or use the 'forcePackage' option with wnpm.get`;
					console.error(msg);
					reject({msg, details: npmResults});
					return;
				}

				const packageIndex = opts.forcePackage - 1 || 0;
				const npmPackage = npmResults.results[packageIndex].package;
				console.log(`Found ${query} as ${npmPackage.name} at ${npmPackage.version}; using ${npmPackage.links.repository}`);

				let baseUrl, providerFound = false;
				for (let provider of opts.cdnProviders) {
					try {
						baseUrl = await getCdnUrl(npmPackage, provider);
						providerFound = true;
						break;
					} catch(e) {
						console.warn(`Could not generate a CDN URL for ${provider}`);
					}
				}

				if (!providerFound) {
					const msg = `Couldn't generate a CDN URL for any provider`;
					console.error(msg);
					reject({msg, details: npmPackage});
					return;
				}

				let mainFile, mainFileName;
				try {
					const packageJSON = await jsonFetch(`${baseUrl}/package.json`);
					console.log(`package.json retrieved`);
					if (packageJSON.dependencies instanceof Array && packageJSON.dependencies.length > 0) {
						console.log(`This package appears to have dependencies. You may have issues running this package.`);
					}
					if ('unpkg' in packageJSON) {
						mainFileName = 'unpkg';
					} else if ('browser' in packageJSON) {
						mainFileName = 'browser';
					} else {
						mainFileName = 'main';
					}
					mainFile = packageJSON[mainFileName];
					console.log(`Loading package ${mainFileName} file: ${mainFile}`);
				} catch(e) {
					const msg = `Error retrieving package.json for ${npmPackage.name}. Status: ${e.status}`;
					console.error(msg);
					reject({msg, details: e});
				}

				try {
					await WNPM.load(`${baseUrl}/${mainFile}`);
					console.log(`${npmPackage.name} loaded!`);
					resolve(npmPackage);
				} catch (e) {
					const msg = 'An error occurred loading the script.';
					console.error(msg);
					reject({msg, details: e});
				}
			});
		}

		static getAll(queries, opts) {
			return Promise.all(queries.map(query => WNPM.get(query, opts)));
		}

		static load(scriptUrl) {
			return new Promise((resolve, reject) => {
				const elm = document.createElement('SCRIPT');
				elm.addEventListener('load', resolve, false);
				elm.addEventListener('error', reject, false);
				elm.src = scriptUrl;
				document.body.appendChild(elm);
			});
		}

		static search(query = '', filters = {}) {
			return new Promise(async (resolve, reject) => {
				let json;
				try {
					json = await search(query, filters);
				} catch(e) {
					const msg = 'Error searching NPM registry';
					console.error(msg);
					reject({msg, details: e});
					return;
				}

				console.groupCollapsed(`${json.total} found for ${query}`);
				json.results.forEach((result, index) => {
					console.groupCollapsed(`${index + 1}. ${result.package.name}`);
					console.log(`Result score: ${parseInt(result.score.final * 100)}%`);
					console.log(result.package.description);
					if (result.searchScore < 100) {
						console.log('%cThis package would not be selected automatically with wnpm.get', 'color: red');
					} else {
						console.log('%cThis package could be selected automatically with wnpm.get', 'color: green');
					}
					console.groupEnd();
				});
				console.groupEnd();

				resolve(json);
			});
		}
	}

	window.wnpm = WNPM;
})();
