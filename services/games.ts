import { Game } from "../models/game.ts";
import { getAllGameData } from "../repository/games.ts";

export const getGamesService = async (): Promise<Game[]> => {
  return getAllGameData();
};
