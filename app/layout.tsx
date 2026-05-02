import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wavy — Neuroadaptive Interface",
  description:
    "Realtime cognitive-state-aware adaptive AI environment. EEG-derived signals drive an adaptive interface in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-ink text-bone">
      <body className="bg-ink text-bone">{children}</body>
    </html>
  );
}
