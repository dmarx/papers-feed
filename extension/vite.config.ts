import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    
    // Configure output for extension
    rollupOptions: {
      input: {
        background: 'background.js',
        content: 'content.js',
        popup: 'popup.js'
      },
      output: {
        entryFileNames: '[name].bundle.js',
        format: 'es'
      }
    },
    
    // Don't minify for better debugging
    minify: false,
    
    // Put built files in extension root
    outDir: '.',
    emptyOutDir: false
  }
});
