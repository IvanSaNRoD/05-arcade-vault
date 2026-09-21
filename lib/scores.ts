import { createClient } from "@/lib/supabase/static";

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function getTopScores(gameId: string, limit = 10): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}
