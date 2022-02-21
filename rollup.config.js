import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import gzipPlugin from 'rollup-plugin-gzip';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;
const terserOptions = {
  mangle: {
    properties: {
      regex: /^_/,
    },
  },
};

export default {
  input: 'lib/index.js',
  output: [
    {
      name: 'BoltRouter',
      file: 'build/index.js',
      format: 'es',
      sourcemap: false,
      exports: 'default',
    },
  ],
  plugins: [resolve(), commonjs(), production && terser(terserOptions), production && gzipPlugin()],
};
