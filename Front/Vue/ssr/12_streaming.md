# Streaming
对于vue-server-renderer的基本renderer和bundle renderer都提供开箱即用的流式渲染功能. 所有你需要做的就是用 **renderToStream 带起 renderToString**
```js
const stream = renderer.renderToStream(context)
```
返回的值是Node.js stream
```js
let html = ''
stream.on('data', data => {
  html += data.toString()
})
stream.on('end', () => {
  console.log(html) // 渲染完成
})
stream.on('error', err => {
  // handle error
})
```

## 流式传输说明(Streaming Caveats)
在流式渲染模式下, 当renderer遍历虚拟DOM树(virtual DOM tree)时, 会尽快发送数据. 这意味着我们可以尽快获得"第一个chunk", 并开始更快地将其发送给客户端.

然而, 当第一个数据chunk被发送时, 子组件甚至可能不被实例化,  它们的声明周期钩子也不会被调用. 这意味着, 如果子组件需要在其生命周期钩子函数中, 将数据附件到渲染上下文(render context), 当流式(stream)启动时, 这些数据将不可用. 这是因为, 大量上下文信息(context information)(如头信息(head information)或内联关键CSS(inline critical CSS))需要在应用程序标记(markup)之前出现, 我们基本上必须等待流(stream)完成后, 才能开始使用这些上下文数据.

因此, **如果你依赖有组件生命周期钩子函数填充的上下文数据, 则*不建议*使用流程传输模式**