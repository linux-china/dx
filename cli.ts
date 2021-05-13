import {join} from 'https://deno.land/std@0.95.0/path/mod.ts'

async function dxCli(): Promise<void> {
    let firstArg = Deno.args[0]
    if (['-v', '-V', '--version'].includes(firstArg)) {
        console.log(`dx version 0.1.0`)
        Deno.exit(0)
    }
    if (typeof firstArg === 'undefined') {
        console.log(`usage: zx <script>`)
        Deno.exit(2)
    } else if (firstArg.startsWith('http://') || firstArg.startsWith('https://')) {
        await import(firstArg)
    } else {
        console.log("cwd", Deno.cwd());
        await import((join(Deno.cwd(), firstArg)))
    }
}

if (import.meta.main) {
    dxCli();
}

