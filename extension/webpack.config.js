// extension/webpack.config.js
export default {
  entry: {
    background: './background.js',
    content: './content.js',
    options: './options.js',
    popup: './popup.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: process.cwd(), // Output to extension root
    clean: false // Don't clean extension root directory
  },
  experiments: {
    topLevelAwait: true
  }
};
