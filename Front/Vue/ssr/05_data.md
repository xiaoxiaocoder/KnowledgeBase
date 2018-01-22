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
import { sync } from 'vuex-router-sync'
export function createApp() {
  // https://ssr.vuejs.org/zh/data.html#
}
```