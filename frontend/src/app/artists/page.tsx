"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getApiBaseUrl } from "@/lib/config";

interface ArtistItem {
  user: { id: string; name: string; email: string };
  displayName?: string | null;
  speciality?: string | null;
  photoUrl?: string | null;
  branch?: { id: string; name: string } | null;
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const base = getApiBaseUrl();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${base}/artists`, { cache: "no-store" });
        const data = await res.json();
        setArtists(data || []);
      } catch (e) {
        setArtists([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [base]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-neutral-100">
      <h1 className="mb-6 text-3xl font-semibold">刺青師</h1>
      {loading ? (
        <div>載入中...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a, idx) => {
            const name = a.displayName || a.user?.name || "未知刺青師";
            const photo = a.photoUrl || "https://placehold.co/600x800?text=Artist";
            return (
              <Link key={idx} href={`/artists/${a.user.id}`} className="group rounded-xl border border-white/10 bg-black/40 p-4 hover:border-white/20">
                <div className="relative mb-3 h-56 w-full overflow-hidden rounded-lg bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt={name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-medium">{name}</div>
                    <div className="text-sm text-neutral-400">{a.speciality || "多風格"}</div>
                    {a.branch?.name && <div className="text-xs text-neutral-500 mt-1">{a.branch.name}</div>}
                  </div>
                  <span className="text-yellow-300">查看作品 →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


