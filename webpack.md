- `WebpackOptionsDefaulter` 通过webpack.config来获取options，包括很多的默认配置
- 生成compiler实例
- 注册webpack.config中的plugins
- `WebpackOptionsApply` 根据配置项来初始化内部的plugin，核心是EntryOptionPlugin
- `EntryOptionPlugin` 注册entryOption这个钩子，判断是多入口还是单入口，以单入口为例
- `SingleEntryPlugin` 注册compilation和make这两个钩子
- `compiler.run` -> `compiler.compile`
- `compiler.newCompilationParams`  实例化normalModuleFactory和contextModuleFactory，normalModuleFactory用来处理正常的module，contextModuleFactory用来处理需要异步加载的模块，通过create方法会创建`NormalModule` 和 `ContextModule`，可以通过loaders将模块转成js文件
- `compiler.newCompilation` 生成本次的`compilation`对象，并触发hooks.compilation
- SingleEntryPlugin中的钩子被触发，normalModuleFactory被加入到dependencyFactories
- 执行`compiler.make` SingleEntryPlugin中的钩子被触发
- 执行`compilation.addEntry` make是一个AsyncParallelHook钩子，钩子的回调callback是addEntry的最后一个参数，当所有依赖都处理完成后去执行回调，触发compilation.finish
- addEntry从入口开始，遍历所有的依赖文件，生成compilation的依赖图
- `compilation._addModuleChain` 最后会触发compilation.hooks.succeedEntry
- `moduleFactory.create` 生成`NormalModule`类
- 触发NormalModuleFactory的beforeResolve、factory、resolver、afterResolve、createModule，和module，最后通过new NormalModule生成module的实例
- 通过create生成module实例后，执行回调中的buildModule方法
- 触发complication的buildModule，然后执行module实例的build方法，去执行doBuild方法。module使用的loaders是在NormalModuleFactory中的resolver()方法中解析生成的
- doBuild 中执行runLoaders，使用命中的loader去处理文件，最后生成转换后的文件和对应的AST
- 调用Parser的parse方法，对AST进行分析，找到module中其他的依赖，对于不同方式的依赖，webpack在lib/dependencies中做了对应的插件来处理
- 最后执行回调中的afterBuild方法，触发processModuleDependencies方法，去递归module的依赖
- processModuleDependencies在内部调用addModuleDependencies方法，不断递归每个module的依赖
- 依赖递归分析完成后，执行_addModuleChain中的回调函数，每个module解析完成都会触发触发succeedModule这个钩子，在所有依赖都分析完成后，会触发succeedEntry的钩子
- 至此compiler.make钩子执行完毕，此时所有依赖的module都已经拍平存放到compilation.modules中，在回调中执行compilation的finish方法
- finish方法会触发finishModules钩子，并在回调中执行Compilation的seal方法
- seal方法会先触发compilation的seal钩子
- 调用buildChunkGraph方法，生成依赖图
- 调用createHash方法生成本次构建中的hash、modulehash和chunkhash。在complication中，会初始化一些template对象，这些template对象用来生成最终的webpack输出文件。包含mainTemplate、chunkTemplate、moduleTemplates、hotUpdateChunkTemplate和runtimeTemplate
- mainTemplate用来渲染入口文件chunk的模板，chunkTemplate是动态引入的非入口文件的渲染模板，moduleTemplates是chunk中module的渲染模板
- createHash会使用本次构建生成的hash去更新所有模板中hash值，每个chunk都会生成对应的chunkhash，每个module都会生成对应的modulehash，然后本次构建也会生成complication的hash
- 调用createModuleAssets方法，遍历所有的modules，生成complication的assets对象
- 调用createChunkAssets方法，为每个chunk生成代码，并将生成的代码也放到complication的assets对象中
- 核心代码是调用mainTemplate的render方法，其中mainTemplate也定义了自己的hooks，在不同的hook中对源码进行修改，增加webpack需要的各种样板代码。在renderBootstrap中会触发不同的hook
- complication全部hook执行完毕后，seal的回调会触发compiler的afterCompile钩子，并在回调中执行定义的onCompiled方法，执行emitAssets方法，触发compiler的emit钩子，在回调中触发afterEmit钩子，最后回调触发done这个钩子，全部的构建就结束了。

#### modules生成chunks

- ChunkGroup: 内部维护了 chunks、children、parents3 个数组，并添加了一系列方法来维护这 3 个数组。chunks表示这个group下面拥有多少chunk
- Chunk：内部维护了 groups、modules 数组。groups表示此 chunk 存在于哪些 chunkgroup 中；modules表示此 chunk 内部含有多少 module
- Module：内部维护了 chunks 数组。chunks表示此 module 存在于哪些 chunks 当中

#### require.ensure和动态import()

对于require.ensure，会在parser解析语法树的时候去MemberExpression的参数是否为require.ensure，在RequireEnsurePlugin这个插件中，注册parser的evaluateTypeof和typeof钩子去处理require.ensure。

对于动态import()，会在parser解析的过程中去处理expression.callee，如果type为import，会触发parser的importCall钩子。对应的会在ImportParserPlugin插件中去注册importCall，webpack会把import()语法转换成promise，所以使用import()需要支持promise，否则代码在运行时会报错。

#### Dependency(依赖)

在生成(build)一个module的时候，会通过parser去解析AST，然后找到这个模块所有的依赖，这些依赖就是Dependency

