import { Application } from "https://deno.land/x/oak/mod.ts";
import { APP_HOST, APP_PORT } from "./config.ts";
import router from "./routing.ts";
import { connectDB } from "./repository/db.ts";
const app = new Application();
export const database = await connectDB();
app.use(router.routes());
app.use(router.allowedMethods());
console.log(`Listening on ${APP_PORT}...`);
await app.listen(`${APP_HOST}:${APP_PORT}`);
//# sourceMappingURL=file:///deno-dir/gen/file/deno-dir/server.ts.js.map