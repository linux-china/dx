import {join} from 'https://deno.land/std@0.96.0/path/mod.ts';
import * as stdFs from "https://deno.land/std@0.96.0/fs/mod.ts";
import {Command} from "https://deno.land/x/cliffy@v0.18.2/command/command.ts";

async function runScriptFile(fileName: string): Promise<void> {
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
        await import(fileName)
    } else {
        let filePath: string = join(Deno.cwd(), fileName);
        if (!filePath.startsWith("file://")) {
            filePath = "file://" + filePath;
        }
        await import(filePath);
    }
}

async function runTaskfile(...tasks: Array<string>) {
    // @ts-ignore
    import('./Taskfile.ts').then(module => {
        if (tasks.length > 0) {
            let runners = tasks.filter(task => {
                return task in module;
            }).map(task => {
                console.log("===Task: " + task);
                // @ts-ignore
                return module[task]();
            });
            if (runners && runners.length > 0) {
                // @ts-ignore
                return Promise.all([...runners]);
            } else {
                console.log("No '" + tasks.join(",") + "' task found in Taskfile.")
                Deno.exit(2);
            }
        } else {
            if ("default" in module) {
                console.log("===Task: default");
                return module["default"]();
            } else {
                console.log("No default task found in Taskfile, please use 'export default xxx;' to add default task.")
                Deno.exit(2);
            }
        }
    });
}

function taskfileNotFound() {
    console.log("Failed to find Taskfile.ts");
    Deno.exit(2);
}

const command = new Command()
    .name("dx")
    .version("0.1.0")
    .description("A tool for writing better scripts with Deno")
    .option("-t, --tasks", "List tasks", {
        standalone: true,
        action: () => {
            if (stdFs.existsSync("Taskfile.ts")) {
                import('./Taskfile.ts').then(module => {
                    Object.entries(module).forEach(pair => {
                        if (pair[0] !== 'default' && typeof pair[1] === 'function') {
                            console.log(pair[0]);
                        }
                    });
                });
            } else {
                taskfileNotFound();
            }
        }
    })
    .option("-u, --upgrade", "Upgrade dx to last version", {
        standalone: true,
        action: () => {
            const p = Deno.run({
                cmd: ["deno", "--version"],
            });
            Deno.exit(0);
        }
    })
    .arguments("[args...:string]")
    .action(async (options: any, args: Array<string>) => {
        const firstArg = args ? args[0] : undefined;
        // run default task from Taskfile
        if (typeof firstArg === 'undefined') {
            if (stdFs.existsSync("Taskfile.ts")) {
                await runTaskfile();
            } else { // display help
                await command.parse(["-h"])
            }
        } else {
            //run ts file
            if (firstArg.endsWith(".ts")) {
                if (firstArg.endsWith("Taskfile.ts")) {
                    await runTaskfile(...Deno.args.slice(1));
                } else {
                    await runScriptFile(firstArg);
                }
            } else { // run tasks
                if (stdFs.existsSync("Taskfile.ts") && firstArg !== "tasks") {
                    await runTaskfile(...Deno.args);
                } else {
                    taskfileNotFound();
                }
            }
        }
    });

if (import.meta.main) {
    await command.parse(Deno.args);
}

