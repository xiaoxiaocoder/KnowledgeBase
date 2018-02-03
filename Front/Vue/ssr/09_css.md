# CSS管理
管理CSS的推荐方法是简单地使用*.vue 单个文组件内的`<style>`, 它提供：
-   与HTML并列同级， 组件作用域CSS
-   能够使用预处理器（pre-processor）或PostCSS
-   开发过程中热重载（hot-reload）
更重要的是， vue-style-loader（vue-loader内部使用的loader）， 具备一些服务器端渲染的特殊功能：
-   客户端和服务器端的通用编程体验
-   在使用bundleRenderer时， 自动注入关键CSS（critical CSS）
    
    在客户端渲染期间使用， 可以在HTML中手机和内联（使用template选项时自动处理）组件的CSS。 在客户端， 当第一次使用该组件时， vue-style-loader会检查这个组件是否已经具有服务器内联（server-inlined）的CSS- 如果没有， CSS将通过`<style>`标签动态注入。
-   通用CSS提取

    此设置支持使用*extract-text-webpack-plugin*将主chunk(main chunk)中的CSS提取到单独的CSS文件中(使用template自动注入), 这样可以将文件分开缓存. 建议用于存在很多公用CSS时.

    内部异步组件中的CSS奖内联为JavaScript字符串, 并由vue-style-loader处理.

## 启用CSS提取
要从*.vue文件中提取CSS, 可以使用vue-loader的extractCSS选项(需要vue-loader 12.0.0+)
```js
// webpack.config.js
const ExtractTextPlugin = require('extract-text-webpack-plugin')
// CSS 提取应该只用于生产环境
// 这样我们在开发过程中仍然可以热重载
const isProduction = process.env.NODE_ENV === 'production'
module.exports = {
    //...
	module: {
		rules: [
					{
							test: /\.vue$/,
							loader: 'vue-loader',
							options: {
									// enable CSS extraction
									extractCSS: isProduction
							}
					},
					// ...
			]
		},
	plugins: isProduction 
	// make sure to add the plugin!
	? [new ExtractTextPlugin({filename: 'common.[chunkhash].css'})]
	: []
}
```

请注意, 上述配置仅适用于*.vue文件中的样式, 然而你也可以使用`<style src="./foo.css">`将外部CSS导入Vue组件.

如果你想从Javascript 中导入CSS, 例如 import 'foo.css', 需要配合合适的loader:
```js
module.exports = {
	// ...
	module: {
		rules: [
			{
				text: /\.css$/,
				// 重要: 使用vue-style-loader 替代style-loader
				use: isProduction
				? ExtractTextPlugin.extract({
					use: 'css-loader',
					fallback: 'vue-style-loader'
				})
				: ['vue-style-loader', 'css-loader']
			}
		]
	}
}
```

## 从依赖模块中导入样式
从NPM依赖模块中导入CSS时需要注意的几点:
1. 在服务端构建过程中, 不应该外置化提取.
2. 如果使用CSS提取+ 使用 CommonsChunkPlugin 插件提取vendor, 在extract-text-webpack-plugin提取CSS到vender chunk时将遇到问题. 为了应对这个问题, 请避免在vendor chunk中包含CSS文件. 客户端webpack配置示例如下:
```js
module.exports = {
	// ...
	plugins: [
		// 将依赖模块提取到vendor chunk 以获得更好的缓存, 是很常见的做法
		new webpack.optimize.CommonsChunkPlugin({
			name: 'vendor',
			minChunks: function(module) {
				// 一个模块被提取到vendor chunk时...
				return (
					// 如果它在node_modules中
					/node_modules/.test(module.context) && 
					// 如果request是一个CSS文件, 则无需外置化提取
					!/\.css$/.test(module.request)
				)
			}
		}),
		// 提取webpack运行时和manifiest
		new webpack.optimize.CommonsChunkPlugin({
			name: 'manifest'
		}),
		// ...
	]
}
```