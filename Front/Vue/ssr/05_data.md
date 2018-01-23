# 数据预取和状态

## 数据预取存储器（Data Store）
在服务器端渲染（SSR）期间， 我们本质上时渲染我们应用程序的“快照”， 所以如果应用程序依赖于一些异步数据， **那么在开始渲染过程之前，需要线预取和解析好这些数据**
另一个需要关注的问题时在客户端， 在挂载（mount）到客户端应用程序之前， 需要获取到与服务器端应用程序完全相同的数据 - 否则，客户端应用程序会因为使用与服务器端应用程序不同的状态， 然后导致混合失败。
为了解决这个问题，获取的数据需要位于视图组件之外， 即放置在专门的数据预取存储容器(data store)或"状态容器(state container)"中. 首先,在服务器端, 我们可以在渲染之前预取数据,并将数据填充到store中. 此外, 我们将在HTML中序列化(serialize)和内置预置(inline)状态. 这样, 在挂载(mount)到客户端应用程序之前, 可以直接从store获取到内置预置(inline)状态.
为此, 我们将使用官方状态管理库Vuex. 先创建一个store.js文件, 里面会模拟一些根据id获取item的逻辑:
```js
// store.js
import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)
// 假设有一个可以返回Promise的通用API(暂时忽略API具体实现细节)
import { fetchItem } from './api'
export function createStore () {
  return new Vuex.store({
    state: {
      item: {}
    },
    actions: {
      fetchItem ({commit}, id) {
        // store.dispatch() 会返回Promise, 以便我们能给个知道数据在何时更新
        return fetchItem(id).then(item => {
          commit('setItem', {id, item})
        })
      }
    },
    mutations: {
      setItem (state, {id, item}) {
        Vue.set(state.items, id, item)
      }
    }
  })
}
```
然后修改app.js
```js
// app.js
import Vue from 'vue'
import App from './App.vue'
import { createRouter } from './router'
import { createStore } from './store'
import { sync } from 'vuex-router-sync'
export function createApp() {
  // 创建router 和 store实例
  const router = createRouter()
  const store = createStore()
  // 同步路由状态(route state)到store
  sync(store, router)
  const app = new Vue({
    router,
    store,
    render: h => h(App)
  })
  // 暴露app, router 和 store
  return { app, router, store }
}
```

## 带有逻辑配置的组件(Logic Collocation with Components)
**在哪里放置"dispatch 数据预取action"的代码**
我们需要通过访问路由, 来决定获取哪部分数据 - 这也决定了哪些组件需要渲染. 事实上, 给定路由所需的数据, 也是在该路由上渲染组件时所需的数据. 所以在路由中放置数据预取逻辑, 是很自然的事情.
我们将在路由组件上暴露出一个自定义静态函数asyncData. 注意, **由于此函数会在组件实例化前调用, 所以它无法访问this. 需要将store和路由信息作为参数传递进去:**
```html
<!-- Item.vue -->
<template>
  <div> {{ item.title }}  </div>
</template>
<script>
export default {
  asyncData ({store, route}) {
    // 触发action后, 会返回Promise
    return store.dispatch('fetchItem', route.params.id)
  },
  computed: {
    // 从Store的state对象中获取item
    item () {
      return this.$store.state.items[this.$route.params.id]
    }
  }
}
</script>
```

## 服务器端数据预取(Server Data Fetching)
在entry-server.js中, 我们可以通过路由获得与router.getMatchedComponents() 相匹配的组件, 如果组件暴露出asyncData, 我们就调用这个方法. 然后我们需要将解析完成的状态, 附加到渲染上下文(render context)中.
```js
// entry-server.js
import { createApp } from './app'
export default context => {
  return new Promise((resolve, reject) => {
    const { app, router, store } = createApp()
    router.push(context.url)
    router.onReady(() => {
      const matchedComponents = router.getMatchedComponents()
      if(!matchedComponents.length){
        return reject({code: 404})
      }
      // 对所有匹配的路由组件调用 asyncData()
      Promise.all(matchedComponents.map(Component => {
        if(Component.asyncData) {
          return Component.asyncData({
            store,
            route: router.currentRoute
          })
        }
      })).then(() => {
        // 在所有预取钩子(preFetch hook) resolve后,
        // 我们的sore现在已经填充如渲染程序所需的状态.
        // 当我们将状态附加到上下文
        // 并且template 选项用于 renderer时,
        // 状态将自动序列化为 window.__INITIAL_STATE__,并且注入到HTML
        context.state = store.state
        resolve(app)
      }).catch(reject)
    }, reject)
  })
}
```
当使用template时, context.state将作为window.__INITIAL_STATE__状态, 自动嵌入到最终的HTML中. 而在客户端, 在挂载到应用程序之前, store就应该获取到状态:
```js
// entry-client.js
const { app, router, store } = createApp()
if(windwo.__INITIAL_STATE__){
  store.replaceState(winodw.__INITIAL_STATE__)
}
```