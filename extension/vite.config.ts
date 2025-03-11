import { defineConfig } from 'vite';
import { resolve } from 'path';
import { compileExtractors } from './build-scripts/compile-extractors';

export default defineConfig({
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    
    // Configure output for extension
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background/index.ts'),
        content: resolve(__dirname, 'content/index.ts'),
        popup: resolve(__dirname, 'popup.js'),
        options: resolve(__dirname, 'options.js')
      },
      output: {
        dir: resolve(__dirname, 'dist'),
        entryFileNames: '[name].bundle.js',
        format: 'es',
        // Ensure all files go in dist directory
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    
    // Don't minify for better debugging
    minify: false,
    
    // Put built files in dist directory
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,

    // Ensure we're building for browser environment
    target: 'esnext',
    modulePreload: false
  },
  
  resolve: {
    // Help Vite find modules
    mainFields: ['module', 'main'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.css']
  },

  // Define the environment to avoid window references in service worker
  define: {
    'window': 'self',
  },

  css: {
    // Extract CSS into separate files
    modules: {
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    }
  },

  // Handle build options for dependencies
  optimizeDeps: {
    include: ['gh-store-client'],
    // Exclude problematic dependencies that might reference window
    exclude: []
  },
  
  // Custom plugins
  plugins: [
    // Add a custom plugin to run the extractor compiler
    {
      name: 'compile-extractors',
      buildStart: async () => {
        console.log('Compiling paper extractors...');
        try {
          const count = await compileExtractors();
          console.log(`Successfully compiled ${count} extractors`);
        } catch (error) {
          console.error('Failed to compile extractors:', error);
          throw error; // Fail the build if extractor compilation fails
        }
      }
    }
  ]
});
