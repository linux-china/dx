import {readLines} from "https://deno.land/std@0.95.0/io/bufio.ts";
import * as os from 'https://deno.land/std@0.95.0/node/os.ts';
import * as nodeFs from 'https://deno.land/std@0.95.0/node/fs.ts';

export * as os from 'https://deno.land/std@0.95.0/node/os.ts';

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

interface ProcessOutput {
    readonly exitCode: number
    readonly stdout: string
    readonly stderr: string
}

/**
 * execute given command
 *
 * @throws {ProcessOutput} ProcessOutput's exception if exit code is not 0
 * @return {string} stdout as string if exit code is 0
 */
export async function $(pieces: TemplateStringsArray, ...args: Array<unknown>): Promise<string> {
    let compiled = pieces[0], i = 0;
    for (; i < args.length; i++) compiled += args[i] + pieces[i + 1];
    for (++i; i < pieces.length; i++) compiled += pieces[i];
    const p = Deno.run({
        cmd: [$.shell],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped"
    });
    // @ts-ignore
    await p.stdin.write(textEncoder.encode($.prefix + compiled));
    // @ts-ignore
    await p.stdin.close();
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

$.shell = "bash";
$.prefix = "set -euo pipefail;";

export function cd(path: string) {
    if (path.startsWith("~")) {
        path = os.homedir() + path.substr(1);
    }
    Deno.chdir(path);
}

export function pwd(): string {
    return Deno.cwd();
}

export function echo(obj: string | object | Uint8Array | null | undefined) {
    if (obj) {
        if (obj.constructor === Uint8Array) {
            console.log(textDecoder.decode(obj))
        } else if (typeof obj === 'string') {
            console.log(obj);
        } else {
            console.log(JSON.stringify(obj));
        }
    }
}

export async function question(prompt: string) {
    Deno.stdout.write(textEncoder.encode(prompt));
    for await (const line of readLines(Deno.stdin)) {
        return line;
    }
}

export const fs = {...nodeFs, ...nodeFs.promises};

interface Env {
    get(key: string): string | undefined;

    set(key: string, value: string): void;

    delete(key: string): void;

    toObject(): { [index: string]: string; }
}

export const env = Deno.env as Env;
