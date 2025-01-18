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
    clean: true
  },
  experiments: {
    topLevelAwait: true
  }
};
