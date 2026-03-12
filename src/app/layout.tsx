import type { Metadata } from "next";
import { Instrument_Serif, Libre_Franklin, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const libreFranklin = Libre_Franklin({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Orpheus — Your AI E-Commerce Co-Pilot",
  description:
    "Tell Orpheus what you want to sell, and it builds your store, researches your market, creates your listings, and launches your marketing — all from a single chat window.",
  openGraph: {
    title: "Orpheus — Your AI E-Commerce Co-Pilot",
    description:
      "The AI co-founder every e-commerce entrepreneur deserves. From idea to live Shopify store in one conversation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${instrumentSerif.variable} ${libreFranklin.variable} ${ibmPlexMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        {children}
      </body>
    </html>
  );
}
