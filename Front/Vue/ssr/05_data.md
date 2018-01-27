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

## 客户端数据预取(Client Data Fetching)
在客户端, 处理数据预取有两种不同的方式:
1. 在路由导航之前解析数据:
使用此策略, 应用程序会等待视图所需数据全部解析之后, 在传入数据并处理当前视图. 好处在于, 可以直接在数据准备就绪时, 传入视图渲染完整内容, 但是如果数据预取需要很长时间, 用户在当前视图会感受到**"明显卡顿"** 因此, 如果想使用此策略, 建议提供一个数据加载指示器(data loading indicator).
**我们可以通过检查匹配的组件, 并在全局路由钩子函数中执行asyncData函数, 来在客户端实现此策略** 注意, 在初始路由准备就绪之后, 我们应该注册此钩子, 这样我们就不必再次获取服务器提取的数据.
```js
// entry-client.js
// ... 忽略无关代码
router.onReady(() => {
  // 添加路由钩子函数, 用于处理asyncData
  // 在初始路由resolve后执行
  // 以便我们不会二次预取(double-fetch)已有的数据.
  // 使用`router.beforeResolve()`, 以便确保所有异步组件都resolve.
  router.beforeResolve((to, from, next) => {
    const matched = router.getMatchedComponents(to)
    const prevMatched = router.getMatchedComponents(from)
    // 我们只关心之前没有渲染的组件
    // 所以我们对比它们, 找出两个匹配列表的差异组件
    let diffed = false
    const activated = matched.filter((c, i) => {
      return diffed || (diffed = (prevMatched[i] ==c))
    })
    if(!activated.length) {
      return next()
    }
    // 这里如果有加载指示器(loading indicator), 就触发
    Promise.all(activated.map(c => {
      if(c.asyncData) {
        return c.asyncData({store, router: to})
      }
    })).then(() => {
      // 停止加载器(loading indicator)
      next()
    }).catch(next)
  })
  app.$mount('#app')
})
```
1. 匹配要渲染的视图后, 再获取数据:
此策略将客户端数据预取逻辑, 放在视图组件的beforeMount函数中. 当路由导航被触发时, 可以立即切换视图, 因此应用程序具有更快的响应速度. 然而, 传入视图在渲染时不会有完整的可用数据. 因此, 对于使用策略的每个视图组件, 都需要具有条件加载状态.
这可以通过纯客户端(client-only)的全局mixin来实现:
```js
Vue.mixin({
  beforeMount () {
    const { asyncData } = this.$options
    if (syancData) {
      // 将获取数据操作分配给 promise
      // 以便在组件中, 我们可以在数据准备就绪后
      // 通过运行, this.dataPromise.then(...)来执行其他任务
      this.dataPromise = asyncData({
        store: this.$store,
        route: this.$route
      })
    }
  }
})
```
这两种策略是跟不上不同的用户体验决策, 应该根据你创建的应用程序的实际使用场景进行挑选. 但是无论你选择哪种策略, 当路由重用(同一路由, 但是params或query已更改, 例如, 从 user/1 到 user/2)时, 也应该调用asyncData函数. 我们可以通过纯客户端(client-only)的全局mixin来处理这个问题:
```js
Vue.mixin({
  beforeRouteUpdate (to, from, next) {
    const { asyncData } = this.$options
    if (asyncData) {
      asyncData({
        store: this.$store,
        route: to
      }).then(next).catch(next)
    }esle {
      next()
    }
  }
})
```
### Store代码拆分(Store Code Spliting)
在大型应用程序中, 我们的VuexStore可能会分为多个模块. 当然, 也可以将这些模块代码, 分割到相应的路由组件chunk中. 假设我们有以下Store模块:
```js
// store/modules/foo.js
export default {
  namespace: true,
  // 重要信息: state 必须是一个函数, 因此可以创建多个实例化该模块
  state: () => ({
    {
      count: 0
    }
  }),
  actions: {
    inc: ({commit}) => commit('inc')
  },
  mutations: {
    inc: state => state.count ++
  }
}
```
我们可以在路由组件的asyncData钩子函数中, 使用store.registerModule惰性注册(lazy-register)这个模块:
```html
<!-- // 在路由组件内 -->
<template>
  <div>{{fooCount}}</div>
</template>
<script>
// 在这里导入模块, 而不是在`store/index.js`中
import fooStoreModule from '../store/modules/foo'
export default {
  asyncData ({store}) {
    store.registerModule('foo', fooStoreModule)
    return store.dispatch('foo/inc')
  },
  // 重要信息: 多次范根路由时, 避免在客户单重复注册模块
  destoryed () {
    this.$store.unregisterModule('foo')
  },
  computed: {
    fooCount () {
      return this.$store.state.foo.count
    }
  }
}
</script>
```
**由于模块现在是路由组件的依赖, 所以它将被被webpack移动到路由组件的异步chunk中.**
