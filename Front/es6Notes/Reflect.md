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
-   4. Reflect对象的方法与Proxy对象的方法一一对应, 只要是Proxy对象的方法,就能在Reflect对象上找到对应的方法. 这就让Proxy对象可以方便地调用对应的Reflect方法. 完成默认行为, 作为修改行为的基础. 也就是说,不管Proxy怎么修改默认行为, 总可以在Reflect上获取默认行为.
```js
Proxy(target, {
    set: function(target, name, value, receiver) {
        var success = Reflect.set(target, name, value, reveiver)
        if (success) {
            log(`property ${name} on ${target} set to ${value}`)
        }
        return success
    }
})
```
上面代码中, Proxy方法拦截target对象的属性赋值行为. 它采用Reflect.set 方法将值赋值给对象的属性, 确保完成原有的行为, 然后在部署额外的功能.
另一个例子
```js
var loggedObj = new Proxy(obj, {
    get(target, name) {
        console.log('get', target, name)
        return Reflect.get(target, name)
    },
    deleteProperty(target, name) {
        console.log('delete' + name)
        return Reflect.deleteProperty(target, name)
    },
    has(target, name) {
        console.log('has' + name)
			return Reflect.has(target, name)
    }
})
```
上面代码中, 每一个Proxy对象的拦截操作(get, delete, has), 内部都调用对应的Reflect方法, 保证原生行为能够正常执行. 
有了Reflect对象后, 很多操作会更易读
```js
// old
Function.prototype.apply.call(Math.floor, undefined, [1.75]) // 1

// new
Reflect.apply(Math.floor, undefined, [1.75]) // 1
```

## 2. 静态方法
Reflect对象一共有13个静态方法.
-	Reflect.apply(target, thisArg, args)
-	Reflect.construct(target, args)
-	Reflect.get(target, name, receiver)
-	Reflect.set(target, name, value, receiver)
-	Reflect.defineProperty(target, name, desc)
-	Reflect.deleteProperty(target, name)
-	Reflect.has(target, name)
-	Reflect.ownKeys(target)
-	Reflect.isExtensions(target)
-	Reflect.preventExtensions(target)
-	Reflect.getOwnPropertyDescriptor(target, name)
-	Reflect.getPrototypeOf(target)
-	Reflect.setPrototypeOf(target, prototype)
大部分与Object对象的同名方法作用都是相同的, 而且与Proxy对象的方法是一一对应的.

-	1.	Reflect.get(target, name, receiver)
Reflect.get方法查找并返回target对象的name属性, 如果没有该属性, 则返回undefined
```js
var myObject = {
	foo: 1,
	bar: 2,
	get baz () {
		return this.foo + this.bar
	}
}

Reflect.get(myObject, 'foo') // 1
Reflect.get(myObject, 'bar') // 2
Reflect.get(myObject, 'baz') // 3
```
如果name属性部署了读取函数(getter), 则读取函数的this绑定reveiver
```js
var myObject = {
	foo: 1,
	bar: 2,
	get baz() {
		return this.foo + this.bar
	}
}

var myReceiverObject = {
	foo: 4,
	bar: 4
}

Reflect.get(myObject, 'baz', myReceiverObject) // 8
```
如果第一个参数不是对象, Reflect.get会报错
```js
Reflect.get(1, 'foo') // error
Reflect.get(false, 'foo') //error
```

-	2. Reflect.set(target, name, value, receiver)
Reflect.set方法设置target对象的name属性等于value
```js
var myObject = {
	foo: 1,
	set bar(value){
		return this.foo = value
	}
}

myObject.foo // 1

Reflect.set(myObject, 'foo', 2)
myObject.foo // 2

Reflect.set(myObject, 'bar', 3)
myObject.foo // 3
```
如果name属性设置了赋值函数, 则赋值函数的this绑定reveiver
```js
var myObject = {
	foo: 4,
	set bar(value) {
		return this.foo = value
	}
}

var myReceiverObject = {
	foo: 0
}

Reflect.set(myObject, 'bar', 1, myReceiver)
myObject.foo // 4
myReceiverObject.foo // 1
```

