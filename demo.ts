import {$, cd, pwd, question, os, fs, env, printf} from "./mod.ts";
import {red, yellow, blue, green} from "https://deno.land/std@0.95.0/fmt/colors.ts";

// prompt to input your name
let name = await question(blue("what's your name: "));
console.log("Hello ", blue(name ?? "guest"));

console.log("Current working directory:", pwd());

// current file count
const output = await $`ls -1 | wc -l`;
console.log("Files count: ", parseInt(output));

// print your internet outbound ip
let json = await fetch('https://httpbin.org/ip').then(resp => resp.json());
console.log("Your ip: ", json.origin)

//printf
printf("hello %s", "world");
