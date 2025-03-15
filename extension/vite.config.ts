// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    
    // Configure output for extension
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background.ts'),
        content: resolve(__dirname, 'content.ts'),
        popup: resolve(__dirname, 'popup.js'),
        options: resolve(__dirname, 'options.js')
      },
      output: {
        dir: resolve(__dirname, 'dist'),
        entryFileNames: '[name].bundle.js',
        format: 'es',
        // Ensure all files go in dist directory
        assetFileNames: 'assets/[name]-[hash].[ext]'
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
    // Help Vite find gh-store-client
    mainFields: ['module', 'main'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },

  // Handle Node.js built-in modules
  optimizeDeps: {
    include: ['gh-store-client']
  }
});
