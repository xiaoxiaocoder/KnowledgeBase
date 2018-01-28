# Bundle Renderer指引

## 使用基本SSR的问题
到目前为止, 我们假设打包的服务器端代码, 将由服务器通过require直接使用.
```js
const createApp = require('/path/to/built-server-bundle.js')
```
这是理所应当的, 然而在每次编辑过应用程序源代码之后, 都必须停止并重启服务. 这在开发过程中会影响开发效率. 此外, Node.js本身并支持Source map.

## 传入BundleRenderer
vue-server-renderer提供一个名为createBundleRenderer的API, 用于处理此问题, 通过使用webpack的自定义插件, server bundle将生成可传递到bundle renderer的特殊JSON文件. 所创建的bundle renderer, 用法和普通renderer 相同, 但是bundle renderer提供一下优点:
-   内置的source map支持.(在webpack配置中使用devtool: 'source-map')
-   在开发环境甚至部署过程中热重载(通过读取更新后的bundle, 然后重新创建renderer实例)
-   关键CSS(critical CSS)注入(在使用*.vue文件时): 自动内联在渲染过程中用到的组件所需的CSS.更多细节参见[https://ssr.vuejs.org/zh/css.html](CSS)章节
-   使用[https://ssr.vuejs.org/zh/api.html#clientmanifest](clientManifest)进行资源注入: 自动推断出最佳的预加载(preload)和预取(prefetch)指令, 以及初始渲染所需的代码分割chunk.

---
下一章节, 我们将讨论如何配置webpack, 以生成bundle renderer所需的构建工件(build artifact), 但现在假设我们已经有了这些需要的构建工件, 以下就是创建和使用bundle rederer的方法:
```js
const { createBundleRenderer } = require('vue-server-renderer')
const renderer = createBundleRenderer(serverBundle, {
    runInNewContext: false, // 推荐
    template, // (可选)页面模板
    clientManifest // (可选)客户端构建manifest
})

// 在服务器处理函数中...
server.get('*', (req, res) => {
    const context = { url: req.url }
    // 这里无需传入一个应用程序, 因为在执行不能打;e时已经自动创建过.
    // 现在我们的服务器与应用程序已经解耦!
    renderer.renderToString(context, (err, html) => {
        // 处理异常...
        res.end(html)
    })
})
```
bundle renderer在调用renderToString时, 它将自动执行"由bundle创建的应用程序实例"所导出的函数(传入上下文作为参数), 然后渲染它.
**注意, 推荐将runInNewContext选项设置为false或'once', 更多细节参见[https://ssr.vuejs.org/zh/api.html#runinnewcontext](API参考)**