注意, 如果Proxy对象和Reflect对象联合使用, 前者链接赋值操作, 后者完成赋值的默认行为, 而且传入了receiver, 那么Reflect.set会触发Proxy.defineProperty拦截
```js
let p = {
	a: 'a'
}

let handler = {
	set(target, key, value, receiver) {
		console.log('set')
		Reflect.set(target, key, value, receiver)
	},
	defineProperty(target, key, attributes){
		console.log('defineProperty')
		Reflect.defineProperty(target, key, attribute)
	}
}

let obj = new Proxy(p, handler)
obj.a = 'A'
// set
// defineProperty
```
Proxy.set拦截里使用了Reflect.set, 而传入了receiver,导致触发Proxy.defineProxy拦截. 这是因为Proxy.set的reveiver参数总是指向大年的Proxy实例(obj), 而Reflect.set一旦传入receiver, 这会降属性复制到receiver上面(即obj), 导致触发defineProperty拦截. **如果Reflect.set没有传入receiver, 那么就不会触发defineProperty拦截.**
```js
let p = {
	a: 'a'
}

let handler = {
	set (target, key, value, receiver) {
		console.log('set')
		Reflect.set(target, key, value)
	}
	defineProperty(target, key, attribute) {
		console.log('defineProperty')
		Reflect.defineProperty(target, key, attribute)
	}
}

let obj = new Proxy(p, handler)
obj.a = 'A';
// set
```
如果第一个参数不是对象, Reflect.set会报错
```js
Reflect.set(1, 'foo', {}) // 报错
Reflect.set(false, 'foo', {}) // 报错
```

-	3. Reflect.has(obj, name)
Reflect.has 方法对应name in obj里的in运算符
```js
var myObject = {
	foo: 1
}
// old
'foo' in myObject // true

// new
Reflect.has(myObject, 'foo') // true
```
如果第一个参数不是对象, Reflect.has 和 in 运算符都会报错

-	4. Reflect.deleteProperty(obj, name)
Reflect.deleteProperty方法等同于delete obj[name],用于删除删除对象的属性
```js
const myObj = {foo: 'bar'}

//old
delete myObj.foo

// new
Reflect.deleteProperty(myObj, 'foo')
```
返回布尔值. 如果删除成功或者被删除的属性不存在, 返回true; 删除失败, 被删除的属性依然存在, 返回false

-	5.	Reflect.construct(target, args)
Reflect.construct方法等同于new target(...args), 这提供一种不使用new, 来调用构造函数的方法
```js
function Greeting(name) {
	this.name = name
}

// new
const instance = new Greeting('zhangsan')

// Reflect.construct
const instance = Reflect.construct(Greeting, ['zhangsan'])
```

-	6. Reflect.getProptotypeOf(obj)
Reflect.getPrototypeOf 方法用于读取对象的__proto__属性, 对应Object.getPrototypeOf(obj)
```js
const myObj = new FancyThing()

// old style
Object.getPrototypeOf(myObj) === FancyThing.prototype

// new style
Reflect.getPrototypeOf(myObj) === Fancything.prototype
```
Reflect.getPrototypeOf 和 Object.getPrototypeOf的一个区别是, 如果参数不是对象, Object.getPrototypeOf会将这个参数转为对象, 然后再运行, 而Reflect.getPrototypeOf会报错.
```js
Object.getPrototypeOf(1) // Number([[PrimitiveValue]]: 0)
Reflect.getPrototypeOf(1) // error
```

-	7. Reflect.setPrototypeOf(obj, newProto)
Reflect.setPrototypeOf 方法用于设置对象的__proto__属性,返回第一个参数对象, 对应Object.setPrototypeOf(obj, newProto)
```js
const myObj = new FancyThing()

// old 
Object.setPrototypeOf(myObj, OtherThing.prototype)

// new
Reflect.setPrototypeOf(myObj, OtherThing.prototype)
```
如果第一个参数不是对象, Object.setPrototypeOf会返回第一个参数本身, 而Reflect.setPrototypeOf会报错
```js
Object.setPrototypeOf(1, {})
// 1

Reflect.setPrototypeOf(1, {})
// TypeError: Reflect.setPrototypeOf called on non-object
```
如果第一个参数是undefined或null, Object.setPrototypeOf 和 Reflect.setPrototypeOf 都会报错
```js
Object.setPrototypeOf(null, {})
// TypeError: Object.setPrototypeOf called on null or undefined

Reflect.setPrototypeOf(null, {})
// TypeError: Reflect.setPrototypeOf called on non-object
```

-	8. Reflect.apply(func, thisArg, args)
Reflect.apply 方法等同于Function.prototype.apply.call(func, thisArg, args), 用于绑定this对象后执行给定函数
一般来说, 如果要绑定一个函数的this对象, 可以这样写fn.apply(obj, args), 但是如果函数定义了自己的apply方法, 就只能写成Function.prototype.apply.call(fn, obj, args), 采用Reflect对象可以简化成这种操作
```js
const ages = [11, 33, 12, 54, 18, 96]

// old
const youngset = Math.min.apply(Math, ages)
const oldest = Math.max.apply(Math, ages)
const type = Object.prototype.toString.call(youngest)

// new
const youngest = Reflect.apply(Math.min, Math, ages)
const oldest = Reflect.apply(Math.max, Math, ages)
const type = Reflect.apply(Object.prototype.toString, youngest, [])
```

