import Link from "next/link";

interface QuickNavProps {
  categories: { id: string; title: string }[];
}

export function QuickNav({ categories }: QuickNavProps) {
  return (
    <nav aria-label="快速導覽" className="sticky top-24 space-y-2">
      <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">快速導覽</p>
      <ul className="space-y-1 text-sm">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`#${category.id}`}
              className="flex items-center justify-between rounded-md px-3 py-2 text-neutral-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/80"
            >
              <span>{category.title}</span>
              <span aria-hidden>↘</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
