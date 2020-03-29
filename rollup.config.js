import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';

export default {
	input: 'wnpm.js',
	output: {
		file: 'wnpm.min.js',
		format: 'iife'
	},
	plugins: [resolve({ preferBuiltins: true }), commonjs(), json(), terser()]
};
