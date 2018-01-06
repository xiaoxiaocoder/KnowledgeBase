# Reflect
1. 概述
2. 静态方法
3. 实例： 使用Proxy实现观察者模式
---
-   [Go back to Home](https://github.com/xiaoxiaocoder/KnowledgeBase)
-   [Go back to es6 index page](../es6.md)

---
## 1. 概述
Reflect对象与Proxy对象一样， 也是ES6 为了操作对象而提供的新的API。 Reflect对象的设计目的有这样几个。
-   1. 将Object对象的一些明显属于语言内部的方法(比如Object.defineProperty), 放到Reflect对象上。 现阶段，某些方法同时在Object和Reflect对象上部署， 未来的新方法只部署在Reflect对象上。 也就是说， 从Reflect对象哈桑可以拿到语言内部的方法。
-   2. 修改某些Object方法的返回值，让其变得更合理。比如， Object.defineProperty(obj, name, desc) 无法在定义属性时，会抛出一个错误，而Reflect.defineProperty(obj, name, desc) 则会返回false
```js
// old
try {
    // success
    Object.defineProperty(target, property, attributes);
} catch (e) {
    // failure
}

// new
if (Reflect.defineProperty(target, property, attributes)) {
    // success
} else {
    // failure
}
```
-   3.  让Object操作都变成函数行为. 某些Object操作是命令式, 比如name in obj 和 delete obj[name], 而Reflect.has(obj, name)和Reflct.deleteProperty(obj, name) 让它们变成函数行为
```js
// old
'assign' in Object // true

// new
Reflect.has(Object, 'assign') // true
```