#### 用 Reduce 实现 Promise 串行执行

````
function runPromiseByQueue(promises) {
  promises.reduce(
    (previousPromise, nextPromise) => previousPromise.then(() => nextPromise()),
    Promise.resolve()
  );
}

async function runPromiseByQueue(promises) {
  for (let value of promises) {
    await value();
  }
}

````

#### promise.all的实现

````
// 简单版本
Promise.all = function(promises) {
  let results = [];
  return new Promise(function(resolve) {
      promises.forEach(function(val) {
      // 按顺序执行每一个Promise操作
      val.then(function(res) {
        results.push(res);
      });
    });
    resolve(results);
  });
}

````
存在两个问题：

- Promise.all传递的参数可能不是Promise类型，可能不存在then方法。
- 如果中间发生错误，应该直接返回错误，不执行后面操作

完整版：

````
Promise.prototype.all = function(promises) => {
  const results = [];
  let count = 0;
  const promiseLength = promises.length;

  return new Promise((resolve, reject) => {
    for (let value of promises) {
      Promise.resolve(val).then((res) => {
        count++;
        results.push(res);
        if (count === promisesLength) {
          return resolve(results);
        }
      }, (err) => {
        return reject(err);
      })
    }
  })
}
````

#### promise.race的实现

````
Promise.prototype.race = function(promises) {
  return new Promise((resolve, reject) => {
    for (let value of promises) {
      Promise.resolve(value).then((res) => {
        return resolve(res);
      }, () => {
        return reject(reason)
      })
    }
  })
}
````

#### 使用promise.race实现超时操作

````
function fetchTimeout(url,timeout) {
  return new Promise((resolve, reject) => {
    Promise.race([
      fetch(url),
      new Promise((res, ret) => {
        setTimeout(() => {ret(new Error('request timeout))}, timeout)
      })
    ])
    .then((data) => {
      return resolve(data);
    }, (err) => {
      return reject(err);
    })
  });
}
````

#### promise.allSettled

promise.all存在短路问题，只要有一个promise 被reject，就会退出所有的promise数组。

allSettled方法会保存所有promise的状态。

````
Promise.prototype.allSettled = function(promises) {
  const results = [];
  let count = 0;
  const promiseLength = promises.length;

  return new Promise((resolve, reject) => {
    for (let value of promises) {
      Promise.resolve(val).then((res) => {
        count++;
        results.push({
          status: 'fulfilled',
          value: res
        });

        if (count === promisesLength) {
          return resolve(results);
        }
      }, (err) => {
        count++;
        results.push({
          status: 'rejected',
          value: err
        });

        if (count === promisesLength) {
          return reject(results);
        }
      })
    }
  })
}
````