"use client";

import { useAuth } from "@/components/AuthProvider";
import { LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";
  const avatar = user.user_metadata?.avatar_url;
  const initials = name.charAt(0).toUpperCase();

  return (
    <div className="max-w-md mx-auto pt-8 space-y-8">
      <div className="flex flex-col items-center gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-24 h-24 rounded-full object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-[#1DB954] flex items-center justify-center text-black text-3xl font-bold">
            {initials}
          </div>
        )}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{name}</h1>
          <p className="text-sm text-[#b3b3b3]">{user.email}</p>
        </div>
      </div>

      <div className="bg-[#181818] rounded-lg divide-y divide-[#282828]">
        <div className="px-4 py-3 flex justify-between">
          <span className="text-sm text-[#b3b3b3]">Account</span>
          <span className="text-sm text-white">{user.app_metadata?.provider || "email"}</span>
        </div>
        <div className="px-4 py-3 flex justify-between">
          <span className="text-sm text-[#b3b3b3]">Member since</span>
          <span className="text-sm text-white">
            {new Date(user.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-3 border border-[#282828] rounded-full text-white font-semibold text-sm hover:border-white transition-colors"
      >
        <LogOut size={16} />
        Log out
      </button>
    </div>
  );
}
