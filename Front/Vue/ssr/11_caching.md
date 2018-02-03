
# 缓存
虽然Vue的服务端渲染(SSR)相当快速, 但是由于创建组件实例和虚拟DOM节点的开销, 无法与纯基于字符串拼接(pure string-based)的模板性能相当. 在SSR性能至关重要的情况下, 明智地利用缓存策略, 可以极大改善响应时间并减少服务器负载.

## 页面级别缓存(Page-level Caching)
在大多数情下, 服务器渲染的应用程序依赖于外部数据, 因此本质上页面内容是动态的, 不能持续上时间缓存. 然而, 如果内容不是用户特定(user-speific)(即对于相同的URL, 总是为所有用户渲染想听的内容), 我们可以利用名为micro-caching的缓存策略, 来大幅度提高应用程序处理高流量的能力.

这通常实在Nginx层完成, 但是哦们也可以在Node.js中实现它:
```js
const microCache = LRU({
  max: 100,
  maxAge: 1000  // 重要提示: 条目在1s后过期
})
const isCacheable = req = {
  // 实现逻辑为, 检查请求是否是用户特定(user-specific)
  // 只有非用户特定(non-user-specific)页面才会缓存
}
server.get('*', (req, res) => {
  const cacheable = isCacheable(req)
  if (cacheable) {
    const hit = microCache.get(req.url)
    if(hit){
      return res.end(hit)
    }
  }
  renderer.renderToString((err, html) => {
    res.end(html)
    if(cacheable){
      microCache.set(req.url, html)
    }
  })
})
```
由于内容缓存只有一秒钟, 用户将无法查看过期的内容. 然而, 这意味着, 对于每个要缓存的页面, 服务器最多只能每秒执行一次完整渲染.

## 组件级别缓存(Compnent-level Caching)
vue-server-render 内置支持组件级别缓存(component-level caching). 要启组件级别缓存, 你需要在创建renderer时提供*具体缓存实现方式(cache imponentation).* 典型的做法是传入 iru-cache:
```js
const LRU = require('lru-cache')
const renderer = createRenderer({
  cache: LRU({
    max: 10000,
    maxAge: ...
  })
})
```
然后, 你可以通过实现serverCacheKey函数来缓存组件.
```js
export default {
  name: 'item',
  props: ['item'],
  serverCacheKey: props => props.item.id,
  render (h) {
    return h('div', this.item.id)
  }
}
```
请注意, 可缓存组件**还必须定义一个唯一的name选项.** 通过使用唯一的名称, 每个缓存键(cache key)对应一个组件: 你无需担心两个组件返回同一个key

serverCacheKey 返回的key应该包含足够的信息, 来表示渲染结果的具体情况. 如果渲染结果仅有props.item.id决定, 则上述是一个很好的实现. 但是, 如果具有相同的id的item可能会随时间而变化. 或者如果渲染结果依赖于其他prop, 则需要修改getCacheKey的实现, 以考虑其他变量.

返回常量将导致组件使用被缓存, 这对纯静态组件是有好处的.

## 核实使用组件缓存
如果renderer在组件渲染过程中进行缓存命中, name它将直接重新使用整个子树的缓存结果. 这意味着在以下情况, **你不应该缓存组件:**
- 它具有可能依赖于全局状态的子组件
- 它具有对渲染上下文产生副作用(side effect)的子组件

因此, 应该小心使用组件缓存来解决性能瓶颈. 大多数情况下, 你不能够也不需要缓存单一实例组件. **适用于缓存的最常见类型的组件, 是在大的v-for列表中重复出现的组件.** 由于这些组件通常由数据库集合(database collection)中的对象驱动, 它们可以使用简单的缓存策略: 使用其唯一id, 再加上最后更新的时间戳, 来生成缓存键(cache key):
```js
serverCacheKey: props => props.item.id + '::' + props.item.last_updated
```