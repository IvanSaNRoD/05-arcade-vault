import { createClient } from "@/lib/supabase/server";

export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  category: Category;
  cover: string;
  color: GameColor;
  best: number;
  plays: string;
}

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
  const supabase = await createClient();
  const [{ data: rows }, { data: scores }] = await Promise.all([
    supabase.from("games").select("*"),
    supabase.from("scores").select("game_id, score"),
  ]);

  const statsByGame = new Map<string, LiveStats>();
  for (const s of scores ?? []) {
    const current = statsByGame.get(s.game_id) ?? { best: 0, plays: 0 };
    current.plays += 1;
    current.best = Math.max(current.best, s.score);
    statsByGame.set(s.game_id, current);
  }

  return (rows ?? []).map((row) => toGame(row, statsByGame.get(row.id)));
}

export async function getGame(id: string): Promise<Game | undefined> {
  const supabase = await createClient();
  const [{ data: row }, { data: scores }] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    supabase.from("scores").select("score").eq("game_id", id),
  ]);

  if (!row) return undefined;

  const plays = scores?.length ?? 0;
  const best = plays > 0 ? Math.max(...scores!.map((s) => s.score)) : 0;

  return toGame(row, { best, plays });
}

export const CATEGORIES = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
