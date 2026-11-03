"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "시뮬레이션" },
  // { href: "/ask", label: "자료 질문" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="mb-8 border-b-2 border-ink pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-muted">SHOP SIM</p>
          <p className="font-display text-3xl">가게 시뮬</p>
        </div>
        <nav className="flex gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border-2 border-ink px-4 py-2 text-sm font-semibold ${active ? "bg-ink text-paper" : "bg-card text-ink"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
