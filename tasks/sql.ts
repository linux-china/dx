import {Client} from "https://deno.land/x/mysql/mod.ts";

export function sql(option: { hostname: string, db: string, username: string, password: string }, ...sentences: string[]) {
    const client = await new Client().connect(option);
    sentences.forEach(sentence => {
        await client.execute(sentence);
    });
    await client.close();
}
