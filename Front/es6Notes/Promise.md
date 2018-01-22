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
使用Promsie包装了一个图片加载的异步操作。 如果加载成功， 就调用resolve方法，否则就调用reject方法。
```js
// 使用Promise实现ajax
const getJSON = function(url) {
    const promise = new Promise(function(resolve, reject){
        const handler = function() {
            if(this.readyState !==4){
                return
            }
            if(this.status ===200){
                resolve(this.response)
            } else {
                reject(new Error(this.statusText))
            }
        }
        const client = new XMLHttpRequest()
        client.open('GET', url)
        client.onreadtstatechange = handler
        client.responseType = 'json'
        client.setRequestHeader('Accept', 'application/json')
        client.send()
    })
    return promise;
}

getJSON('/posts.json').then(function(json){
    console.log(json)
}, function(error){
    console.log(error)
})
```
getJSON是对XMLHttpRequest对象的封装，用于发出一个针对JSON数据的HTTP请求， 并且返回一个Promise对象。 **需要注意的是，在getJSON内部， resolve函数和reject函数调用时，都带有参数**
如果调用resolve函数和reject函数时带有参数， 那么个她们的参数会被传递给回调函数。 reject函数的参数通常是Error对象的实例， 表示跑出错误； resolve函数参数除了正常的参数以外, 还可以能是 另一个Promise 实例, 比如:
```js
const p1 = new Promise(function(resolve, reject){})
const p2 = new Promise(function(resolve, reject){
    resolve(p1)
})
```
p1, p2都是Promise实例, 但是p2的resolve方法将p1作为参数, 即一个异步操作的结果返回另一个异步操作.
**注意, 这时p1的状态就会传递给p2, 也就是说, p1的状态决定了p2的状态. 如果p1的状态是pending, 那么p2的回调函数就会等待p1的状态改变; 如果p1的状态已经是resolved或rejected, 那么p2的回调函数将会立即执行**
```js
const p1 = new Promise(function(resolve, reject){
    setTimeout(()=> reject(new Error('fail')), 3000)
})

const p2 = new Promise(function(resolve, reject){
    setTimeout(()=> resolve(p1), 1000)
})

p2.then(result => console.log(result))
    .catch(error=> console.log(error))
```
p1 是一个Promise, 3s之后变为rejected. p2的状态在1秒之后改变, resolve方法返回的是p1. 由于p2返回的是另一个Promise, 导致p2的状态无效, 由于p1的状态决定p2的状态. 所以, 后面的then语句都编程针对后者p1. 又过了2秒, p1变为rejected, 导致触发catch方法指定的回调函数.
**调用resolve或reject并不会终结Promise的参数函数的执行**
```js
new Promise((resolve, reject) => {
    resolve(1)
    console.log(2)
}).then(r => { console.log(r) })
```
调用resolve(1)以后, 后面的console.log(2)还是会执行, 并且会首先打印出来. 这是因为立即resolved的Promise是在本轮事件循环的末尾执行, 总是晚于本轮循环的同步任务.

调用resolve或reject以后, Promise的使命就完成了. 后续操作应该放到then方法里面, 而不是直接写在resolve或reject的后面. 所以, 最好在它们前面加上return语句, 这样就不会有意外.
```js
new Promise((resolve, rject) => {
    return resolve(1)
    console.log(2) // 不会执行
})
```
## 3. Promise.prototype.then()
Promise实例具有then方法, 也就是说, then方法是定义在原型对象Promise.prototype上的. 它的作用是为Promise 实例添加状态改变时的回调函数. 前面说过, then 方法的第一个参数是resolved状态的回调函数, 第二个个参数(可选)是rejected状态的回调函数.

then方法返回的是一个新的Promise实例(**注意, 不是原来那个Promise**). 因此可以采用链式写法, 即then方法后面再调用另一个then方法.
```js
getJSON('/posts.json').then(function(json){
    return json.post
}).then(function(post){
    // ...
})
```
上面代码使用then方法. 依次指定了两个回调函数. 第一个回调函数完成以后, 会将返回结果作为参数, 传入第二个回调函数
采用链式的then,  可以指定一组按照次序调用的回调函数. 这时, 前一个回调函数, 有可能返回的还是一个Promise对象(有异步操作), 这时后一个回调函数, 就会等待改Promise对象的状态发生变化, 才会被调用.
```js
getJSON('post/1.json').then(function(post){
    return getJSON(post.commentURL);
}).then(function funcA(comments) {
    console.log('resolved:', comments)
}, function funcB(err){
    console.log('rejected:', err)
})
```
代码中, 第一个then方法指定的回调函数, 返回的是另一个Promise对象. 这时, 第二个then方法指定的回调函数, 就会等待这儿新的Promise对象状态发生变化. 如果变为resolved. 就调用func, 如果状态变为rejected, 就调用funcB
如果采用箭头函数, 上面的代码:
```js
getJSON('post/1.json').then(post => getJSON(post.commentURL)).then(
    comments => console.log('resoled:', comments),
    err => console.log('rejected:', err)
)
```

