import * as stdFs from "https://deno.land/std@0.105.0/fs/mod.ts";
import {Command} from "https://deno.land/x/cliffy@v0.19.5/command/command.ts";

const taskfiles = ["Taskfile.ts", "Taskfile.js"]

function detectTaskfile(): string | undefined {
    return taskfiles.filter(file => {
        return stdFs.existsSync(file);
    })[0];
}

function convertFileToUri(fileName: string) {
    let fileLocation = fileName;
    if (!fileName.startsWith("http://") && !fileName.startsWith("https://")) {
        if (fileName.startsWith("/")) {
            fileLocation = `file://${fileLocation}`;
        } else {
            fileLocation = `file://${Deno.cwd()}/${fileLocation}`;
        }
    }
    return fileLocation;
}

async function runScriptFile(fileName: string): Promise<void> {
    await import((convertFileToUri(fileName)));
}

async function runTaskfile(taskfile: string, ...tasks: Array<string>) {
    let fileUri = convertFileToUri(taskfile);
    import(fileUri).then(module => {
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
                    console.log(`No '${tasks.join(",")}' tasks found in ${taskfile}.`);
                    Deno.exit(2);
                }
            } else {
                if ("default" in module) {
                    console.log("===Task: default");
                    return module["default"]();
                } else {
                    //console.log("No default task found in Taskfile, please use 'export default xxx;' to add default task.")
                    return command.parse(["-h"]);
                }
            }
        }
    );
}

function printTasks() {
    let taskfile = detectTaskfile();
    if (taskfile) {
        import(convertFileToUri(taskfile)).then(module => {
            console.log("Available tasks:")
            Object.entries(module).forEach(pair => {
                if (pair[0] !== 'default' && typeof pair[1] === 'function') {
                    let funObj = module[pair[0]];
                    if ("desc" in funObj) {
                        console.log(`  ${pair[0]} # ${funObj.desc}`);
                    } else {
                        console.log("  " + pair[0]);
                    }
                }
            });
        });
    } else {
        taskfileNotFound();
    }
}

async function generateShellCompletion(shell: string) {
    if (shell === "zsh") {
        console.log("#compdef dx\n" +
            "#autload\n" +
            "\n" +
            "local subcmds=()\n" +
            "\n" +
            "while read -r line ; do\n" +
            "   if [[ ! $line == Available* ]] ;\n" +
            "   then\n" +
            "      subcmds+=(${line/[[:space:]]*\\#/:})\n" +
            "   fi\n" +
            "done < <(dx --tasks)\n" +
            "\n" +
            "_describe 'command' subcmds")
    } else {
        console.log("Not available now for  ", shell);
    }
}

function taskfileNotFound() {
    console.log("Failed to find 'Taskfile.ts' or 'Taskfile.js' file.");
    Deno.exit(2);
}

const command = new Command()
    .name("dx")
    .version("0.1.0")
    .versionOption("-v, --version")
    .description("A tool for writing better scripts with Deno")
    .option("-t, --tasks", "List tasks in Taskfile", {
        standalone: true,
        action: () => {
            printTasks();
        }
    })
    .option("-u, --upgrade", "Upgrade dx to last version", {
        standalone: true,
        action: async () => {
            console.log("Begin to upgrade dx to last version.")
            const p = Deno.run({
                cmd: "deno install -q -A --unstable -r -f -n dx https://denopkg.com/linux-china/dx/cli.ts".split(" ")
            });
            await p.status();
            p.close();
        }
    })
    .option("-c, --completion <shell:string>", "Generate shell completion for zsh, zsh.", {
        standalone: true,
        action: async (options: any) => {
            await generateShellCompletion(options.completion);
        }
    })
    .arguments("[script:string] [args...:string]")
    .action(async (options: any, script: string | undefined, args: string[] | undefined) => {
        // run default task from Taskfile
        if (typeof script === 'undefined') {
            const taskfile = detectTaskfile();
            if (taskfile) {
                await runTaskfile(taskfile);
            } else { // display help
                await command.parse(["-h"])
            }
        } else {
            //run ts file
            if (script.endsWith(".ts") || script.endsWith(".js")) {
                if (script.endsWith("Taskfile.ts") || script.endsWith("Taskfiles.js")) {
                    await runTaskfile(script, ...(args ?? []));
                } else {
                    await runScriptFile(script);
                }
            } else { // run tasks
                let taskfile = detectTaskfile();
                if (taskfile) {
                    //script is task name now
                    const tasks = args ? [script, ...args] : [script];
                    await runTaskfile(taskfile, ...tasks);
                } else {
                    taskfileNotFound();
                }
            }
        }
    });

if (import.meta.main) {
    await command.parse(Deno.args);
}

