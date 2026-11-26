import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robot Legends: Battle of Knowledge — MOBA Edukatif 3D",
  description:
    "Game MOBA 3D web-based 5v5 yang menggabungkan pertempuran robot futuristik dengan Knowledge Battle — Kuis IPAS Kelas 6 (Sistem Pencernaan, Pernapasan, Tata Surya, Jejak Sang Pahlawan). Created by Wiyanto Abu Hanif.",
  keywords: ["Robot Legends", "MOBA", "game edukatif", "IPAS kelas 6", "quiz game", "Battle of Knowledge"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-[#050a16] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
