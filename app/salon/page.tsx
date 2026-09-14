import { HallOfFame } from "@/components/hall-of-fame";
import { GAMES, getGame } from "@/lib/games";

export default async function HallPage({ searchParams }: PageProps<"/salon">) {
  const { juego } = await searchParams;
  // Missing, repeated (?juego=a&juego=b) or unknown id falls back to the first game.
  const game = (typeof juego === "string" && getGame(juego)) || GAMES[0];

  return <HallOfFame game={game} />;
}
