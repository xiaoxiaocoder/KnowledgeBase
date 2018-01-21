# 路由和代码分割

## 使用vue-router的路由
可能已经注意到, 我们的服务器代码使用了一个*处理程序, 它接受任意URL. 这允许我们将访问的URL传递到我们的Vue应用程序中, 然后对客户端和服务器复用相同的路由配置!
为此, 建议使用官方提供的vue-router, 首先创建一个文件, 在其中创建router. 注意, 类似于createApp, 我们也需要给每个请求一个新的router实例, 所以文件导出一个createRouter函数:
```js
// router.js
import Vue from 'vue'
import Router from 'vue-router'
Vue.use(Router)
export function createRouter () {
    return new Router({
        mode: 'history',
        routes: [
            // ...
        ]
    })
}
```
然后更新app.js
```js
// app.js
import Vue from 'vue'
import App from './App.vue'
import { createRouter } from './router'
export function createApp () {
    // 创建router实例
    const router = createRouter()
    const app = new Vue({
        // 注入router实例到根Vue实例
        router,
        render: h => h(App)
    })
    // 返回App 和 router
    return { app, router }
}
```
现在我们需要在entry-server.js中实现服务器端路由逻辑(server-side routing logic)
```js
// entry-server.js
import { createApp } from './app'
export default context => {
    // 因为有可能会是异步路由钩子函数或组件, 所以我们将返回一个Promise
    // 以便服务器能够等待所有的内容在渲染前
    // 就已经准备就绪
    return new Promsie((resolve, reject) => {
        const { app, router } = createApp()
        // 设置服务器端router的位置
        router.push(context.url)
        // 等到router将可能的异步组件和钩子函数解析完
        router.onReady(()=>{
            const matchedComponents = router.getMatchedComponents()
            // 匹配不到的路由, 执行reject函数,并返回404
            if(!matchedComponents.length) {
                return reject({code: 404})
            }
            // Promise 应该resolve 应用程序实例, 以便它可以渲染
            resolve(app)
        }, reject)
    })
}
```
假设服务器bundle已经完成构建(请再次忽略现在的构架设置), 服务器用法看起来如下:
```js
// server.js
const createApp = require('/path/to/built-server-bundle.js')
server.get('*', (req, res) => {
    const context = {url: req.url}
    createApp(context).then(app => {
        renderer.renderToString(app, (err, html) => {
            if (err) {
                if(err.code === 404){
                    res.status(404).end('page not found')
                } else {
                    res.status(500).end('Internal Server Error')
                } 
            } else {
                res.end(html)
            }
        })
    })
})
```

## 代码分割
应用程序的代码分割或惰性加载, 有助于减少浏览器在初始渲染中下载的资源体积, 可以极大地改善体积bundle的可交互时间(TTI-time-to-ineractive). 这里的关键在于. **对初始首屏而言, "只加载所需"**
Vue提供异步组件作为第一类的概念, 将其与**Webpack 2所支持的使用动态导入作为代码分割点**相结合, 你需要做的是:
```js
// 这里进行修改...
import Foo from './Foo.vue'
// 改为这样
const Foo = () => import('./Foo.vue')
```
在Vue 2.5以下的版本中, 服务端渲染时异步组件只能用在路由组件上. 然而在2.5+的版本中, 得益于核心算法升级, 异步组件现在可以在应用中的任何地方使用.
