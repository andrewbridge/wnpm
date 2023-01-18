const test = require("ava");
const jsdom = require("jsdom");
const fetchImport = import("node-fetch");
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html><head></head><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
const fetchPolyfill = (...args) => fetchImport.then(({ default: fetch }) => fetch(...args));
global.window.fetch = fetchPolyfill;
global.fetch = fetchPolyfill;
// globalThis.fetch = fetchPolyfill;

require('./wnpm.min.js');

test("attaches to browser's window object on load", t => {
    t.true('wnpm' in global.window);
    t.true(typeof global.window.wnpm === 'function');
});

const { wnpm } = global.window;

test("can retrieve a package via NPM name", async t => {
    const getCall = wnpm.get('vue');
    const dummyLoadEvent = new dom.window.Event('load');
    while(dom.window.document.body.querySelector('script') === null) await new Promise(resolve => setTimeout(resolve, 250));
    const loadedScript = dom.window.document.body.querySelector('script');
    loadedScript.dispatchEvent(dummyLoadEvent);
    const { name, version } = await getCall;
    t.is(name, 'vue');
    t.is(loadedScript.src, `https://unpkg.com/vue@${version}/dist/vue.global.js`);
});

test("can return search results from the NPM registry", async t => {
    const json = await wnpm.search('vue');
    t.true(typeof json === 'object');
    t.true(json !== null);
    t.true(json.total > 0);
    t.true(Array.isArray(json.objects));
    t.is(json.objects[0].package.name, 'vue');
});