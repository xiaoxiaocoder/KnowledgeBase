# 源码结构

## 避免状态单例
当编写纯客户端（client-only）代码时，我们习惯于每次在新的上下文中对代码进行取值。 但是， Node.js服务器是一个长期运行的进程。 当我们的代码进入该进程时， 它将进行一次取值并留存在内存中。 这意味着如果创建一个单例对象， 它将在每个传入的请求之间共享。
如基本示例所示， 我们**为每个请求创建一个新的根Vue实例。** 这与每个用户在自己的浏览器中使用新应用程序的实例类似。 如果我们在多个请求之间使用一个共享的实例， 很容易导致交叉请求状态污染（cross-rquest state pollution）。
因此， 我们不应该直接创建一个应用程序实例， 而是应该暴露一个可以重复执行的工厂函数， 为每个请求创建新的应用程序实例：
```js
// app.js
const Vue = require('vue')
module.exports = function createApp(context) {
    return new Vue({
        data: {
            url: context.url
        },
        template: `<div>fang wen de  URL shi: {{url}} </div>`
    })
}

// 服务端的代码变为：
// server.js
const createApp = require('./app')
server.get('*', (req, res) => {
    const context = {url: req.url}
    const app = createApp(context)
    renderer.renderToString(app, (err, html) => {
        // handle err
        res.end(html)
    })
})
```
同样的规则也适用于router， store和event bus实例。 你不应该直接从模块到处并将其倒入到应用程序中， 而是需要在createApp中创建一个新的实例， 并从根Vue实例注入。
> 在使用带有{runInNewContext: true} 的bundle renderer时， 可以消除此约束， 但是由于需要为每个请求创建一个新的vm上下文， 因此伴随有一些显著性能开销。

## 介绍构建步骤
到目前为止， 我们还没有讨论过如何将相同的Vue应用程序提供给客户端。 为了做到这一点， 我们需要使用webpack来打包我们的Vue应用程序。 事实上， 我们可能需要在服务器上使用webpack打包Vue应用程序， 因为：
-   通常Vue应用程序是由webpack和vue-loader构建， 并且许多webpack特定功能不能直接在Node.js中运行（例如通过file-loader导入文件，通过css-loader导人css）
-   尽管Node.js最新版本能够完全支持ES2015特性， 我们还是需要转译客户端代码以适应老版本浏览器。 这也会涉及到构建步骤。
所以基本看法是， 对于客户端应用程序和服务器应用程序， 我们都要使用webpack打包 - 服务器需要“服务器bundle”然后用于服务器端渲染（SSR），而“客户端bundle”会发送给浏览器， 用于混合静态标记。
![build progress](./imgs/01.png)
我们将在后面的章节讨论规划结构的细节， 现在， 先假设我们已经将构建过程的规划都弄清楚了， 我们可以在启用webpack的情况下编写我们的Vue应用程序代码。

## 使用webpack的源码结构
现在我们正在使用webpack来处理服务器和客户端的应用程序， 大部分源码可以使用通用方式编写, 可以使用webpack支持的所有功能. 同事, 在编写通用代码时, 有一些**事项**要牢记在心.
一个基本项目结构像是这样:
```shell
src
|--- components
|   |--- Foo.vue
|   |--- Bar.vue
|   |--- Baz.vue
|--- App.vue
|--- app.js # universal entry
|--- entry-cliet.js #only execution in browser
|--- entry-server.js # only execution in server
```

### app.js
app.js 是我们应用程序的"通用entry". 在纯客户端应用程序中, 我们将在此文件中创建根Vue实例, 并直接挂载到DOM. 但是, 对于服务端渲染(SSR), 责任转移到纯客户端entry文件. app.js 简单地使用export导出一个createApp函数:
```js
import Vue from 'vue'
import App from './App.vue'
// 导出一个工厂函数, 用于创建新的应用程序, router和store实例
export function createApp () {
    const app = new Vue({
        // 根实例简单的渲染应用程序组件.
        render: h=> h(App)
    })
    return {app}
}
```

### entry-client.js
客户端entry只需创建应用程序, 并且将其挂载到DOM中:
```js
import { cretaApp } from './app'
// 客户端特定引导逻辑...
// 假设App.vue模板中根元素具有 "id='app'"
app.$mount('#app') 
```

### entry-server.js
服务器entry使用default export导出函数,并在每次渲染中重复调用此函数. 此时, 除了创建和返回应用程序实例之外, 它不会做太多事情 - 但是稍后我们将在此执行服务器端路由匹配(server-side route matching)和数据预取逻辑(data pre-fetching logic)
```js
import { createApp } from './app'
export default context => {
    const { app } = createApp()
    return app
}
```