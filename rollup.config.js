import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: false, // Disable source maps to prevent Nuxt from accessing source files
      exports: 'named'
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: false // Disable source maps to prevent Nuxt from accessing source files
    },
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'WebAudioRecorder',
      sourcemap: false // Disable source maps to prevent Nuxt from accessing source files
    }
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
      rootDir: './src',
      sourceMap: false, // Disable source maps to prevent Nuxt from accessing source files
      declarationMap: false // Disable declaration maps
    }),
    copy({
      targets: [
        { src: 'lib/*.js', dest: 'dist/lib', flatten: false },
        { src: 'lib/*.mem', dest: 'dist/lib', flatten: false }
      ]
    })
  ],
  external: []
};