Dependency(依赖)在经过工厂对象（Factory）创建之后，就会生成对应的模块实例。webpack主要的工厂对象有normalModuleFactory和contextModuleFactory。webpack/lib/dependencies中包含了webpack所有支持的依赖类型。每个依赖类型都继承于基类Dependency，Dependency 十分简单，内部只有一个 module 属性来记录最终生成的模块实例。比如从 CommonJS 中require一个模块，那么会先生成 CommonJSRequireDependency

每个Dependecy派生类在使用前，都会确定对应的工厂对象，这些工厂对象的信息信息全部是记录在 Compilation 对象的 dependencyFactories 属性中。比如SingleEntryDependency 对应的工厂对象是 NormalModuleFactory

````
class SingleEntryPlugin {

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"SingleEntryPlugin",
			(compilation, { normalModuleFactory }) => {
        // 这里记录了 SingleEntryDependency 对应的工厂对象是 NormalModuleFactory
				compilation.dependencyFactories.set(
					SingleEntryDependency,
					normalModuleFactory
				);
			}
		);

		compiler.hooks.make.tapAsync(
			"SingleEntryPlugin",
			(compilation, callback) => {
				const { entry, name, context } = this;

        // 入口的模块会先变成一个 Dependency 对象
				const dep = SingleEntryPlugin.createDependency(entry, name);
				compilation.addEntry(context, dep, name, callback);
			}
		);
	}

  class Compilation extends Tapable {
    _addModuleChain(context, dependency, onModule, callback) {
        // 其他代码..
        // 开始构建时，通过 Compilation 的 dependenciesFactories 属性找到对应的工厂对象
        const Dep = /** @type {DepConstructor} */ (dependency.constructor);
		    const moduleFactory = this.dependencyFactories.get(Dep);
        if(!moduleFactory) {
            throw new Error(`No dependency factory available for this dependency type: ${dependency.constructor.name}`);
        }
        this.semaphore.acquire(() => {
            // 调用工厂对象的 create 方法，dependency作为参数传入，最终生成模块实例
            moduleFactory.create({
                contextInfo: {
                    issuer: "",
                    compiler: this.compiler.name
                },
                context: context,
                dependencies: [dependency] // 作为参数传入
            }, (err, module) => {
                // module就是生成的模块实例
                // 其他代码..
            })
        })
    }
}

````

#### module(模块)

每个Dependency通过对应的工厂方法实例化后，执行build方法生成module，调用module的build方法，用loaders对module进行处理。

loaders处理完以后，module的源码放在_source对象中，parser解析出来的依赖分别记录在 variables，dependencies， blocks属性。模块构建之后的递归构建过程，其实就是读取这三个属性来重复上面的过程：依赖 => 工厂 => 模块。

Module 类实际上才是我们平常用来跟 chunk 打交道的类对象，它内部有 _chunks 属性来记录后续所在的 chunk 信息，并且提供了很多相关的方法来操作这个对象：addChunk，removeChunk，isInChunk，mapChunks等。

Module类继承于DependenciesBlock。这个是所有模块的基类，它包含了处理依赖所需要的属性和方法。上面所说的 variables，dependencies，blocks 也是这个基类拥有的三个属性。

- variables 对应需要对应的外部变量，比如 __filename，__dirname，process 等node环境下特有的变量
- dependencies 对应需要解析的其他普通模块，比如 require("./a") 中的 a 模块会先生成一个 CommonJSRequireDependency
- blocks 对应需要解析的代码块（最终会对应成一个 chunk），比如 require.ensure("./b")，这里的 b 会生成一个 DependenciesBlock 对象

Module类常见的两个派生类是NormalModule 和 ContextModule。

#### chunk

chunk只有一个Chunk类，用_modules来保存chunk中所有的module,并且提供了很多方法来操作：addModule，removeModule，mapModules等

- integrate 用来合并其他chunk
- split 用来生成新的子 chunk
- hasRuntime 判断是否是入口 chunk

#### Template

chunk和module最终渲染输出都是通过Template来进行的。Compilation有下面几个属性：

- mainTemplate 对应 MainTemplate 类，用来渲染入口 chunk
- chunkTemplate 对应 ChunkTemplate 类，用来传染非入口 chunk
- moduleTemplate 对应 ModuleTemplate，用来渲染 chunk 中的模块
- dependencyTemplates 记录每一个依赖类对应的模板

Template类通过render方法来进行文件的生成。对于chunk中的modules，是通过renderChunkModules来进行渲染的。

这里的 renderChunkModules 是由他们的基类 Template 类提供，方法会遍历 chunk 中的模块，然后使用 ModuleTemplate 来渲染。

````
class Template {
  ...

  static renderChunkModules(
		chunk,
		filterFn,
		moduleTemplate,
		dependencyTemplates,
		prefix = ""
	) {
    ...

    /** @type {{id: string|number, source: Source|string}[]} */
		const allModules = modules.map(module => {
			return {
				id: module.id,
				source: moduleTemplate.render(module, dependencyTemplates, {
					chunk
				})
			};
		});
		if (removedModules && removedModules.length > 0) {
			for (const id of removedModules) {
				allModules.push({
					id,
					source: "false"
				});
			}
		}

    ...
  }

  ...
}
````

ModuleTemplate 做的事情跟 MainTemplate 类似，它同样只是生成”包装代码”来封装真正的模块代码，而真正的模块代码，是通过模块实例的 source 方法来提供。该方法会先读取 _source 属性，即模块内部构建时应用loaders之后生成的代码，然后使用 dependencyTemplates 来更新模块源码。

dependencyTemplates 是 Compilation 对象的一个属性，它跟 dependencyFactories 同样是个 Map 对象，记录了所有的依赖类对应的模板类。