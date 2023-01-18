import { version } from './package.json';

const NPM_URL = 'https://registry.npmjs.org/-/v1/search';
const GITHUB_URL = 'https://api.github.com/repos';
const JSDELIVR_URL = 'https://cdn.jsdelivr.net/gh/';
const UNPKG_URL = 'https://unpkg.com';

const jsonFetch = (...args) => fetch(...args).then((response) => {
	if (response.ok) return response.json();
	throw Error(`Fetch failed: ${response.status} ${response.statusText}`);
});

const getGitHubCdnUrl = async (npmPackage) => {
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

	return `${JSDELIVR_URL}/${repoPath}/${releaseTag}`;
}

const getPackageCdn = (npmPackage, cdnUrl) => `${cdnUrl}/${npmPackage.name}@${npmPackage.version}`;

const getCdnUrl = async (npmPackage, cdnProvider) => {
	switch(cdnProvider) {
		case 'github':
			return await getGitHubCdnUrl(npmPackage);
		case 'unpkg':
			return getPackageCdn(npmPackage, UNPKG_URL);
	}
};

const search = (query, filters) => {
	if (typeof filters === 'object') {
		for (let filter in filters) {
			const specifier = filters[filter];
			if (Array.isArray(specifier)) {
				specifier.forEach(value => query += ` ${filter}:${value}`);
				continue;
			}
			query += ` ${filter}:${specifier}`;
		}
	}
	return jsonFetch(`${NPM_URL}?text=${encodeURIComponent(query)}`);
}

class WNPMError extends Error {
	constructor(message, details) {
		super(message);
		this.details = details;
	}
}

class WNPM {
	static async get(query, opts) {
		const defaultOpts = {
			filters: {
				not: ['deprecated','insecure','unstable']
			},
			cdnProviders: ['unpkg','github']
		};
		const { filters, forcePackage, cdnProviders, filePath } = Object.assign({}, defaultOpts, opts);
		let npmResults;
		try {
			npmResults = await search(query, filters);
		} catch(e) {
			const msg = 'Error searching NPM registry.';
			console.error(msg);
			throw new WNPMError(msg, e);
		}

		if (npmResults.total === 0) {
			const msg = `No results found for ${query}.`;
			console.error(msg);
			throw new WNPMError(msg, npmResults);
		}

		if (parseInt(npmResults.objects[0].searchScore) < 100 && !forcePackage) {
			const msg = `Couldn't find an exact match for ${query}.\n\n` +
			`Use wnpm.search to determine the correct package name or use the 'forcePackage' option with wnpm.get`;
			console.error(msg);
			throw new WNPMError(msg, npmResults);
		}

		const packageIndex = forcePackage - 1 || 0;
		const npmPackage = npmResults.objects[packageIndex].package;
		console.log(`Found ${query} as ${npmPackage.name} at ${npmPackage.version}; using ${npmPackage.links.repository}`);

		let baseUrl, providerFound = false;
		for (let provider of cdnProviders) {
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
			throw new WNPMError(msg, npmPackage);
		}

		let mainFile, mainFileName;
		try {
			const packageJSON = await jsonFetch(`${baseUrl}/package.json`);
			console.log(`package.json retrieved`);
			if (packageJSON.dependencies instanceof Array && packageJSON.dependencies.length > 0) {
				console.log(`This package appears to have dependencies. You may have issues running this package.`);
			}
			if ('unpkg' in packageJSON && typeof packageJSON.unpkg === 'string') {
				mainFileName = 'unpkg';
			} else if ('browser' in packageJSON && typeof packageJSON.browser === 'string') {
				mainFileName = 'browser';
			} else {
				mainFileName = 'main';
			}
			mainFile = filePath || packageJSON[mainFileName] || 'index.js';
			console.log(`Loading package ${mainFileName} file: ${mainFile}`);
		} catch(e) {
			const msg = `Error retrieving package.json for ${npmPackage.name}. Status: ${e.status}`;
			console.error(msg);
			throw new WNPMError(msg, e);
		}

		try {
			await WNPM.load(`${baseUrl}/${mainFile}`);
			console.log(`${npmPackage.name} loaded!`);
			return npmPackage;
		} catch (e) {
			const msg = 'An error occurred loading the script.';
			console.error(msg);
			throw new WNPMError(msg, e);
		}
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

	static async search(query = '', filters = {}) {
		let json;
		try {
			json = await search(query, filters);
		} catch(e) {
			const msg = 'Error searching NPM registry';
			console.error(msg);
			throw new WNPMError(msg, e);
			return;
		}

		console.groupCollapsed(`${json.total} found for ${query}`);
		json.objects.forEach((result, index) => {
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

		return json;
	}
}

window.wnpm = WNPM;
console.info(`WNPM v${version} loaded`);
