"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/config";

interface ArtistDetail {
  user: { id: string; name: string; email: string };
  displayName?: string | null;
  speciality?: string | null;
  photoUrl?: string | null;
  branch?: { id: string; name: string } | null;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  createdAt: string;
}

export default function ArtistPortfolioPage() {
  const params = useParams<{ id: string }>();
  const artistId = params?.id as string;
  const base = getApiBaseUrl();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId) return;
    (async () => {
      try {
        const [aRes, pRes] = await Promise.all([
          fetch(`${base}/artists/${artistId}`, { cache: "no-store" }),
          fetch(`${base}/artists/${artistId}/portfolio`, { cache: "no-store" }),
        ]);
        const a = await aRes.json();
        const p = await pRes.json();
        setArtist(a || null);
        setItems(Array.isArray(p) ? p : []);
      } catch (e) {
        setArtist(null);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [artistId, base]);

  const name = artist?.displayName || artist?.user?.name || "未知刺青師";
  const photo = artist?.photoUrl || "https://placehold.co/800x600?text=Artist";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-neutral-100">
      {loading ? (
        <div>載入中...</div>
      ) : (
        <>
          <div className="mb-8 flex gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={name} className="h-40 w-40 rounded-lg object-cover" />
            <div>
              <h1 className="text-3xl font-semibold">{name}</h1>
              {artist?.speciality && <div className="mt-1 text-neutral-400">{artist.speciality}</div>}
              {artist?.branch?.name && <div className="mt-1 text-neutral-500 text-sm">{artist.branch.name}</div>}
            </div>
          </div>

          <h2 className="mb-4 text-xl font-medium">作品集</h2>
          {items.length === 0 ? (
            <div className="text-neutral-400">尚無作品。</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <div key={it.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.imageUrl || "https://placehold.co/600x800?text=Work"} alt={it.title} className="h-64 w-full object-cover" />
                  <div className="p-4">
                    <div className="font-medium">{it.title}</div>
                    {it.description && <div className="mt-1 text-sm text-neutral-400">{it.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


