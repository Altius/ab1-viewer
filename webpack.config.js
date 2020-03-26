var path = require('path');

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
            }
        ]
    }
}