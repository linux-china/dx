dx: A tool for writing better scripts with Deno
==========================================

# 为何要创建一个dx，zx不就行了吗？

Google zx是基于Node.js的，而dx是基于Deno，这两者核心的区别就是加载第三方开发包的方式不一样，zx目前不能加载第三方开发包(没有package.json文件)， 而dx则没有问题，直接import Deno开发包就可以。

# functions and variables

```typescript
import {$, cd, pwd, question, os, fs, env} from "./mod.ts";
```

* cd: change current working directory. `cd('../')` or `cd('~/')`
* pwd: get current working directory
* question: read value from stdin with prompt
* os: OS related functions
* fs: file system related functions
* env: env variables

# execute command

使用zx标准的 $`command` 完全一致，如下：

```typescript
let count = parseInt(await $`ls -1 | wc -l`)
console.log(`Files count: ${count}`)
```

**注意:**: 如果命令行执行结果为非0，则会抛出ProcessOutput异常，和zx标准一致。

```typescript
try {
    await $`exit 1`
} catch (p) {
    console.log(`Exit code: ${p.exitCode}`)
    console.log(`Error: ${p.stderr}`)
}
```

# color output

Deno官方std开发包已经提供了`fmt/colors.ts`来进行文本的颜色输出，所以我们不再需要chalk啦。 样例代码如下：

```typescript
import {red, yellow, blue, green} from "https://deno.land/std@0.95.0/fmt/colors.ts";

console.log(green("Hello"));
```

# fs package

这个其实就是将Deno中和文件系统相关的API进行一个归类。

# os package

这个和zx类似

# $.shell

这是脚本使用的shell，默认为bash，你可以通过`wich bash`获取bash的路径地址

# $.prefix

在每一个运行的命令行添加一个前缀，默认为 `set -euo pipefail;`


# References

* Google zx: https://github.com/google/zx
