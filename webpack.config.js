const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const HtmlWebPackPLugin = require('html-webpack-plugin');

let htmlPageNames = ['index'];
let multipleHtmlPlugins = htmlPageNames.map(name => {
  return new HtmlWebPackPLugin({
    template: `./src/html/${name}.html`,
    filename: `${name}.html`,
    excludeChunks: ["server", "main"]
  })
});

module.exports = {
    entry: {
        main: './src/index.js',
    },
    output: {
        path: path.join(__dirname, 'dist'),
        publicPath: '/',
        filename: '[name].js'
    },
    target: 'web',
    devtool: 'source-map',
    mode: 'production',
    optimization: {
        minimize: true
    },
    module: {
        rules: [
            {
                // We need Babel back for the server build to succeed
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            },
            {
                test: /\.html$/,
                use: [ { loader: "html-loader", options: {minimize: true} } ]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ]
    },
    plugins: [
        new HtmlWebPackPLugin({
            template: './src/html/map.html',
            filename: './map.html',
            excludeChunks: ['server']
        })
    ].concat(multipleHtmlPlugins)
}