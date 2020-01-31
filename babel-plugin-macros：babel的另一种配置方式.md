> 翻译引用了文章 [Babel macros](https://lihautan.com/babel-macros/)

## 前言

对于现代的前端项目而言，webpack和babel是两个无法回避的工具。

相比于webpack的热度，以及webpack配置工程师等热门岗位，babel要默默无闻很多，但这并不是说它就不重要。

@babel/polyfill的核心依赖core.js的下载量，远超webpack、react等热门库。

## babel配置

babel的作用可以看成是一个编译器，将一些浏览器不能支持的语法进行转换，使得这些语法能够在浏览器中正常的运行。

对于不同的语法，babel提供了对应的plugin来进行语法转换，还可以通过preset来把plugin进行统一处理，简化babel的配置。

babel的配置文件，就是由这些特定的plugin和preset组成的，一旦进行了配置，babel就会自动对语法进行转换。

### 存在的问题

使用这种方法进行配置和代码转化，所有的转化都是全局性的和隐式的，并且对于一些特定功能的自定义语法和函数无法支持。

### 举个栗子

在[optional-chaining](https://v8.dev/features/optional-chaining)提案被采纳之前，我们也会有很多方法来处理类似props?.user?.friends?.[0]?.friend的属性取值

**最普通的写法，不易于阅读，但是最有效**


```
const firstFriend =
  props.user && props.user.friends && props.user.friends[0]
    ? props.user.friends[0].friend
    : null;

// or 使用三元运算符
const firstFriend = props
  ? props.user
    ? props.user.friends
      ? props.user.friends
        ? props.user.friends[0]
          ? props.user.friends[0].friend
          : null
        : null
      : null
    : null
  : null;
```

**易于书写，易于阅读，但是会增加运行时的开销**

```
function idx(input, accessor) {
  try {
    return accessor(input);
  } catch (e) {
    return null;
  }
}

const firstFriend = idx(props, _ => _.user.friends[0].friend);

```

是否有一种方式，能够拥有上面两种方式的优势，既易于书写易于阅读，同时也不会因为try-catch增加运行时的开销。

[facebookincubator/idx](https://github.com/facebookincubator/idx)给出了一种思路，它使用babel plugin来分析哪些文件使用require或者import对idx进行了引用，然后对使用了idx的地方进行替换，下面是一个具体的例子

**Install**

```
 npm install idx babel-plugin-idx
 
 or
 
 yarn add idx babel-plugin-idx
 
 // 修改babel配置文件
 {
  plugins: [
    ["babel-plugin-idx"]
  ]
}
```

**Usage**

```
import idx from 'idx';

function getFriends() {
  return idx(props, _ => _.user.friends[0].friends);
}
```

最终的代码会被转换为


```
function getFriends() {
  return props.user == null
    ? props.user
    : props.user.friends == null
    ? props.user.friends
    : props.user.friends[0] == null
    ? props.user.friends[0]
    : props.user.friends[0].friends;
}
```

上面的方案基本上达到了书写简单、阅读简单，同时没有增加运行时开销。但是存在一些问题：

- 首先得写一个babel plugin
- 需要一个特殊的标记符来定位需要进行转换的语法
- 需要更新babel的配置文件
- 如果idx函数存在问题，对于问题的定位会造成混乱。按照使用的语法，你会去找idx的定义文件，但是idx只是babel plugin的一个特殊标记，真正的代码在babel-plugin-idx中


## Babel macros

### 什么是Babel macros

Babel macros 是[babel-plugin-macros](https://github.com/kentcdodds/babel-plugin-macros)中出现的概念，可以理解为一种babel的宏。它是编译时代码转换成运行时代码的一个标准接口。

在babel进行编译的时候，babel-plugin-macros会对所有的模块进行遍历，查找以`.macro`结尾的引用，并将这些引用传递给`.marco`文件进行代码转换，用转换完的代码替换原来的引用。

如果宏是默认导出的，那么可以按照自己喜欢的方式对引用进行命名；如果是命名导出，也可以使用`as`语法重新命名。

### 使用Babel macros来处理idx

**Install**

```

npm install babel-plugin-macros --save-dev

// babel配置
{
  plugins: ['babel-plugin-macros'],
};

```

**macro**

```
// src/utils/idx.macro.js

const { createMacro } = require('babel-plugin-macros');
module.exports = createMacro(({ state, references }) => {
  references.default.forEach(referencePath => {
    idx_transform(referencePath.parentPath, state);
  });
});
```

**use**

```
// src/index.js

import idx from './utils/idx.macro';

function getFriends() {
  return idx(props, _ => _.user.friends[0].friends);
}
```

社区中已经有idx对应的marco，[idx.macro](https://github.com/dralletje/idx.macro)

### babel cache 引发的问题

在实际的项目中，我们会对babel-loader开启cache功能，所有使用babel-loader的文件进行缓存，以加快webpack编译的速度。

对于使用babel marco的文件，cache也是生效的。如果marco不是一个纯函数，编译的结果可能会和预期的结果有出入。

比如一个处理json文件的宏，目标的json文件已经修改了，但是使用宏的文件没有做任何代码的改动，那么还是会使用cache中的代码，即上一次解析未改动的json文件产生的结果。

解决方法可以直接关闭babel-loader的缓存功能，但是这个可能会影响项目的编译速度；第二种是在使用macro的地方增加一个注释，来告诉babel-loader这个地方需要重新编译。

## 如何编写一个marco

babel-plugin-marcos提供了一个实现宏的规范，但它还是基于babel来实现的。所以要开发一个marco，要对babel有一定的了解。

首先要熟悉babel，了解如何编写一个babel插件 [babel插件手册](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md)。

babel-plugin-marcos提供了官方的marco开发手册，[hand book for macros authors](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md)。

这里实现一个try-catch的marco

### try-catch.macro

在项目开发中经常会遇到一些错误没有抛出，导致无法定位问题。希望通过一种简单的方法来对函数进行`try catch`包装。

通过babel-plugin-marcos来进行按需的转换，而不是通过babel的插件进行全局的替换。

装饰器语法对于单纯的函数没法处理，所以这里就选用了flow的语法。使用flow的语法来对需要转换的方法进行标记，在语法方法可能不太符合flow的标准。

因为使用了flow的语法，所以要安装对应的preset，`npm install --save-dev @babel/preset-flow`。这里对于flow的使用可能不符合规范，只是为了简化操作。


```
// marco.js
const { createMacro } = require('babel-plugin-macros');

function macro({ babel, references, state }) {
  const { types, template } = babel;
  
  // babel的模板函数，生成最终的被try catch包裹的函数体
  const wrapFunctionWithTryCatch = template(`{
    try {
      BODY
    } catch(e) {
      console.error(e);
    }
  }`);

  references.TryCatch.forEach(reference => {
    const parentFunction = reference.getFunctionParent();

    if (!parentFunction) {
      return;
    }

    const body = parentFunction.node.body.body;

    if (!body || !body.length) {
      return;
    }
    
    // 对于已经被try catch包裹的函数不做处理
    if (body.length === 1 && types.isTryStatement(body[0])) {
      return;
    }

    // 使用模板函数替换老的函数体
    parentFunction.get('body').replaceWith(wrapFunctionWithTryCatch({
      BODY: body,
    }));

  });
}

module.exports = createMacro(macro)
```

marco需要是一个js的模块，通过`babel-plugin-macros`导出的createMacro方法对转换函数进行包裹并导出。

macro函数接受一个对象，其中三个常用的属性是babel、state和references。

- babel就是`babel-plugin-macros`模块，包含了babel的所有功能
- state是常规的babel插件中visitor的第二个参数
- references是模块中对marco的所有引用

**最终效果**


```
import { TryCatch } from 'try-catch.macro';

var a = (b): TryCatch => {
  return b;
}

class Test {

  print = (): TryCatch => {
    const data = this.getData();

    return data;
  }
}

    ↓ ↓ ↓ ↓ ↓ ↓

var a = (b) => {
  try {
    return b;
  } catch(e) {
    console.error(e);
  }
}

class Test {

  print = () => {
    try {
      const data = this.getData();

      return data;
    } catch(e) {
      console.log(e);
    }
  }
}
```

github仓库是 [try-catch.macro](https://github.com/JSupot/try-catch.macro) 


## 总结

babel-plugin-marcos给我们提供了另一种代码转换的思路，通过显式的引用实现代码的按需转换。

通过规范化的接口定义，保证了marco的开发规范。

通过编译时的代码转换，在某些场景下能够减少代码运行时的开销。

社区也有很多高质量的宏开源出来，基本上所有的css in js的方案都提供了对应的marco，减少了依赖的安装，代码更加直观。

## 链接

> [Babel macros](https://lihautan.com/babel-macros/)

> [babel插件手册](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md)

> [hand book for macros authors](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md)

> [awesome-babel-macros](https://github.com/jgierer12/awesome-babel-macros)
