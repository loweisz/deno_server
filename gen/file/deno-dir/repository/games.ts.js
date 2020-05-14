import { database } from "../server.ts";
export const getAllGameData = async () => {
    const result = await database.query("SELECT * FROM games;");
    return result.rows;
};
//# sourceMappingURL=file:///deno-dir/gen/file/deno-dir/repository/games.ts.js.map