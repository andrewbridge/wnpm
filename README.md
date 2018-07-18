# WNPM
> A simplistic NPM package loader and interface for the browser

WNPM allows NPM packages which are usable in a browser and pre-built in their repo to be loaded into the browser. It does this by stringing together other far cleverer services such as [npms.io](https://npms.io/), [the GitHub API](https://developer.github.com/), [GitCDN](https://gitcdn.link/), and [UNPKG](https://unpkg.com).

## Why?

I often find myself building initial versions of tools, projects and features out in the developer console or at least with some assistance from it. Being able to call various tools and packages such as `lodash` or `vue` quickly and temporarily seemed useful. That said, I'm well aware that this is a relatively over-engineered solution to the problem.

Given that I was already making use of [npms.io](https://npms.io), to ability to search the NPM registry from the console seemed like a further nice to have.

## Caveats

WNPM isn't anywhere close to providing the feature set of `npm` or real package managers.

- Packages with dependencies won't have those depedencies loaded (for a variety of reasons)
- Packages need to have a `unpkg`, `browser` or `main` field specified which can run in a browser standalone

## Install

The best way to install and use WNPM is as a bookmarklet or a user script. Create a new bookmarklet and replace the URL with

```
javascript:(function(){const a=window.wnpm;if('object'!=typeof a||null===a){const b=document.createElement('SCRIPT');b.type='text/javascript',b.src='https://gitcdn.link/repo/andrewbridge/wnpm/master/wnpm.min.js',b.addEventListener('error',()=>alert('An error occurred loading the bookmarklet'),!1),document.head.appendChild(b)}})();
```

Or copy and paste the contents of `bookmarklet.js` or `bookmarklet.min.js` into a user script manager.

It hopefully doesn't need to be said, but this should definitely not be used as part of any production project.

## Usage

### `wnpm.get(string query, object opts)`

Load an NPM package into the browser. Returns a Promise which will resolve on load completion of reject if the load aborts at any point.

- `query`: The NPM package name
- `opts`: An object of options
	- `npmFilters`: An object of filters as specified by the [NPMS API](https://api-docs.npms.io/#api-Search-ExecuteSearchQuery)
		- Default: `{not: ['deprecated','insecure','unstable']}`
	- `forcePackage`: An integer corresponding to the package order returned when using `wnpm.search` with the same `query`.
	- `cdnProviders`: An order of CDN providers that should be used to retrieve files.
		- Default: `['unpkg','github']`

#### Example

```js
// Standard usage
wnpm.get('lodash');
// Grabbing an unstable package with a keyword
wnpm.get('some-new-gulp-plugin', {npmFilters: {is: ['unstable'], keywords: 'gulpplugin'}});
// The weirdest possible way of installing Vuex (as it's the 3rd NPM result when searching 'vue-js')
wnpm.get('vue-js', {forcePackage: 3})
// Force files to be retrieved from the GitHub repo for the package
wnpm.get('vuex', {cdnProviders: ['github']});
```

### `wnpm.getAll(array queries, object opts)`

Load multiple NPM packages into the browser. Returns a Promise of each call to `wnpm.get`. Rejecting in the same way as `wnpm.get`.

- `queries`: An array of  NPM package names.
- `opts`: An object of options that will be used by both package loads.
	- `npmFilters`: An object of filters as specified by the [NPMS API](https://api-docs.npms.io/#api-Search-ExecuteSearchQuery)
		- Default: `{not: ['deprecated','insecure','unstable']}`
	- `forcePackage`: An integer corresponding to the package order returned when using `wnpm.search` with the same `query`.
	- `cdnProviders`: An order of CDN providers that should be used to retrieve files.
		- Default: `['unpkg','github']`

#### Example

```js
// Standard usage
wnpm.get(['vue', 'vuex']);
```

### `wnpm.search(string query, object filters)`

Search the NPM registry. Use the order numbers returned with this method in the `forcePackage` option of `wnpm.get`. Returns a Promise which will resolve when the search has completed with the JSON response of the [NPMS API](https://api-docs.npms.io/). Rejects if the API call fails.

- `query`: The NPM package name
- `filters`: An object of filters as specified by the [NPMS API](https://api-docs.npms.io/#api-Search-ExecuteSearchQuery)
	- Default: `{}`

#### Example

```js
// Standard usage
wnpm.search('jquery');
// Find safe-to-use packages with 'vuejs' in their name
wnpm.search('vuejs', {not: ['deprecated', 'insecure', 'unstable']});
// Find vue related datepickers
wnpm.search('datepicker', {not: ['deprecated', 'insecure', 'unstable'], keywords: 'vue'});
```

### `wnpm.load(string scriptUrl)`

Promise based script loader. Appends a script tag to `document.body`. Returns a promise which resolves if the script loads successfully or rejects otherwise.

- `scriptUrl`: The URL of the script to be loaded.

#### Example

```js
// Load in Vuex from CDN then create a Vuex store
wnpm.load('https://unpkg.com/vuex').then(() => {
	// Vuex will now be available
	const store = new Vuex.Store();
});
```