##  4. Promise.prototype.catch()
Promise.prototype.catch方法是.then(null, rejection)的别名,用于指定发生错误时的回调函数.
```js
getJSON('post.json').then(function(posts){
    // ..
}).catch(function(error){
    //...
    console.log('error', error)
})
```
上面代码中, getJSON方法返回一个Promise对象. 如果该对象桩体变为resolved, 则会调用then方法指定的回调函数. 如果异步抛出错误, 状态就会变为rejected, 就会调用catch方法指定的回调函数, 处理这个错误. 另外, then方法指定的回调函数, 如果运行中抛出错误, 也会被catch方法捕获.
```js
p.then(val) => console.log('fulfilled:', val)
.catch(err=> console.log('rejected', err))

// 等同于
p.then(val => console.log('fulfilled:', val))
.then(null, err => console.log('rejected:', error))
```
如果Promise状态已经变为resolved, 再抛出错误是无效的.
```js
const promise = new Promise(function(resolve, reject) {
    resolve('ok')
    throw new Error('test')
})
promise.then(function(value) {console.log(value)})
.catch(error => console.log(error)
```
上面再Promise再resolve语句后面, 再抛出错误, 不会被捕获, 等于没有抛出. 因为Promise的状态一旦改变, 就永久保持改状态, 不会再改变了.

Promise 对象的错误具有"冒泡"性质, 会一致向后传递, 知道被捕获为止. 也就是说, 错误总是会被下一个catch语句捕获.
```js
getJSON('/post/1.json').then(function(post){
    return getJSON(post.commentURL)
}).then(function(comments){
}).catch(error => {
    // 处理前面三个Promise产生的错误.
})
```
上面代码中, 一共有三个Promise对象: 一个由getJSON产生, 两个then产生. 它们之中任何一个抛出错误, 都会被最后一个catch捕获.
**一般来说,不要在then里面定义Reject状态的回调函数, 总是使用catch方法**
跟传统的try/catch代码块不同的是, 如果没有使用catch方法指定错误处理的回调函数, Promise对象抛出的错误不会传递到外层代码, 即不会有任何反应.
```js
const someAsyncThing = function() {
  return new Promise(function(resolve, reject) {
    // 下面一行会报错，因为x没有声明
    resolve(x + 2);
  });
};

someAsyncThing().then(function() {
  console.log('everything is great');
});

setTimeout(() => { console.log(123) }, 2000);
// Uncaught (in promise) ReferenceError: x is not defined
// 123
```
上面的代码中, someAsThing 函数产生的Promise对象, 内部有语法错误. 浏览器中运行时会打印出错误提示:'ReferenceEoor: x is not defined', 但是不会退出进行, 终止脚本执行. 2s后还会输出123. 就是说, Promise内部的错误不会影响到Promisne外部的代码, 通常的说法就是"Promise 会吃掉错误"

这个脚本放在服务器执行, 退出码就是0(即表示执行成功). 不过, Node有一个unhandleRejection事件, 专门监听未捕获的reject错误, 上面的脚本会触发这个事件的监听函数, 可以在监听函数里抛出错误.
```js
process.on('unhandledRejection', function(err, p){
    throw err;
})
```
注意, Node有计划在未来废除unhandledRejection事件. 如果Promise内部有未捕获的错误, 会直接终止进程, 并且进程的退出码不为0
```js
const promise = new Promise(function(resolve, reject) {
    resolve('ok')
    setTimeout(function(){throw new Error('test')}, 0)
})
promise.then(function(value) {console.log(value)})
```
上面代码中, Promise指定下一轮"事件循环"再抛出错误. 到那个时候, Promise的运行已经结束. 所以这个错误是在Promise函数体外抛出的, 会冒泡到最外层, 成了未捕获的错误.
**一般总是建议, Promise对象后面要跟catch方法, 这样可以处理Promise内部发生的错误. catch方法返回的还是一个Promise对象, 因此后面还可以接着调用then方法**
```js
const someAsyncThing = function() {
    return new Promise(function(resolve, reject){
        // 下面一行会会抱错, 因为x没有声明
        resolve(x + 2)
    })
}

someAsyncThing()
.catch(error) => console.log('error:', error))
.then(()=> console.log('carry on...'))
```
上面代码运行完catch方法指定的回调函数, 会接着运行后面那个then方法指定的回调函数. 如果没有抱错, 则会跳过catch方法.
```js
Promise.resolve()
.catch(error => console.log('no', error))
.then(()=> console.log('carry on'))
```
**catch**方法之中, 还能再抛出错误.
```js
const someAsyncThing = function() {
    return new Promise(function(resolve, reject) {
        // x 会声明
        resolve(x + 2)
    })
}

someAsyncThing().then(()=> someOtherAsyncTHing())
.catch(error=> {
    console.log('no', error)
    y + 2
}).then(function(){
    console.log('carry on')
})
// oh on (ReferenceError: x is not defined)
```
catch方法会抛出一个错误, 因为后面没有别的catch方法, 导致这个错误不会被捕获, 也不会传递到外层. 如果改写一下, 结果就不一样
```js
someAsyncThing().then(function(){
    return someOtherAsync
})
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
