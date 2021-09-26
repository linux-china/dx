import {readLines} from "https://deno.land/std@0.108.0/io/bufio.ts";
import {delay} from "https://deno.land/std@0.108.0/async/mod.ts";
import {parse} from "https://deno.land/std@0.108.0/flags/mod.ts";
import * as os from 'https://deno.land/std@0.108.0/node/os.ts';
import * as nodeFs from 'https://deno.land/std@0.108.0/node/fs.ts';
import * as stdFs from "https://deno.land/std@0.108.0/fs/mod.ts";
import "https://deno.land/x/dotenv@v2.0.0/load.ts";

export * as os from 'https://deno.land/std@0.108.0/node/os.ts';
export {printf} from 'https://deno.land/std@0.108.0/fmt/printf.ts';

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

    interface Promise<T> {
        lines(): AsyncGenerator<T, void, void>;

        result(): Promise<ProcessOutput>;
    }
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
    readonly stdout?: string
    readonly stderr?: string
}

interface CmdContext {
    (pieces: TemplateStringsArray, ...args: string[]): Promise<string>

    shell: string
    prefix: string
    export: (name: string, value: string) => void
    alias: (name: string, value: string) => void
    awk: string
    grep: string

    // deno-lint-ignore no-explicit-any
    [name: string]: any
}

function compileTemplate(pieces: TemplateStringsArray, ...args: Array<unknown>): string {
    let compiled = pieces[0], i = 0;
    for (; i < args.length; i++) compiled += args[i] + pieces[i + 1];
    for (++i; i < pieces.length; i++) compiled += pieces[i];
    return compiled;
}

function executeCommand(outputMode: "piped" | 'inherit' | 'null', pieces: TemplateStringsArray, ...args: Array<unknown>): Promise<[Deno.ProcessStatus, Uint8Array, Uint8Array] | Deno.ProcessStatus> {
    return executeCommandLine(outputMode, compileTemplate(pieces, ...args));
}

async function executeCommandLine(outputMode: "piped" | 'inherit' | 'null', commandLine: string): Promise<[Deno.ProcessStatus, Uint8Array, Uint8Array] | Deno.ProcessStatus> {
    const p = Deno.run({
        cmd: [$.shell],
        stdin: "piped",
        stdout: outputMode,
        stderr: outputMode
    });
    // expand aliases
    if (aliases) {
        let expandAliases = ""
        if ($.shell.endsWith("bash")) {
            expandAliases = "shopt -s expand_aliases;"
        } else if ($.shell.endsWith("zsh")) {
            expandAliases = "setopt aliases;";
        }
        await p.stdin?.write(textEncoder.encode(expandAliases + aliases.join(" ") + "\n"));
    }
    // env variables
    const envDeclares = Object.entries(env.toObject()).map((pair) => {
        return `${pair[0]}="${pair[1]}";`;
    }).join(" ");
    await p.stdin?.write(textEncoder.encode(envDeclares + "\n"));
    await p.stdin?.write(textEncoder.encode($.prefix + commandLine));
    await p.stdin?.close();
    let result: any;
    if (outputMode === "piped") {
        result = await Promise.all([
            p.status(),
            p.output(),
            p.stderrOutput()
        ]);
    } else {
        result = await p.status();
    }
    p.close();
    return result;
}

/**
 * execute given command
 *
 * @throws {ProcessOutput} ProcessOutput's exception if exit code is not 0
 * @return {Promise<string>} stdout as string if exit code is 0
 */
