import { notFound } from "next/navigation";
import { Player } from "@/components/player";
import { GAMES, getGame } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function GamePlayerPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return <Player game={game} />;
}
