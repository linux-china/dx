import {readLines} from "https://deno.land/std@0.96.0/io/bufio.ts";
import {delay} from "https://deno.land/std@0.96.0/async/mod.ts";
import {parse} from "https://deno.land/std@0.96.0/flags/mod.ts";
import * as os from 'https://deno.land/std@0.96.0/node/os.ts';
import * as nodeFs from 'https://deno.land/std@0.96.0/node/fs.ts';
import "https://deno.land/x/dotenv/load.ts";

export * as os from 'https://deno.land/std@0.96.0/node/os.ts';
export {printf} from 'https://deno.land/std@0.96.0/fmt/printf.ts';

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const aliases: string[] = [];

declare global {
    const HOME: string;
    const SHELL: string;
    const PATH: string;
    const TERM: string;
    const TMPDIR: string;
    const USER: string;
    const IFS: string;
    const PS1: string;
    const PS2: string;
    const $0: string | undefined;
    const $1: string | undefined;
    const $2: string | undefined;
    const $3: string | undefined;
    const $4: string | undefined;
    const $5: string | undefined;
    const $6: string | undefined;
    const $7: string | undefined;
    const $8: string | undefined;
    const $9: string | undefined;
}

interface Env {
    get(key: string): string | undefined;

    set(key: string, value: string): void;

    delete(key: string): void;

    toObject(): { [index: string]: string; }
}

export const env = Deno.env as Env;

interface ProcessOutput {
    readonly exitCode: number
    readonly stdout: string
    readonly stderr: string
}

interface CmdContext {
    (pieces: TemplateStringsArray, ...args: string[]): Promise<string>

    shell: string
    prefix: string

    [name: string]: any
}

/**
 * execute given command
 *
 * @throws {ProcessOutput} ProcessOutput's exception if exit code is not 0
 * @return {Promise<string>} stdout as string if exit code is 0
 */
export const $: CmdContext = async function (pieces: TemplateStringsArray, ...args: Array<unknown>): Promise<string> {
    let compiled = pieces[0], i = 0;
    for (; i < args.length; i++) compiled += args[i] + pieces[i + 1];
    for (++i; i < pieces.length; i++) compiled += pieces[i];
    const p = Deno.run({
        cmd: [$.shell],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped"
    });
    if (aliases) {
        let expandAliases = ""
        if ($.shell.endsWith("bash")) {
            expandAliases = "shopt -s expand_aliases;"
        } else if ($.shell.endsWith("zsh")) {
            expandAliases = "setopt aliases;";
        }
        await p.stdin?.write(textEncoder.encode(expandAliases + aliases.join(" ") + "\n"));
    }
    await p.stdin?.write(textEncoder.encode($.prefix + compiled));
    await p.stdin?.close();
    const [status, stdout, stderr] = await Promise.all([
        p.status(),
        p.output(),
        p.stderrOutput()
    ]);
    p.close();
    if (status.code === 0) {
        return textDecoder.decode(await stdout);
    } else {
        throw {
            exitCode: status.code,
            stdout: textDecoder.decode(await stdout),
            stderr: textDecoder.decode(await stderr)
        };
    }
}

export const $a = async function* (pieces: TemplateStringsArray, ...args: Array<unknown>) {
    let compiled = pieces[0], i = 0;
    for (; i < args.length; i++) compiled += args[i] + pieces[i + 1];
    for (++i; i < pieces.length; i++) compiled += pieces[i];
    const p = Deno.run({
        cmd: [$.shell],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped"
    });
    if (aliases) {
        let expandAliases = ""
        if ($.shell.endsWith("bash")) {
            expandAliases = "shopt -s expand_aliases;"
        } else if ($.shell.endsWith("zsh")) {
            expandAliases = "setopt aliases;";
        }
        await p.stdin?.write(textEncoder.encode(expandAliases + aliases.join(" ") + "\n"));
    }
    await p.stdin?.write(textEncoder.encode($.prefix + compiled));
    await p.stdin?.close();
    const [status, stdout, stderr] = await Promise.all([
        p.status(),
        p.output(),
        p.stderrOutput()
    ]);
    p.close();
    if (status.code === 0) {
        let output = textDecoder.decode(await stdout);
        let lines = output.match(/[^\r\n]+/g);
        if (lines) {
            for (let line of lines) {
                if (line) {
                    yield line
                }
            }
        }
    } else {
        throw {
            exitCode: status.code,
            stdout: textDecoder.decode(await stdout),
            stderr: textDecoder.decode(await stderr)
        };
    }
}

$.shell = "bash";
$.prefix = "set -euo pipefail;";
$['@'] = "goood"

export function cd(path: string) {
    if (path.startsWith("~")) {
        path = os.homedir() + path.substr(1);
    }
    Deno.chdir(path);
}

export function pwd(): string {
    return Deno.cwd();
}

export const echo = console.log;

export async function question(prompt: string) {
    return read(prompt);
}

export async function read(prompt: string) {
    await Deno.stdout.write(textEncoder.encode(prompt));
    for await (const line of readLines(Deno.stdin)) {
        return line;
    }
}

/**
 * read text file as string
 *
 * @param fileName file name
 */
export function cat(fileName: string): string {
    return Deno.readTextFileSync(fileName);
}

export function alias(name: string, command: string) {
    aliases.push(`alias ${name}='${command}';`)
}

export async function sleep(interval: string | number) {
    if (typeof interval === "number") {
        return delay(interval);
    } else {
        let unit = interval.substring(interval.length - 1, interval.length);
        let count = parseFloat(interval.substring(0, interval.length - 1));
        if (unit === "m") {
            return delay(count * 60);
        } else if (unit == "h") {
            return delay(count * 3600);
        } else if (unit == "d") {
            return delay(count * 24 * 3600)
        } else {
            return delay(count);
        }
    }
}

export async function* glob(pattern: string) {
    let output = await $`ls -1 ${pattern}`
    let lines = output.match(/[^\r\n]+/g);
    if (lines) {
        for (let line of lines) {
            if (line) {
                yield line
            }
        }
    }
}

export function getops(keys?: string): { [name: string]: string } {
    let pairs = parse(Deno.args);
    if (keys) {
        let temp: { [name: string]: string } = {}
        keys.split(":").forEach(key => {
            if (key in pairs) {
                temp[key] = pairs[key];
            }
        })
        return temp;
    }
    return pairs;
}

export const fs = {...nodeFs, ...nodeFs.promises};

// env variables to global
Object.assign(window, Deno.env.toObject());

// shell parameters to global, from $0 to $9
let args: { [name: string]: string } = {};
if (Deno.mainModule.endsWith("/dx/cli.ts")) { // launched by dx, such as `./demo.ts xx`
    Deno.args.forEach(function (value, i) {
        let key = "$" + i.toString();
        args[key] = value;
    });
    $['@'] = Deno.args.slice(1);
    $['#'] = Deno.args.length-1;
    $['*'] = Deno.args.slice(1).join(" ");
} else { // launched by deno, such as `deno run -A --unstable demo.ts xx`
    args["$0"] = Deno.mainModule;
    Deno.args.forEach(function (value, i) {
        let key = "$" + (i + 1).toString();
        args[key] = value;
    });
    $['@'] = Deno.args;
    $['#'] = Deno.args;
    $['*'] = Deno.args.join(" ");
}
Object.assign(window, args);


