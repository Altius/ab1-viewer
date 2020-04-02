const path = require('path');
const packageJson = require("./package.json");
// const MiniCssExtractPlugin = require("mini-css-extract-plugin")

module.exports = {
    mode: 'production',
    entry: './src/Ab1ViewerComponent.js',
    output: {
        path: path.resolve('lib'),
        filename: 'Ab1ViewerComponent.js',
        libraryTarget: 'commonjs2'
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /(node_modules)/,
                use: 'babel-loader'
            },
            // {
            //     test: /\.css$/i,
            //     use: [
            //         MiniCssExtractPlugin.loader,
            //         'css-loader'
            //     ]
            // }
        ]
    },
    externals: Array.from(Object.keys(packageJson.peerDependencies)),
    // plugins: [
    //     new MiniCssExtractPlugin()
    // ]
}