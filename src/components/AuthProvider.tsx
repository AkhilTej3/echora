"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createSupabaseBrowser }) => {
      const supabase = createSupabaseBrowser();
      supabaseRef.current = supabase;

      supabase.auth.getUser().then((res: { data: { user: User | null } }) => {
        setUser(res.data.user);
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (_event: string, session: { user: User | null } | null) => {
          setUser(session?.user ?? null);
        }
      );

      return () => subscription.unsubscribe();
    });
  }, []);

  async function signOut() {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut();
    }
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
