"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Home, Search, Library, Plus, Music } from "lucide-react";
import UserMenu from "./UserMenu";

interface Playlist {
  id: string;
  name: string;
  track_count: number;
}

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists || []))
      .catch(() => {});
  }, []);

  async function createPlaylist() {
    const name = prompt("Playlist name:");
    if (!name) return;
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.id) {
      setPlaylists((prev) => [{ id: data.id, name: data.name, track_count: 0 }, ...prev]);
    }
  }

  return (
    <aside className="w-[280px] bg-black flex flex-col h-full shrink-0">
      <div className="px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.png"
            alt="Echora"
            width={32}
            height={32}
            className="group-hover:scale-105 transition-transform"
          />
          <span className="text-[22px] font-bold tracking-tight text-white">
            Echora
          </span>
        </Link>
        <UserMenu />
      </div>

      <nav className="px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-md transition-colors ${
                active
                  ? "text-white"
                  : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              <Icon
                size={24}
                strokeWidth={active ? 2.5 : 1.8}
                fill={active ? "white" : "none"}
              />
              <span className={`text-sm ${active ? "font-bold" : "font-semibold"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mt-4 bg-[#121212] rounded-lg flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 flex items-center justify-between shrink-0">
          <Link
            href="/library"
            className="flex items-center gap-2 text-[#b3b3b3] hover:text-white transition-colors"
          >
            <Library size={22} strokeWidth={2} />
            <span className="text-sm font-bold">Your Library</span>
          </Link>
          <button
            onClick={createPlaylist}
            className="text-[#b3b3b3] hover:text-white hover:bg-[#282828] rounded-full p-1.5 transition-colors"
            title="Create playlist"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-2 pb-2">
          {playlists.length > 0 ? (
            <div className="space-y-0.5">
              {playlists.map((pl) => (
                <Link
                  key={pl.id}
                  href={`/library?playlist=${pl.id}`}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#282828] transition-colors group"
                >
                  <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center shrink-0 group-hover:bg-[#3a3a3a]">
                    <Music size={16} className="text-[#b3b3b3]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {pl.name}
                    </p>
                    <p className="text-xs text-[#b3b3b3]">
                      Playlist · {pl.track_count} song{pl.track_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6 px-4">
              <p className="text-sm font-bold text-white mb-1">
                Create your first playlist
              </p>
              <p className="text-xs text-[#b3b3b3] mb-4">
                It&apos;s easy, we&apos;ll help you
              </p>
              <button
                onClick={createPlaylist}
                className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:scale-105 transition-transform"
              >
                Create playlist
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-3">
        <span className="text-[10px] text-[#b3b3b3]/50 tracking-widest uppercase">
          Feel every frequency
        </span>
      </div>
    </aside>
  );
}
