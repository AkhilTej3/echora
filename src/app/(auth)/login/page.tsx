"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createSupabaseBrowser();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for the confirmation link!");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/";
      }
    }
    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-[100dvh] bg-[#121212] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <Image src="/logo.png" alt="Echora" width={40} height={40} />
            <span className="text-3xl font-bold tracking-tight text-white">
              Echora
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">
            {isSignUp ? "Create your account" : "Log in to Echora"}
          </h1>
        </div>

       

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-white block mb-2">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full px-4 py-3 bg-[#121212] border border-[#282828] rounded-md text-white text-sm placeholder-[#b3b3b3]/50 focus:outline-none focus:border-white transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-white block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? "Create a password" : "Password"}
              required
              minLength={6}
              className="w-full px-4 py-3 bg-[#121212] border border-[#282828] rounded-md text-white text-sm placeholder-[#b3b3b3]/50 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-[#1DB954] bg-[#1DB954]/10 px-3 py-2 rounded-md">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-sm rounded-full transition-colors disabled:opacity-50"
          >
            {loading ? "..." : isSignUp ? "Sign Up" : "Log In"}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setMessage("");
            }}
            className="text-sm text-[#b3b3b3] hover:text-white transition-colors"
          >
            {isSignUp
              ? "Already have an account? Log in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
