import {readLines} from "https://deno.land/std@0.95.0/io/bufio.ts";
import chalkDeno from "https://deno.land/x/chalk_deno@v4.1.1-deno/source/index.js"


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
    await p.stdin.write(textEncoder.encode(compiled));
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

export function cd(path: string) {
    if (path.startsWith("~")) {
        path = os.homedir() + path.substr(1);
    }
    Deno.chdir(path);
}

export function pwd(): string {
    return Deno.cwd();
}

export async function question(prompt: string) {
    Deno.stdout.write(textEncoder.encode(prompt));
    for await (const line of readLines(Deno.stdin)) {
        return line;
    }
}

export const os = {
    homedir: (): string | undefined => {
        return Deno.env.get("HOME");
    },
    arch: (): string => {
        return Deno.build.arch;
    },

    type: (): string => {
        return Deno.build.os;
    },

    version: (): string => {
        return Deno.osRelease();
    },

    tmpdir: (): string | undefined => {
        return env.get("TMPDIR")
    },

    hostname: (): string => {
        return Deno.build.os;
    }
}

export const fs = {
    chmod: Deno.chmod,
    chmodSync: Deno.chmodSync,
    chown: Deno.chown,
    chownSync: Deno.chownSync,
    copy: Deno.copy,
    copyFile: Deno.copyFile,
    copyFileSync: Deno.copyFileSync,
    create: Deno.create,
    createSync: Deno.createSync,
    open: Deno.open,
    openSync: Deno.openSync,
    read: Deno.read,
    readAll: Deno.readAll,
    readAllSync: Deno.readAllSync,
    readDir: Deno.readDir,
    readDirSync: Deno.readDirSync,
    readFile: Deno.readFile,
    readFileSync: Deno.readFileSync,
    readLink: Deno.readLink,
    readLinkSync: Deno.readLinkSync,
    readSync: Deno.readSync,
    readTextFile: Deno.readTextFile,
    readTextFileSync: Deno.readTextFileSync,
    realPath: Deno.realPath,
    realPathSync: Deno.realPathSync,
    remove: Deno.remove,
    removeSync: Deno.removeSync,
    rename: Deno.rename,
    renameSync: Deno.renameSync,
    stat: Deno.stat,
    statSync: Deno.statSync,
    symlink: Deno.symlink,
    symlinkSync: Deno.symlinkSync,
    truncate: Deno.truncate,
    truncateSync: Deno.truncateSync,
    watchFs: Deno.watchFs,
    write: Deno.write,
    writeAll: Deno.writeAll,
    writeAllSync: Deno.writeAllSync,
    writeFile: Deno.writeFile,
    writeFileSync: Deno.writeFileSync,
    writeSync: Deno.writeSync,
    writeTextFile: Deno.writeTextFile,
    writeTextFileSync: Deno.writeTextFileSync
}

interface Env {
    get(key: string): string | undefined;

    set(key: string, value: string): void;

    delete(key: string): void;

    toObject(): { [index: string]: string; }
}

export const env = Deno.env as Env;
