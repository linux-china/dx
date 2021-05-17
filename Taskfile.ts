/// <reference lib="esnext" />
import {$, cd, pwd, question, os, fs, env, printf, glob, $a, echo} from "./mod.ts";
import {red, yellow, blue, green} from "https://deno.land/std@0.96.0/fmt/colors.ts";

export default hello;

export async function hello() {
    const output = await $`ls -1 | wc -l`;
    echo("Files count: ", parseInt(output));
}

hello.desc = "Hello task";

export async function first() {
    console.log(blue("first task"));
}
