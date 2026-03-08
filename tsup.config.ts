import {defineConfig} from 'tsup';

export default defineConfig({
    entry: [
      'src/index.ts',
      'src/jsx-dev-runtime.ts',
      'src/jsx-runtime.ts',
    ],
    outDir: 'dist',
    format: ['esm','cjs'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime'],
    tsconfig: 'tsconfig.json',    
})