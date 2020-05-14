import { getGamesService } from "../services/games.ts";

export const getGames = async ({ response }: any) => {
  response.body = await getGamesService();
};
