import {$, cd, pwd, question, os, fs, env, printf, glob, $1, alias,echo} from "./mod.ts";
import {red, yellow, blue, green} from "https://deno.land/std@0.95.0/fmt/colors.ts";

// aliases
alias("ll", "ls -al");

// prompt to input your name
let name = await question(blue("what's your name: "));
echo("Hello ", blue(name ?? "guest"));

// pwd() and env variables
echo("Current working directory:", pwd());
echo("Your home:", HOME);
echo("Your name:", USER);

// current file count
const output = await $`ls -1 | wc -l`;
echo("Files count: ", parseInt(output));

// output as lines
for await (const fileName of $1`ls -1 *.ts`) {
    echo("TS file: ", fileName);
}

// alias and output as lines
for await (const fileName of $1`ll *.ts`) {
    echo("TS file: ", fileName);
}

// print your internet outbound ip
let json = await fetch('https://httpbin.org/ip').then(resp => resp.json());
echo("Your ip: ", json.origin)

//printf
printf("hello %s\n", "world");

//glob *.ts
for await (const fileName of glob("*.ts")) {
    echo(`${pwd()}/${fileName}`);
}
