import Link from "next/link";

export default function NotFound() {
  return (
    <section className="av-404 fade-in">
      <div className="code flicker">404</div>
      <h1 className="pixel neon-cyan">PANTALLA NO ENCONTRADA</h1>
      <p>Este juego o página no está en el vault. Vuelve a la biblioteca y elige otro.</p>
      <Link href="/" className="btn lg">
        VOLVER A LA BIBLIOTECA
      </Link>
    </section>
  );
}
