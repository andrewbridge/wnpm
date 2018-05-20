(function() {
	'use strict';

	const NPM_URL = 'https://api.npms.io/v2/search';
	const GITHUB_URL = 'https://api.github.com/repos';
	const GITCDN_URL = 'https://gitcdn.link/repo';

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

	class WNPM {
		static async get(query, opts = {npmFilters: {not: ['deprecated','insecure','unstable']}}) {
			let npmResults;
			try {
				npmResults = await search(query, opts.npmFilters);
			} catch(e) {
				console.error('Error searching NPM registry.', e);
				return;
			}

			if (npmResults.total === 0) {
				console.error(`No results found for ${query}.`);
				return;
			}

			if (parseInt(npmResults.results[0].searchScore) < 100 && !('forcePackage' in opts)) {
				console.error(`Couldn't find an exact match for ${query}.\n\nUse wnpm.search to determine the correct package name or use the 'forcePackage' option with wnpm.get`);
				return;
			}

			const packageIndex = opts.forcePackage - 1 || 0;
			const npmPackage = npmResults.results[packageIndex].package;

			if (npmPackage.links.repository.match(/github\.com/) === null) {
				console.error(`${npmPackage.name} does not use github as it's repository. Found ${npmPackage.links.respository}`);
				return;
			}

			console.log(`Found ${query} as ${npmPackage.name} at ${npmPackage.version}; using ${npmPackage.links.repository}`);
			const repoPath = npmPackage.links.repository.replace(/(^.*github\.com\/|\/$)/g, '');

			// NPM likes semver parsable versions, so there often isn't a leading 'v'. GitHub suggests using the v.
			let tags;
			try {
				tags = await jsonFetch(`${GITHUB_URL}/${repoPath}/tags`);
				if (tags.length === 0) {
					throw tags;
				}
			} catch (e) {
				console.error(`No tags found for ${npmPackage.name}'s listed repo. Unable to pull stable release. Aborting`);
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

			let mainFile;
			try {
				const packageJSON = await jsonFetch(`${GITCDN_URL}/${repoPath}/${releaseTag}/package.json`);
				console.log(`package.json retrieved`);
				if (packageJSON.dependencies instanceof Array && packageJSON.dependencies.length > 0) {
					console.log(`This package appears to have dependencies. You may have issues running this package.`);
				}
				mainFile = packageJSON.unpkg || packageJSON.main;
				console.log(`Loading package main file: ${mainFile}`);
			} catch(e) {
				console.error(`Error retrieving package.json for ${npmPackage.name}. Status: ${packageResponse.status}`);
			}

			try {
				WNPM.load(`${GITCDN_URL}/${repoPath}/${releaseTag}/${mainFile}`);
				console.log(`${npmPackage.name} loaded!`);
			} catch (e) {
				console.error('An error occurred loading the script.', e);
			}
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

		static async search(query = '', filters = {}) {
			let json;
			try {
				json = await search(query, filters);
			} catch(e) {
				console.error('Error searching NPM registry');
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
		}
	}

	window.wnpm = WNPM;
})();