-	9. Reflect.defineProperty(target, propertyKey, attributes)
Reflect.defineProperty方法基本等同于Object.defineProperty, 用来为对象定义属性. 未来, 后者会被逐渐废除, 现在开始就使用Reflect.defineProperty代替它.
```js
function myDate () {}

// old
Object.defineProperty(MyDate, 'now', {
	value: () => Date.now()
})

// new
Reflect.defineProperty(MyDate, 'now', {
	value: () => Date.now()
})
```
如果Reflect.defineProperty的第一个参数不是对象, 就会抛出错误. 比如Reflect.defineProperty(1, 'foo')

-	10. Reflect.getOwnPropertyDescriptor(target, propertyKey)
Reflect.getOwnPropertyDescriptor 基本等同于Object.getOwnPropertyDescriptor, 用于的代指定属性的描述对象, 将来会替代掉后者.
```js
var myObject = ()
Object.defineProperty(myObject, 'hidden', {
	value: true,
	enumerable: false
})

// old
var theDescriptor = Object.getOwnPropertyDescriptor(myObj, 'hidden')

// new 
var theDescriptor = Reflect.getOwnPropertyDescriptor(myObj, 'hidden')
```
Reflect.getOwnPropertyDescriptor 和 Object.getOwnPropertyDescriptor的一个区别是, **如果第一个参数不是对象, 后者不会报错, 返回undefined, 而前者会抛出错误, 表示参数非法**

-	11. Reflect.isExtensible(target)
Reflect.isExtensible 方法对应Object.isExtensible, 返回一个布尔值, 表示当前对象是否可扩展
```js
const myObject = {}

// old
Object.isExtensible(myObject) // true

//new
Reflect.isExtensible(myObject) // true
```
如果参数不是对象, Object.isExtensible会false, 因为非对象本来就是不可扩展的, 而Reflect.isExtensible会报错
```js
Object.isExtensible(1) // false
Reflect.isExtensible(1) // error
```
-	12. Reflect.preventExtensions(target)
Reflect.preventExtensions对应Object.preventExtensions方法, 用于让一个对象变为不可扩展. 返回一个布尔值, 表示是否操作成功
```js
var myObj = {}

// old
Object.preventExtensions(myObject) // Object {}

// new
Reflect.preventExtensions(myObject) // true
```
如果参数不是对象, Object.preventExtensions在ES 5环境报错, 在ES 6 环境返回传入的参数. 而Reflect.preventExtensions会报错
```js
// ES 5 
Object.preventExtensions(1) // error

// ES 6
Object.preventExtensions(1) // 1

// new
Reflect.preventExtensions(1) // error
```

-	13. Reflect.ownKeys(target)
Reflect.ownKeys 方法用于返回对象的所有属性, 基本等同于Object.getOwnPropertyNames 与 Object.getOwnPropertySymbols之和
```js
var myObject = {
	foo: 1,
	bar: 2,
	[Symbol.for('baz')]: 3,
	[Symbol.for('bing')]: 4
}

// old
Object.getOwnPropertyNames(myObject)
// ['foo', 'bar']

Object.getOwnPropertySymbols(myObject)
// [Symbol(baz), Symbol(bing)]

//new 
Reflect.ownKeys(myObject)
// ['foo', 'bar', Symbol(baz), Symbol(bing)]
```

## 3. 实例: 使用Proxy实现观察者模式
观察者模式(Observer mode) 指的是函数自动观察数据对象, 一旦对象有变化, 函数就会自动执行.
```js
const person = observable({
	name: 'zhangsan',
	age: 20
})

function print(){
	console.log(`${person.name}, ${person.age}`)
}

observe(print)
person.name = 'lisi'
//lisi, 20
```
上面代码中, 数据对象person是观察目标, 函数print是观察者. 一旦数据对象发生变化, print就会自动执行

下面, 使用Proxy写一个观察者模式的最简单实现, 即实现observable和observe这两个函数. 思路是observable函数返回一个原始对象的Proxy代理. 拦截赋值操作, 触发充当观察者的各个函数.
```js
const queueObservers = new Set()

const observe = fn => queueObservers.add(fn)
const observable = obj => new Proxy(obj, {set})

function set(target, key, value, receiver) {
	const result = Reflect.set(target, key, value, receiver)
	queuedObservers.forEach(observer => observer())
	return result
}
```
上面代码中, 先定义一个Set集合, 所有观察者函数都放进这个集合. 然后, observable;e函数返回原始对象的代理, 拦截赋值操作. 拦截函数set之中, 会自动执行所有观察者.