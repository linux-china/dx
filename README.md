dx: A tool for writing better scripts with Deno
==========================================

# why a dx instead of zx

dx is based on Deno and with following pros:

* TypeScript friendly
* Easy to import third party modules, just `import {red, green} from "https://deno.land/std@0.95.0/fmt/colors.ts"`, no idea about zx to import third party npm(package.json???)
* I ❤️ Deno  :)

# Install

```bash
deno install -A --unstable -n dx https://denopkg.com/linux-china/dx/cli.ts
```

# Demo

```typescript
#!/usr/bin/env dx

import {$, cd, pwd, question, os, fs, env} from "https://denopkg.com/linux-china/dx/mod.ts";
import {red, yellow, blue, green} from "https://deno.land/std@0.95.0/fmt/colors.ts";

// prompt to input your name
let name = await question(blue("what's your name: "));
console.log("Hello ", blue(name ?? "guest"));

console.log("Current working directory:", pwd());

// current file count
const output = await $`ls -1 | wc -l`;
console.log("Files count: ", parseInt(output));

// your home dir
console.log("Your home: ", os.homedir());

// print your internet outbound ip
let json = await fetch('https://httpbin.org/ip').then(resp => resp.json());
console.log("Your ip: ", json.origin)
```

Then run `dx demo.ts` or `chmod u+x demo.ts ; ./demo.ts`'

# functions and variables

```typescript
import {$, cd, pwd, question, os, fs, env} from "https://denopkg.com/linux-china/dx/mod.ts";
```

* cd: change current working directory. `cd('../')` or `cd('~/')`
* pwd: get current working directory
* echo:  dump object as text on terminal
* question: read value from stdin with prompt
* os: OS related functions
* fs: file system related functions
* env: env variables

# execute command

Same with zx, example as following:

```typescript
let count = parseInt(await $`ls -1 | wc -l`)
console.log(`Files count: ${count}`)
```

**Attention:**: if exit code is not 0, and exception will be thrown.

```typescript
try {
    await $`exit 1`
} catch (p) {
    console.log(`Exit code: ${p.exitCode}`)
    console.log(`Error: ${p.stderr}`)
}
```

# color output

Deno std has `fmt/colors.ts` already, and you don't need chalk for simple cases.

```typescript
import {red, yellow, blue, green} from "https://deno.land/std@0.95.0/fmt/colors.ts";

console.log(green("Hello"));
```

# $ configuration

$.shell and $.prefix are same to zx

# packages

fs and os packages are same to zx, and use fs and os modules from https://deno.land/std@0.95.0/node

# Misc

* .env auto load
* Compile script into executable binary: `deno compile --unstable -A --lite demo.ts`

# References

* Google zx: https://github.com/google/zx
