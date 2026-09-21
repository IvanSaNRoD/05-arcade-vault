import Link from "next/link";
import type { Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";

const TOP_CLASS = [" top1", " top2", " top3"];

export function HallOfFame({
  games,
  selectedGame,
  scores,
}: {
  games: Game[];
  selectedGame: Game;
  scores: ScoreRow[];
}) {
  const [first, second, third] = scores;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            className={"chip" + (g.id === selectedGame.id ? " active" : "")}
            aria-current={g.id === selectedGame.id ? "page" : undefined}
          >
            {g.title}
          </Link>
        ))}
      </div>

      {first && (
        <div className="podium">
          <div className="podium-slot silver">
            {second ? (
              <>
                <div className="rank-num">02</div>
                <div className="name">{second.name}</div>
                <div className="score">
                  {second.score.toLocaleString("es-ES")}
                </div>
                <div className="date">{second.date}</div>
              </>
            ) : (
              <div className="rank-num">02</div>
            )}
          </div>
          <div className="podium-slot gold">
            <div className="pixel text-[9px] tracking-[0.18em] text-gold">
              CAMPEÓN
            </div>
            <div className="rank-num mt-1 text-[36px]">01</div>
            <div className="name">{first.name}</div>
            <div className="score text-[20px]">
              {first.score.toLocaleString("es-ES")}
            </div>
            <div className="date">{first.date}</div>
          </div>
          <div className="podium-slot bronze">
            {third ? (
              <>
                <div className="rank-num">03</div>
                <div className="name">{third.name}</div>
                <div className="score">
                  {third.score.toLocaleString("es-ES")}
                </div>
                <div className="date">{third.date}</div>
              </>
            ) : (
              <div className="rank-num">03</div>
            )}
          </div>
        </div>
      )}

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {scores.map((r, i) => (
          <div
            key={r.name + r.date + r.score}
            className={"tr" + (TOP_CLASS[i] ?? "")}
            // Per-row stagger is a runtime value, so it stays inline instead of a Tailwind class.
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {scores.length === 0 && (
          <div className="p-10 text-center text-ink-faint">
            SIN PARTIDAS TODAVÍA_
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
