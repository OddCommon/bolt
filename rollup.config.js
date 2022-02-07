import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'lib/index.js',
	output: [
		{
			name: "BoltRouter",
			file: 'build/bolt.js',
			format: 'iife',
			sourcemap: true
		},
		{
			name: "BoltRouter",
			file: 'build/bolt.module.js',
			format: 'cjs', 
			sourcemap: true,
			exports: 'default'
		}
	],
	plugins: [
		resolve(),
		commonjs(),
		production && terser()
	]
};
