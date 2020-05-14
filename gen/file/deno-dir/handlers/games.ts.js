import { getGamesService } from "../services/games.ts";
export const getGames = async ({ response }) => {
    response.body = await getGamesService();
};
//# sourceMappingURL=file:///deno-dir/gen/file/deno-dir/handlers/games.ts.js.map