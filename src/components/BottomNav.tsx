"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Search, Library } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Library },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121212] border-t border-[#282828] flex items-center justify-around px-2 py-1.5 safe-bottom">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-md transition-colors ${
              active ? "text-white" : "text-[#b3b3b3]"
            }`}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              fill={active ? "white" : "none"}
            />
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
