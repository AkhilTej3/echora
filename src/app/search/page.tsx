"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import SearchBar from "@/components/SearchBar";
import Queue from "@/components/Queue";
import { usePlayerStore } from "@/store/usePlayerStore";

function SearchContent() {
  const { currentTrack } = usePlayerStore();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Search</h2>
      <SearchBar initialQuery={initialQuery} />
      {currentTrack && (
        <div className="mt-8">
          <Queue />
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Search</h2>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
