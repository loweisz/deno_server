import { Router } from "https://deno.land/x/oak/mod.ts";
import { getGames } from "./handlers/games.ts";
const router = new Router();
router.get("/games", getGames);
export default router;
//# sourceMappingURL=file:///deno-dir/gen/file/deno-dir/routing.ts.js.map