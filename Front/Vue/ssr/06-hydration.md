# 客户端激活(Client-side Hydration)
所谓客户端激活, 指的是Vue在浏览器端接管由服务端发送的静态HTML, 使其变为有Vue管理的动态DOM的过程.
在enrty-client.js中, 我们用下面这行挂载(mount)应用程序:
```js
// 这里假定App.vue template根元素的id="app"
app.$mount('#app')
```
由于服务器已经渲染好了HTML, 我们显然无需将其丢弃再重新创建所有的DOM元素. 相反, 我们需要"激活"这些静态HTML, 然后使他们成为动态的(能够响应后续的数据变化).
如果你检查服务器渲染的输出结果, 你会注意到应用程序根元素有一个特殊的属性:
```js
<div id="app" data-server-rendered="true">
```
data-server-rendered特殊属性, 让客户端Vue知道这部分HTML是由Vue在服务端渲染的, 并且应该以激活模式进行挂载.
在开发模式下, Vue将推断客户端生成的虚拟DOM树(Virtual DOM tree), 是否与从服务器渲染的DOM结构(DOM structure)匹配. 如果无法匹配, 它将退出混合模式, 丢弃现有的DOM并从头开始渲染. **在生产模式下, 此检测会被跳过,以避免性能损耗.**

## 一些需要注意的坑
使用"SSR + 客户端混合"时, 需要了解的一件事是, 浏览器可能会更改的一些特殊的HTML结构. 例如, 当你在Vue模板中写入:
```html
<table>
    <tr><td>hi</td></tr>
</table>
```
**浏览器会在&lt;table&gt;内部自动注入 <tbody>, 然而,由于VUe生成的虚拟DOM(virtual DOM)不包含<tbody>, 所以会导致无法匹配. 为了能够正确匹配, 请确保在模板中写入有效的HTML.**
