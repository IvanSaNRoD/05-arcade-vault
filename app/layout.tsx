import type { Metadata } from "next";
import { JetBrains_Mono, Press_Start_2P } from "next/font/google";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start-2p",
  weight: "400",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description: "Juega clásicos arcade y compite por la puntuación más alta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart2P.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="av-bg" aria-hidden />
        <div className="av-noise" aria-hidden />
        <div className="av-app">
          <Nav />
          <main className="av-main">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
