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
  offline?: boolean; // datos del catálogo local (Supabase caído): no se guardan puntuaciones
}

export const CATEGORIES = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
