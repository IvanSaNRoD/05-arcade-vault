import { createClient } from "@/lib/supabase/static";
import { FALLBACK_GAMES } from "@/lib/games-fallback";
import type { Category, Game, GameColor } from "@/lib/games-types";

export type { Category, Game, GameColor } from "@/lib/games-types";
export { CATEGORIES } from "@/lib/games-types";

interface GameRow {
  id: string;
  title: string;
  short: string;
  long: string;
  category: Category;
  cover: string;
  color: GameColor;
  best_seed: number;
  plays_seed: string;
}

// Fila de la vista game_stats (SPEC 14): MAX/COUNT de scores por game_id.
interface GameStatsRow {
  game_id: string;
  best: number;
  plays: number;
}

interface LiveStats {
  best: number;
  plays: number;
}

// best/plays: MAX(score)/COUNT(*) real por game_id; sin partidas reales aún,
// se usa best_seed/plays_seed como valor de exhibición (ver SPEC 06).
function toGame(row: GameRow, stats?: LiveStats): Game {
  const hasRealPlays = !!stats && stats.plays > 0;
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    category: row.category,
    cover: row.cover,
    color: row.color,
    best: hasRealPlays ? stats.best : row.best_seed,
    plays: hasRealPlays ? String(stats.plays) : row.plays_seed,
  };
}

export async function getGames(): Promise<Game[]> {
  const supabase = createClient();
  const [{ data: rows, error }, { data: stats }] = await Promise.all([
    supabase.from("games").select("*"),
    supabase.from("game_stats").select("game_id, best, plays"),
  ]);

  if (error) return FALLBACK_GAMES;

  const statsByGame = new Map<string, LiveStats>(
    ((stats ?? []) as GameStatsRow[]).map((s) => [s.game_id, { best: s.best, plays: s.plays }]),
  );

  return (rows ?? []).map((row) => toGame(row, statsByGame.get(row.id)));
}

export async function getGame(id: string): Promise<Game | undefined> {
  const supabase = createClient();
  const [{ data: row, error }, { data: stats }] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    supabase.from("game_stats").select("best, plays").eq("game_id", id).maybeSingle(),
  ]);

  if (error) return FALLBACK_GAMES.find((g) => g.id === id);
  if (!row) return undefined;

  return toGame(row, (stats as LiveStats | null) ?? undefined);
}
