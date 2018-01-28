# 构建配置
已经知道如何为纯客户端(client-only)项目配置webpack. 服务器端渲染(SSR)项目的配置大体上与客户端项目类似, 但是我们建议将配置分为三个文件: base, client和server. 基本配置(base config)包含在两个环境共享的配置. 例如, 输出路径(output path), 别名(alias)和loader. 服务器配置(server config)和客户端配置(client config), 可以通过[https://github.com/survivejs/webpack-merge](webpack-merge)来简单地扩展基本配置

## 服务器配置(Server Config)
服务器配置, 用于生成传递给createBundleRenderer的server bundle. 它应该是这样的:
```js
const merge = require('webpack-merge')
const nodeExternals = require('webpack-node-externals')
const baseConfig = require('./webpack.base.config.js')
const VueSSRServerPlugin = require('vue-server-render/server-plugin')
module.exports = merge(baseConfig, {
    // 将entry指向应用程序的server entry
    entry: '/path/to/entry-server.js',
    // 这允许webpack以Node适合方式(Node-appropriate fashion)处理动态导入(dynamic import)
    // 并且还会编译Vue组件时,
    // 告知'vue-loader'输送面向服务器代码(server-oriented code)
    target: 'node',
    // 对bundle renderer提供source map 支持
    devtool: 'source-map',
    // 此处告知server bundle使用Node风格导出模块(Node-style exports)
    output: {
        libraryTarget: 'commonjs2'
    },
    // https://webpack.js.org/configuration/externals/#function
    // https://github.com/liady/webpack-node-externals
    // 外置化应用程序依赖模块. 可以使服务器构建速度更快, 并且生成较小的bundle文件.
    externals: nodeExternals({
        // 不要外置化webpack需要处理的依赖模块.
        // 你可以在这里添加更多的文件类型. 例如, 未处理.vue原始文件
        // 你还以将修改 global(例如 polyfill)的依赖模块列出白名单
        whitelist: /\.css$/
    }),
    // 这是讲服务器整个输出, 构建为单个JSON文件的插件. 默认名称为: 'vue-ssr-server-bundle.json'
    pulgins: [
        new VueSSRServerPlugin()
    ]
})
```
在生成vue-ssr-server-bundle.json之后, 只需将文件路径传递给createBundleRenderer:
```js
const { createBundleRenderer } = require('vue-server-renderer')
const render = createBundleRenderer('/path/to/vue-ssr-server-bundle.json', {
    // ... renderer的其他选项
})
```
又或者, 你还可以将bundle作为对象传递给createBundleRenderer. 这对开发过程中的热重载很有用的. 具体查看HackerNews demo的[https://github.com/vuejs/vue-hackernews-2.0/blob/master/build/setup-dev-server.js](参考设置)

### 扩展说明(Externals Caveats)
请注意, 在externals选项中, 我们将css文件列入白名单. 这是因为从依赖模块导入的css还应该由webpack处理. 如果导入依赖于webpac的任何其他类型的文件(例如*.vue, *.sass), 那么你也应该将他们添加到白名单中. 
如果你使用runInNewContext: 'once' 或 runInNewContext: true, 那么你还应该修改global的polyfill列入白名单, 例如babel-polyfill. 这是因为当使用新的上下文模式时, **server bundle中的代码具有自己的global对象.** 由于在使用Node 7.6+时, 在服务器并不真正需要它, 所以实际上只需在客户端entry导入它.

## 客户端配置(Client Config)
客户端配置(client config)和基本配置(base config)大体上相同. 显然你需要把entry指向你的客户端入口文件. 除此之外, 如果你使用CommonsChunkPlugin, 请确保仅在客户端配置(client config)中使用, 因为服务器包需要单独的入口chunk.

### 生成clientManifest
> 需要版本2.3.0+
除了server bundle之外, 我们还可以生成客户端构建清单(client build manifest). 使用客户端清单(client manifest)和服务器bundle(server bundle), renderer现在具有了服务器和客户端的构建信息, 因此它可以自动推断和注入**资源预加载/数据预取指令(preload/prefetch directive)**, 以及css链接/script标签到所渲染的HTML.

好处是双重的:
1. 在生成的文件名中有哈希时, 可以取代html-webpack-plugin来注入正确的资源URL.
2. 在通过webpack的按需代码分割特性渲染bundle时,我们可以确保对chunk进行资源预加载/数据预取, 并且还可以将所需的异步chunk只能地注入为script标签, 以避免客户端的瀑布式请求(waterfall request), 以及改善可交互时间(TTI- time-to-interactive)
要使用客户端清单(client manifest), 客户端配置(client config)将如下所示:
```js
const webpack = require('webpack')
const merge = require('webpack-merge')
const baseConfig = require('./webpack.base.config')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')
module.exports = merge(baseConfig, {
    entry: 'path/to/entry-client.js',
    plugins: [
        // 重要信息: 这将webpack运行时分离到一个引导chunk中
        // 以便可以再之后正确注入异步chunk
        // 这也为你的 应用程序/vendor 代码提供了根号的缓存.
        new webpack.optimze.CommonsChunkPlugin({
            name: 'manifest',
            minChunks: Infinity
        }),
        // 此插件在输出目录中
        // 生成 'vue-ssr-client-mainfest.json'
        new VueSSRClientPlugin()
    ]
})
```
然后, 就可以使用生成的客户端清单(client manifest)以及页面模板:
```js
const {createBundleRenderer} = require('vue-server-renderer')
const template = require('fs').readFileSync('/path/to/template.html', 'utf-8')
const serverBundle = require('/path/to/vue-ssr-server-bundle.json')
const clientManifest = require('/path/to/vue-ssr-client-manifest.json')
const renderer = createBundleRenderer(serverBundle, {
    template,
    clientManifest
})
```
通过以上设置, 使用代码分割特性构建后的服务器渲染的HTML代码, 将如下(所有的都是自动注入)
```html
<html>
    <head>
    <!--用于当前渲染的chunk会被资源预加载(preload)-->
    <link rel="preload" href="/manifest.js" as="script">
    <link rel="preload" href="/main.js" as="script">
    <link rel="preload" href="/0.js" as="script">
    <!--未用到的异步 chunk会被数据预取(preload)(次要优先级)-->
    <link rel="prefetch" href="/1.js" as="script">
    </head>
    <body>
        <!-- 应用程序内容 -->
        <div data-server-rendered="true"><div>async</div></div>
        <!-- manifest chunk 有限 -->
        <script src="/manifest.js"></script>
        <!-- 在主chunk之前注入异步chunk   -->
        <script src="/0.js"></script>
        <script src="/main.js"></script>
    </body>
</html>
```
### 手动资源注入(Manual Asset Injection)
默认情况下, 当提供template渲染选项时, 资源注入是自动执行的. 但是有时, 你可能需要对资源注入的模板进行更细粒度(finer-grained)的控制, 或者你根部不使用模板. 这种情况下, 你可以在创建renderer并手动执行资源注入时, 传入inject: false.
在renderToString回调函数中, 你传入的context对象会暴露以下方法:
-   context.renderStyles()
这将返回内联&lt;style&gt;标签包含所关键CSS(critical css), 其中关键CSS是在要用到的*.vue组件的渲染过程中收集的. 有关更多详细信息, 请查看CSS管理.

如果提供了clientManifest, 返回的字符串中, 也将包含着`<link rel="stylesheet">`标签内由webpack输出(webpack-emitted)的css文件(例如, 使用extract-text-webpack-plugin提取的css, 或使用file-loader导入的css)
-   context.readerState(options?: Object)
此方法序列化context.state并返回一个内联的script, 其中状态被嵌入在window.__INITIAL_STATE__中.
上下文状态键(context state key)和window状态键(window state key),都可以通过传递选项对象进行自定义:
```js
context.renderState({
    contextKey: 'myCustomSate',
    windowKey: '__MY_STATE__'
})
// -> <script>window.__MY_STATE__ ={...} </script>
```
-   context.renderScripts()
    -   需要clientManifest
    此方法返回引导客户端应用程序所需的`<script>`标签. 当在应用程序代码中使用异步代码分割(async code-spliting)时, 此方法将智能地正确的推断需要引入的那些异步chunk.
    -   context.renderResourceHints()
        -   需要clientManifest
        此方法返当前要渲染的页面, 所需的`<link rel="preload/prefetch">`资源提示(resource hint). 默认情况下会:
            1. 预加载页面所需的Javascript和CSS文件
            2. 预取异步Javascript chunk, 之后可能会用于渲染
            使用**shouldPreload**选项可以进一步自定义要预加载的文件.
    -   context.getPreloadFiles()
        -   需要clientManifest
        此方法返回一个数组, 此数组是要预加载的资源文件对象所组成. 可以用在以编程方式(programmatically)执行HTTP/2服务器推送(HTTP/2 server push)
由于传递给createBundleRenderer的template将会使用context对象进行插值, 你可以(通过传入inject:false)在模板中使用这些方法:
```html
<html>
    <head>
    <!-- 使用三花括号(triple-mustache)进行HTML不转移插值(non-HTML-escaped interpolation) -->
    {{{ renderResourceHints() }}}
    {{{ renderStyles() }}}
    </head>
    <body>
     <!-- vue-ssr-outlet -->
     {{{ renderState() }}}
     {{{ renderScripts() }}}
     </body>
</html>
```
如果你根本没有使用template, 你可以自己拼接字符串.