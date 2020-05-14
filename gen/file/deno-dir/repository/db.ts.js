import { Client } from "https://deno.land/x/postgres/mod.ts";
export async function connectDB() {
    const client = new Client({
        user: "postgres_data",
        database: "postgres",
        password: "password",
        hostname: "localhost",
        port: 5432,
    });
    try {
        await client.connect();
    }
    catch (e) {
        console.log(e);
    }
    return client;
}
//# sourceMappingURL=file:///deno-dir/gen/file/deno-dir/repository/db.ts.js.map