export const $: CmdContext = async function (pieces: TemplateStringsArray, ...args: Array<unknown>): Promise<string> {
    const [status, stdout, stderr] = await executeCommand("piped", pieces, ...args) as [Deno.ProcessStatus, Uint8Array, Uint8Array];
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

export async function nothrow(result: Promise<string>): Promise<ProcessOutput> {
    try {
        const stdout = await result;
        return {
            exitCode: 0,
            stdout: stdout
        }
    } catch (e: unknown) {
        const e1 = e as ProcessOutput;
        return {
            exitCode: e1.exitCode,
            stdout: e1.stdout,
            stderr: e1.stderr
        }
    }
}

async function* outputAsLines(commandLine: string) {
    const [status, stdout, stderr] = await executeCommandLine("piped", commandLine) as [Deno.ProcessStatus, Uint8Array, Uint8Array];
    // noinspection DuplicatedCode
    if (status.code === 0) {
        const output = textDecoder.decode(await stdout);
        const lines = output.match(/[^\r\n]+/g);
        if (lines) {
            for (const line of lines) {
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

export const $a = async function* (pieces: TemplateStringsArray, ...args: Array<unknown>) {
    const commandLine = compileTemplate(pieces, ...args);
    for await (const line of outputAsLines(commandLine)) {
        yield line;
    }
}

Promise.prototype.lines = async function* (this: Promise<string>): AsyncGenerator<string, void, void> {
    const output: string = await this;
    const lines = output.match(/[^\r\n]+/g);
    if (lines) {
        for (const line of lines) {
            yield line
        }
    }
};

Promise.prototype.result = async function (this: Promise<string>): Promise<ProcessOutput> {
    try {
        const output: string = await this;
        return {
            exitCode: 0,
            stderr: "",
            stdout: output
        }
    } catch (e) {
        return e as ProcessOutput;
    }
};

export const $o = async function (pieces: TemplateStringsArray, ...args: Array<unknown>) {
    const status = await executeCommand("inherit", pieces, ...args) as Deno.ProcessStatus;
    if (status.code !== 0) {
        throw {
            exitCode: status.code,
            stdout: "",
            stderr: ""
        };
    }
}

$.shell = "bash";
$.prefix = "set -euo pipefail;"; // strict mode
$.export = (name: string, value: string): void => {
    env.set(name, value);
}
$.alias = (name: string, command: string): void => {
    aliases.push(`alias ${name}='${command}';`)
}
$.awk = "awk";
$.grep = "grep";

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
    await Deno.stdout.write(textEncoder.encode(prompt));
    for await (const line of readLines(Deno.stdin)) {
        return line;
    }
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

export async function sleep(interval: string | number): Promise<void> {
    if (typeof interval === "number") {
        return await delay(interval);
    } else {
        const unit = interval.substring(interval.length - 1, interval.length);
        const count = parseFloat(interval.substring(0, interval.length - 1));
        if (unit === "m") {
            return await delay(count * 60);
        } else if (unit == "h") {
            return await delay(count * 3600);
        } else if (unit == "d") {
            return await delay(count * 24 * 3600)
        } else {
            return await delay(count);
        }
    }
}

export async function* glob(pattern: string) {
    const output = await $`ls -1 ${pattern}`
    const lines = output.match(/[^\r\n]+/g);
    if (lines) {
        for (const line of lines) {
            if (line) {
                yield line
            }
        }
    }
}

export function getops(keys?: string): { [name: string]: string } {
    const pairs = parse(Deno.args);
    if (keys) {
        const temp: { [name: string]: string } = {}
        keys.split(":").forEach(key => {
            if (key in pairs) {
                temp[key] = pairs[key];
            }
        })
        return temp;
    }
    return pairs;
}

/**
 * Recursively make a directory, mkdir -p
 * @param path
 */
export function mkdir(path: string) {
    stdFs.ensureDirSync(path);
}

/**
 * Copy files or folders
 */
export function cp(source: string, dest: string) {
    stdFs.copySync(source, dest, {overwrite: true});
}

/**
 * move files or folders
 */
export function mv(source: string, dest: string) {
    stdFs.moveSync(source, dest, {overwrite: true});
}

/**
 * Remove a file or folder recursively
 * @param path
 */
export function rm(path: string) {
    Deno.removeSync(path, {recursive: true});
}

export function awk(pieces: TemplateStringsArray, ...args: Array<unknown>) {
    const compiled = compileTemplate(pieces, ...args);
    const awkTempFile = Deno.makeTempFileSync();
    Deno.writeTextFileSync(awkTempFile, compiled);
    return async function* (fileName: string, options?: string) {
        const command = $.awk;
        const commandLine = `${command} ${options ?? ""} -f ${awkTempFile} ${fileName}`;
        for await (const line of outputAsLines(commandLine)) {
            yield line;
        }
    };
}

export function grep(pieces: TemplateStringsArray, ...args: Array<unknown>) {
    const compiled = compileTemplate(pieces, ...args);
    console.log("regex: ", compiled);
    return async function* (fileName: string, options?: string) {
        const command = $.grep;
        const commandLine = `${command} ${options ?? ""} "${compiled}" ${fileName}`;
        for await (const line of outputAsLines(commandLine)) {
            yield line;
        }
    };
}

export function test(expression: string, callback?: () => void): boolean {
    const pairs = expression.split(" ", 2);
    const condition = pairs[0];
    const fileName = pairs[1];
    const exists = stdFs.existsSync(fileName);
    if (!exists) return false;
    const fileInfo: Deno.FileInfo = Deno.statSync(fileName);
    const uid = parseInt(env.get("UID") ?? "0");
    const gid = parseInt(env.get("GID") ?? "0");
    const fileMode = fileInfo.mode ?? 0;
    let result = false;
    switch (condition) {
        case '-e':
            result = exists;
            break;
        case '-f':
            result = fileInfo.isFile;
            break;
        case '-d':
            result = fileInfo.isDirectory;
            break;
        case '-s':
            result = fileInfo.isFile && fileInfo.size > 0;
            break;
        case '-h':
            result = fileInfo.isSymlink;
            break;
        case '-L':
            result = fileInfo.isSymlink;
            break;
        case '-O':
            result = fileInfo.uid === uid;
            break;
        case '-G':
            result = fileInfo.gid === gid;
            break;
        case '-r':
            result = (fileInfo.uid === uid && (fileMode & 0b100000000) > 0)
                || (fileInfo.gid === gid && (fileMode & 0b000100000) > 0)
                || (fileInfo.uid !== uid && fileInfo.gid !== gid && (fileMode & 0b000000100) > 0);
            break;
        case '-w':
            result = (fileInfo.uid === uid && (fileMode & 0b010000000) > 0)
                || (fileInfo.gid === gid && (fileMode & 0b000010000) > 0)
                || (fileInfo.uid !== uid && fileInfo.gid !== gid && (fileMode & 0b000000010) > 0);
            break;
        case '-x':
            result = (fileInfo.uid === uid && (fileMode & 0b001000000) > 0)
                || (fileInfo.gid === gid && (fileMode & 0b0000001000) > 0)
                || (fileInfo.uid !== uid && fileInfo.gid !== gid && (fileMode & 0b000000001) > 0);
            break;
    }
    if (callback) {
        callback();
    }
    return result;
}

export const fs = {...nodeFs, ...nodeFs.promises};

// env variables to global
Object.assign(window, Deno.env.toObject());

// shell parameters to global, from $0 to $9
const args: { [name: string]: string } = {};
if (Deno.mainModule.endsWith("/dx/cli.ts")) { // launched by dx, such as `./demo.ts xx`
    Deno.args.forEach(function (value, i) {
        const key = "$" + i.toString();
        args[key] = value;
    });
    $['@'] = Deno.args.slice(1);
    $['#'] = Deno.args.length - 1;
    $['*'] = Deno.args.slice(1).join(" ");
} else { // launched by deno, such as `deno run -A --unstable demo.ts xx`
    args["$0"] = Deno.mainModule;
    Deno.args.forEach(function (value, i) {
        const key = "$" + (i + 1).toString();
        args[key] = value;
    });
    $['@'] = Deno.args;
    $['#'] = Deno.args.length;
    $['*'] = Deno.args.join(" ");
}
Object.assign(window, args);

// hooks
try {
    if (!env.get("UID")) {
        env.set("UID", await $`id -u`);
        env.set("GID", await $`id -g`);
    }
} catch (e) {
    console.error("Failed to execute id command:", e)
}


