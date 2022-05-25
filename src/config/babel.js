// N.B. `module.exports` must be used in this file because it configures Babel,
// which lets us use `export default` in all other files.
module.exports = {
  presets: [
    [require.resolve('@babel/preset-env'), {
      targets: {node: '12'}
    }],
    require.resolve('@babel/preset-typescript'),
    require.resolve('@babel/preset-react')
  ],
  plugins: [
    [require.resolve('@babel/plugin-proposal-decorators'), {legacy: true}],
    require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
    require.resolve('@babel/plugin-proposal-optional-chaining'),
    require.resolve('@babel/plugin-proposal-class-properties'),
    require.resolve('babel-plugin-add-module-exports'),
    [require.resolve('babel-plugin-module-resolver'), {
      cwd: 'packagejson',
      root: ['./src'],
      extensions: [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.json'
      ]
    }]
  ],
  // N.B. This is set to `false` to prevent Babel from stripping-out Webpack
  // 'magic' comments before Webpack can parse them.
  comments: false
};
