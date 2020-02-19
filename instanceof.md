## typeof

typeof用来判断一个变量的类型。

typeof对于所有的引用类型变量，都会返回object

````
typeof {} => 'object'

typeof [] => 'object'
````

## instanceof

instancof用来判断某个实例是不是属于某个构造函数(class)

instanceof 的判断逻辑是能够在实例的原型链上找到class.prototype，与class的constructor无关、

````
function A(){} 
function B(){} 
Foo.prototype = new B();
 
var b = new B(); 
console.log(b instanceof B) // true 
console.log(b instanceof A) // true
````

简单的实现instancof

````

function instanceof(instance, structure) {

  if (instance === null || structure === null) {
    return false;
  }

  const prototype = structure.prototype;
  let ins = instance.__proto__;

  while(true) {
    if (prototype === ins) {
      return true;
    }

    ins = ins.__proto__;
  }

}

````

简单来说，instanceof 用来检测class 的原型是否在实例的原型链上。

## __proto__

````
var arr = []; // 相当于是 var arr = new Array() 的语法糖
var obj = {}; // 相当于是 var obj = new Object() 的语法糖
function test() {}; // 相当于是 var test = new Function() {} 的语法糖
````

![prototype](https://camo.githubusercontent.com/ae0f0c7438ebc47cdaab8b68b0778adcbd24519b/687474703a2f2f7777772e6d6f6c6c7970616765732e6f72672f7475746f7269616c732f6a736f626a5f66756c6c2e6a7067)