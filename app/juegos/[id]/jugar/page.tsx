import { notFound } from "next/navigation";
import { Player } from "@/components/player";
import { getGame, getGames } from "@/lib/games";

export const revalidate = 60;

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

export default async function GamePlayerPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <Player game={game} />;
}
