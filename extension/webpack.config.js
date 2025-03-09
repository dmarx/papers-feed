const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  
  entry: {
    // Background service worker
    background: './background/index.ts',
    
    // Content scripts
    content: './content/index.ts',
    
    // Popup and options pages
    popup: './popup/index.ts',
    options: './options/index.ts'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    clean: true
  },
  
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    fallback: {
      // Webpack 5 no longer includes polyfills for node.js core modules
      // This disables the polyfilling attempt to avoid errors
      path: false,
      fs: false,
      crypto: false
    }
  },
  
  module: {
    rules: [
      // TypeScript files
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      },
      
      // CSS files
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      }
    ]
  },
  
  plugins: [
    // Extract CSS to separate files
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    
    // Copy static files to dist
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: '' },
        { from: 'popup.html', to: '' },
        { from: 'options.html', to: '' },
        { from: 'assets', to: 'assets', noErrorOnMissing: true }
      ]
    })
  ]
};
