# Promise 对象
1.  [Promise的含义](#1)
2.  [基本用法](#2)

## 1. [Promise的含义]
Promise是异步编程的一种解决方案, 比传统的解决方案--回调函数和时间--更合理和强大. 
所谓Promise, 简单说就是一个容器, 里面保存着某个未来才会结束的事件(通常是一个异步操作)的结果. 从语法上说, Promise是一个对象, 从它可以获取异步操作的消息. Promise提供统一的API, 各种异步操作都可以用同样的方法进行处理.

Promise对象有以下两个特点.
1.  对象的状态不受外界影响. Promise对象代表一个异步操作, 有三种状态: pending(进行中), fulfilled(已成功) 和 rejected(已失败). 只有异步操作的结果, 可以决定当前是哪一种状态, 任何其他操作都无法改变这个状态. 这也是Promise名字的由来.
2. 一旦状态改变,就不会再变, 任何时候都可以得到这个结果. Promise对象的状态改变, 只有两种可能: 从pending变为fulfilled和pending变成rejected. 只要这两种情况发生, 状态就凝固了, 不会再变了, 会已知保持这个结果, 这时就称为resolved(已定型). 如果改变已经发生了, 你在对Promise对象添加回调函数, 也会立即得到这个结果. 这与事件(Event)完全不同, 事件的特点是, 如果你错过了它, 再去监听, 是得不到结果的.
(为了行文方便, 该记录之后resolved统一只指fulfilled状态. 不包含rejected状态)
    有了Promise对象, 就可以将异步操作以同步操作的流程表达出来, 避免了层层嵌套的回调函数. 此外, Promise对象提供统一的接口, 使得控制异步操作更加容易.
    Promise也有 缺点:
    1. 首先, 无法取消Promise, 一旦新建它就会立即执行, 无法中途取消
    2. 如果不设置回调函数, Promise内部抛出的错误, 不会反应到外部.
    3. 当处于pending状态时, 无法得知目前进展到哪一个阶段(刚开始抑或即将完成)
**如果某些事件不断反复发生, 一般来说, 使用Stream模式比部署Promise更好**
---
## 2. 基本用法
ES6 规定, Promise对象是一个构造函数, 用来生成Promise实例.
```js
const promise = new Promise(function(resolve, reject){
    // ....
    if (/*异步操作成功*/) {
        resolve(value)
    } else {
        reject(error)
    }
})
```
Promise 构造函数接受一个函数作为参数, 该函数的两个参数分别是resolve和reject. 它们是两个函数, 由Javascript引擎提供, 不用自己部署.
resolve函数的作用是, 将Promise对象的状态从"未完成"变为"成功"(即从pending变成resolved), 在异步操作成功时调用, 并将异步操作的结果, 作为参数传递出去; reject函数的作用是将Promise对象的状态从"未完成"变为"失败(即从pending比哪位rejected)", 在异步操作失败时调用, 并将异步操作爆出的错误, 作为参数传递出去.
Promise实例生成以后, 可以用then方法分别指定resolved状态和rejected状态的回调函数.
```js
promise.then(function(value) {
    // success
}, function(error){
    // failure
})
```
then 方法接收两个回调函数作为参数. 第一个是状态改变为resolved时调用, 第二个是变为rejected时调用. **第二个可选**
```js
function timeout(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms, 'done')
    })
}

timeout(100).then((value) => {
    console.log(value)
})
```
timeout返回一个Promise实例, 表示一段时间以后才会发生的结果. 过了指定的时间(ms)以后, Promise状态变为resolved, 就会触发then方法绑定的回调函数.
Promise 新建后会立即执行.
```js
let promise = new Promise(function(resolve, reject) {
    console.log('promise')
    resolve()
})

promise.then(function(){
    console.log('resolved.')
})

console.log('Hi!')

// Promise
// Hi
// resolved
```
**Promise新建后立即执行**, 首先输出的是Promise. 然后, then方法指定回调函数, 将在当前脚本所有同步任务执行完才会执行. 所以resolved最后才会输出.
下面是异步加载图片的例子
```js
function loadImageAsync(url){
    return new Promise(function(resolve, reject) {
        const image = new Image();
        image.onload = function () {
            resolve(image)
        }
        image.onerror = function() {
            reject(new Error('Could not load image at' + url))
        }
        image.src = url
    })
}
```

## 5. Promise.all()
Promise.all方法用于将多个Promise实例， 包装成一个新的Promise实例。
```js
const p = Promise.all([p1, p2, p3])
```
上面的代码中， Promise.all方法接受一个数组作为参数， p1，p2, p3都是Promise实例， 如果不是， 就会先调用Promise.resolve方法，将参数转化为Promise实例， 再进一步处理。 （Promise.all方法的参数可以不是数组，但必须具有Iterator接口， 且返回的每个成员都是Promise实例。）
p的状态有p1， p2， p3决定， 分成两种情况：
1.  只有p1，p2, p3的状态都变为fulfilled, p的状态才会变为fulfilled， 此时p1， p2， p3的返回值组成一个数组， 传递给p的回调函数。
2.  只要p1， p2， p3之中有一个被rejected， p的状态就变成rejected， 此时第一个被reject的实例的返回值会传递给p的回调函数
```js
// 生成一个Promise对象的数组
const promise = [2, 3, 4, 7, 11, 13].map(function(id){
    return getJSON('/post/'+id+'.json');
})

Promise.all(promise).then(function(posts)){
    //....
}).catch(function(reason){
    //...
})
```
上面的promise是包含6个Promise实例的数组， 只有这6哥实例的状态都变为fulfilled， 或者其中有一个变为rejected，才会调用Promise.all方法后面的回调函数。
```js
const databasePromise = connectDatabase();

const booksPromise = databasePromise.then(findAllBooks);

const userPromise = databasePromise.then(getCurrentUser);

Promise.all([
    booksPromise,
    userPromise
])
.then(([books, user])=> pickTopRecommentations(books, user))
```
上面代码中， booksPromise和userPromise是两个异步操作， 只有等到它们的结果都返回了， 才会出发pickTopRecommentations这个回调函数。
注意， 如果作为参数的Promise实例， 自己定义了catch方法， 那么它一旦被rejected， 并不会出发Promise.all()的catch方法。
```js
const p1 = new Promise((resolve, reject) => {
    resolve('hello')
})
.then(result=> result)
.catch(e=> e)

const p2 = new Promise((resolve, reject) => {
    throw new Error('error')
})
.then(result => result)
.catch(e=> e)

Promise.all([p1, p2])
.then(result => console.log(result))
.catch(e => console.log(e))
// ['hello',  Error: error at Promise (<anonymous>:8:9) at new Promise (<anonymous>)  at <anonymous>:7:12]]
```
上面代码中，p1会resolved,p2首先回rejected，但p2有自己的catch方法， 该方法返回一个新的Promise实例， p2指向的实际上是这个实例。 该实例执行完catch方法后， 也会变成resolved， 导致Promise.all()方法参数里面的两个实例都会resolved， 因此会调用then方法指定的回调函数， 而不会调用catch方法指定的回调函数。

如果p2没有自己的catch方法， 就会调用Promise.all()的catch方法。
```js
const p1 = new Promise((resolve, reject) => {
    resolve('hello')
})
.then(result => result)

const p2 = new Promise((resolve, reject) => {
    throw new Error('error')
})
.then(result => result)

Promise.all([p1, p2])
.then(result => console.log(result))
.catch(e=> console.log(e))
// Error: error ....
```

## 6. Promise.race()
Promise.race方法同样是将多个Promise实例，包装成一个新的Promise实例。
```js
const p = Promise.race([p1, p2, p3])
```
上面代码中， 只要p1， p2， p3之中有一个实例率先改变状态，p的状态就跟着改变。 那个涮先改变的Promise实例的返回值，就传递给p的回调函数。

Promise.race方法的参数与Promise.all方法一样， 如果不是Promise实例， 就会先调用下面讲到的Promise.resolve方法， 将参数转化为Promise实例， 再进一步处理。

下面的例子， 如果指定时间内没有获得结果， 就将Promise的状态变为reject， 否则变为resolve。
```js
const p = Promise.race([
    fetch('/resource-that-may-take-a-while'),
    new Promise(function(resolve, reject){
        setTimeout(()=> reject(new Error('request timeout')), 5e3)
    })
]);
p.then(response => console.log(response));
p.catch(error => console.log(error));
```
上面的代码中，如果5s内fetch方法无返回结果， 结果p的状态就变为rejected， 从而出发catch方法指定的回调函数。

## 7. Promise.resolve()
