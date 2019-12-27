
>原文地址：https://jakearchibald.com/2017/es-modules-in-browsers/#nomodule-for-backwards-compatibility


### 前言
ES模块已经在下面的浏览器中得到支持：
- Safari >=10.1
- Chrome >= 61
- Firefox >= 60
- Edge >= 16

```javascript
<script type="module">
  import {addTextToBody} from './utils.mjs';

  addTextToBody('Modules are pretty cool.');
</script>
```

```javascript
// utils.mjs
export function addTextToBody(text) {
  const div = document.createElement('div');
  div.textContent = text;
  document.body.appendChild(div);
}
```

[在线示例](https://cdn.rawgit.com/jakearchibald/a298d5af601982c338186cd355e624a8/raw/aaa2cbee9a5810d14b01ae965e52ecb9b2965a44/)

你只需要在script标签上加上`type=module`的属性，浏览器就会将内联代码或者外部引用的脚本视为ECMAScript模块。

关于ECMAScript模块已经有很多非常棒的[文章](https://ponyfoo.com/articles/es6-modules-in-depth)了，但是我想分享一些我在测试和阅读规范时学到的一些在浏览器中才有的一些特性。

#### 不支持 "Bare" 导入符

```javascript
// Supported:
import {foo} from 'https://jakearchibald.com/utils/bar.mjs';
import {foo} from '/utils/bar.mjs';
import {foo} from './bar.mjs';
import {foo} from '../bar.mjs';

// Not supported:
import {foo} from 'bar.mjs';
import {foo} from 'utils/bar.mjs';
```
有效的模块路径符必须与下面之一匹配：

- 完整的非相对的URL。比如，将模块符传入new URL(moduleSpecifier)中不会报错。
- 以`/`开头
- 以`./`开头
- 以`../`开头

#### nomodule可以作为回退机制

```javascript
<script type="module" src="module.mjs"></script>
<script nomodule src="fallback.js"></script>
```

[在线示例](https://cdn.rawgit.com/jakearchibald/6110fb6df717ebca44c2e40814cc12af/raw/7fc79ed89199c2512a4579c9a3ba19f72c219bd8/)

所有支持`type=module`的浏览器会忽略具有nomodule的script标签。对于那些不支持ES 模块的浏览器，他们会下载`type=module`和nomodule的资源，但是不会执行`type=module`的代码。这意味着你可以将ES模块的代码提供给支持ECMAScript模块的模块，同时为不支持模块的浏览器提供一个回退方案。

**浏览器存在的问题**

- ~~Firefox 不支持nomodule([issue](https://bugzilla.mozilla.org/show_bug.cgi?id=1330900))~~ Firefox已经修复
- ~~Edge 不支持nomodule([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10525830/))~~ Edge 16已经修复
- ~~Safari 10.1 不支持nomodule([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10525830/))~~ Safari 11已经修复。对于10.1，可以使用这个[方法](https://gist.github.com/samthor/64b114e4a4f539915a95b91ffd340acc)来修复。
  

#### 默认使用defer来加载资源

```javascript
<!-- This script will execute after… -->
<script type="module" src="1.mjs"></script>

<!-- …this script… -->
<script src="2.js"></script>

<!-- …but before this script. -->
<script defer src="3.js"></script>
```

[在线示例](https://cdn.rawgit.com/jakearchibald/d6808ea2665f8b3994380160dc2c0bc1/raw/c0a194aa70dda1339c960c6f05b2e16988ee66ac/)

上面代码的执行顺序为`2.js`、`1.mjs`、`3.js`。

在获取js资源的时候会阻塞HTML的解析。对于常规的script标签，可以使用defer属性来防止js脚本阻塞HTML的解析，并且这些脚本会在HTML解析完成后依次去执行。`type=module`的script标签在行为上和defer类型，脚本在加载的时候不会阻塞HTML的解析。

`type=module`的script标签在执行顺序上也和常规script标签使用defer时相同。

#### 内联代码也是defer的

```javascript
<!-- This script will execute after… -->
<script type="module">
  addTextToBody("Inline module executed");
</script>

<!-- …this script… -->
<script src="1.js"></script>

<!-- …and this script… -->
<script defer>
  addTextToBody("Inline script executed");
</script>

<!-- …but before this script. -->
<script defer src="2.js"></script>
```

[在线示例](https://cdn.rawgit.com/jakearchibald/7026f72c0675898196f7669699e3231e/raw/fc7521aabd9485f30dbd5189b407313cd350cf2b/)

上面代码的执行顺序为`1.js`、内联的script、内联的module、`2.js`。

常规的script脚本会忽略defer属性，但是内联的module脚本始终都是defer的，无论他们是都有引入内容。

#### async属性适用于module，不管是外部引用还是内联标签

```javascript
<!-- This executes as soon as its imports have fetched -->
<script async type="module">
  import {addTextToBody} from './utils.mjs';

  addTextToBody('Inline module executed.');
</script>

<!-- This executes as soon as it & its imports have fetched -->
<script async type="module" src="1.mjs"></script>
```
[在线示例](https://module-script-tests-sreyfhwvpq.now.sh/async)

上面的例子中，先完成下载的脚本会先执行。

对于常规的脚本来说，async属性会导致脚本的下载不会阻塞HTML的解析，并且在下载完成后立即执行，如果这时候HTML还没有解析完成，会阻塞HTML的解析。和常规脚本不同的地方在于，内联的module脚本也支持async属性。

如果所有的script标签都使用async属性的话，脚本的执行顺序可能和他们在DOM中定义的顺序不同。

**浏览器存在的问题**

- ~~Firefox 不支持内联的module脚本的async属性([issue](https://bugzilla.mozilla.org/show_bug.cgi?id=1361369))~~ Firefox 59中已经修复。

####  ECMAScript 模块只会执行一次

```javascript
<!-- 1.mjs only executes once -->
<script type="module" src="1.mjs"></script>
<script type="module" src="1.mjs"></script>
<script type="module">
  import "./1.mjs";
</script>

<!-- Whereas classic scripts execute multiple times -->
<script src="2.js"></script>
<script src="2.js"></script>
```

[在线示例](https://cdn.rawgit.com/jakearchibald/f7f6d37ef1b4d8a4f908f3e80d50f4fe/raw/1fcedde007a2b90049a7ea438781aebe69e22762/)

如果你了解ES module，你会知道对于多次引入同一个模块，但是它们只会执行一次。这同样适用于HTML中的脚本模块--通过url引入的module脚本在每个页面中只会执行一次。

**浏览器存在的问题**

- Edge会多次执行模块([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865922/))。已经修复，但还没有发布，预计会随着Edge 17一起发布（作者写文章的时候Edge 17还没发布）。

#### 总是存在CORS

```javascript
<!-- This will not execute, as it fails a CORS check -->
<script type="module" src="https://….now.sh/no-cors"></script>

<!-- This will not execute, as one of its imports fails a CORS check -->
<script type="module">
  import 'https://….now.sh/no-cors';

  addTextToBody("This will not execute.");
</script>

<!-- This will execute as it passes CORS checks -->
<script type="module" src="https://….now.sh/cors"></script>
```

[在线示例](https://cdn.rawgit.com/jakearchibald/2b8d4bc7624ca6a2c7f3c35f6e17fe2d/raw/fe04e60b0b7021f261e79b8ef28b0ccd132c1585/)

与常规脚本不同，module的脚本总是通过CORS来获取。这意味着所有的跨域module脚本必须返回有效的CORS请求头，比如`Access-Control-Allow-Origin: *`。

**浏览器存在的问题**

- Firefox无法运行上面的示例([issue](https://bugzilla.mozilla.org/show_bug.cgi?id=1361373))。
- Edge 会加载没有CORS头部信息的module脚本([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865934/))。Edge 16已经修复

#### 不需要认证

```javascript
<!-- Fetched with credentials (cookies etc) -->
<script src="1.js"></script>

<!-- Fetched without credentials -->
<script type="module" src="1.mjs"></script>

<!-- Fetched with credentials -->
<script type="module" crossorigin src="1.mjs?"></script>

<!-- Fetched without credentials -->
<script type="module" crossorigin src="https://other-origin/1.mjs"></script>

<!-- Fetched with credentials-->
<script type="module" crossorigin="use-credentials" src="https://other-origin/1.mjs?"></script>
```
[在线示例](https://module-script-tests-sreyfhwvpq.now.sh/cookie-page)

对于来自同一个源的请求，大多数基于CORS的API将会发送凭据(cookie等)，但是fetch()和module脚本是一个例外。除非你需要，他们是不会携带凭据的。

你可以通过添加crossorigin属性将凭据添加到同源的模块中（原文作者对此并不认同）。如果你想讲凭据发送到其他的源，可以使用`crossorigin="use-credentials"`。请注意，另一个源的响应头中必须增加`Access-Control-Allow-Credentials: true`这个字段。

此外，还有一个和"模块只执行一次"这个规则有关的问题。通过URL来获取模块脚本，如果你请求一个模块没有带上凭据，然后带上凭据再去请求一次这个模块，你将获得相同的无凭据模块。这就是我为什么在URL后面增加一个`?`，是的他们保证唯一性。

**update**：上面的情况可能很快就会改变。在默认情况下，fetch()和module脚本都会将凭据发送到同源的URL。[issue](https://github.com/whatwg/fetch/pull/585)

**浏览器存在的问题**

- ~~Chrome 会使用凭据去请求同源的模块脚本([issue](https://bugs.chromium.org/p/chromium/issues/detail?id=717525))~~ 。Chrome 61中已经修复。
- Safari中即使设置了`crossorigin`属性也不会在请求同源的module脚本时带上凭据([issue](https://bugs.webkit.org/show_bug.cgi?id=171550))
- ~~Edge 中即使是用来`crossorigin`属性也不会携带凭据([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865956/))~~。Edge 16中已经修复。
- Edge 请求同源的module脚本时会带上凭据([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865956/))

#### MIME类型

与常规的script脚本不同，module脚本必须提供一个有效的JavaScript MIME类型，否则他们讲不会被执行。HTML标准推荐使用`text/javascript`。

[在线示例](https://module-script-tests-sreyfhwvpq.now.sh/mime)

**浏览器存在的问题**

- Edge 将会执行那么带有非法MIME类型的module脚本([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865977/))

这就是我目前所学到的。毋庸置疑，我对浏览器支持ES module刚到非常兴奋。

#### 性能优化建议，动态导入等

查看[相关文章](https://developers.google.com/web/fundamentals/primers/modules#other-features)，深入了解ES module的使用情况。

### 译者语

ES module 与 常规script的区别：

- ES module默认运行在严格模式下，不用手动添加`use strict`
- 全局变量`this`为`undefined`
- 模块中的顶层变量是模块的局部变量，不会污染全局作用域

关于ES module在浏览器中的支持，我们可以有更多的思考。

因为对于ES module的支持，需要特定版本的浏览器，这些浏览器在支持ES module的同时，还实现和支持了很多ES6中的语法和新的API。比如这些浏览器原生支持Promise、Set、Map等。

因为nomodule的回退机制，我们可以为网站提供两份代码。一份使用ES module，一份为常规的js文件。

对于ES module的文件，在语法方面可以尽量少的去做转译，保留ES6新的语法结构，这使得文件不仅在体积上有很客观的减少，还能减少脚本文件的解析和执行时间。对于polyfill文件，也能删除Promise等已经默认支持的API垫片文件。

对于不支持ES module的浏览器，会提供一份ES5的回退代码，使得页面在老版本的浏览器中也能正常打开。低版本存在的一个问题是对于ES module的文件它也会去下载，但是不会执行，这可能会增加用户的等待时间和更多的流量使用。

关于ES module的实现，@babel/preset-env已经提供了对应的targets: `{ esmodules: true }`，设置完以后，babel在语法转换和polyfill文件的生成都会去做特定的处理。

vue-cli已经提供了modern模式去支持，感兴趣的同学可以去尝试一下。