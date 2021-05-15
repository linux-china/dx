import {$, cd, pwd, question, os, fs, env, printf, glob, $1} from "./mod.ts";
import {red, yellow, blue, green} from "https://deno.land/std@0.95.0/fmt/colors.ts";

// prompt to input your name
let name = await question(blue("what's your name: "));
console.log("Hello ", blue(name ?? "guest"));

console.log("Current working directory:", pwd());

// current file count
const output = await $`ls -1 | wc -l`;
console.log("Files count: ", parseInt(output));

// output as lines
for await (const fileName of $1`ls -1 *.ts`) {
    console.log("TS file: ", fileName);
}

// print your internet outbound ip
let json = await fetch('https://httpbin.org/ip').then(resp => resp.json());
console.log("Your ip: ", json.origin)

//printf
printf("hello %s", "world");

//glob *.ts
for await (const fileName of glob("*.ts")) {
    console.log("file: ", fileName);
}
