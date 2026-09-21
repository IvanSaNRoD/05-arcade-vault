import { HallOfFame } from "@/components/hall-of-fame";
import { getGame, getGames } from "@/lib/games";
import { getTopScores } from "@/lib/scores";

export const revalidate = 60;

export default async function HallPage({ searchParams }: PageProps<"/salon">) {
  const { juego } = await searchParams;
  const games = await getGames();
  // Missing, repeated (?juego=a&juego=b) or unknown id falls back to the first game.
  const game =
    (typeof juego === "string" && (await getGame(juego))) || games[0];
  const scores = await getTopScores(game.id, 12);

  return <HallOfFame games={games} selectedGame={game} scores={scores} />;
}
