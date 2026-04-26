import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Player from "@/components/Player";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Echora — Feel every frequency",
  description: "AI-powered music streaming that understands your mood",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} bg-[#121212] text-white antialiased`}>
        <div className="flex h-[100dvh] flex-col">
          <div className="flex flex-1 overflow-hidden">
            <div className="hidden md:flex">
              <Sidebar />
            </div>
            <main className="flex-1 overflow-y-auto bg-[#121212] p-4 md:p-6 pb-36 md:pb-6">
              {children}
            </main>
          </div>
          <Player />
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
