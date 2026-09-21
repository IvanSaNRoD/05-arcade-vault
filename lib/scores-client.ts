"use client";

import { createClient } from "@/lib/supabase/client";

export async function saveScore(gameId: string, name: string, score: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({ game_id: gameId, name, score });
  if (error) throw error;
}
