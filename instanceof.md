### typeof

typeof用来判断一个变量的类型。

typeof对于所有的引用类型变量，都会返回object

````
typeof {} => 'object'

typeof [] => 'object'
````

### instanceof

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