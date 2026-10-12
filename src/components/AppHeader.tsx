"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/", label: "시작" },
  { href: "/test", label: "테스트" },
  { href: "/waiting", label: "대기" },
  { href: "/result", label: "결과" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
      <Link href="/" className="group">
        <p className="text-xs font-semibold tracking-[0.22em] text-muted">FRIEND CHEMISTRY</p>
        <p className="font-display text-3xl leading-none group-hover:text-a">케미 배틀</p>
      </Link>
      <ol className="flex gap-3 text-sm">
        {STEPS.map((step, index) => {
          const active = step.href === "/" ? pathname === "/" : pathname.startsWith(step.href);
          return (
            <li key={step.href} aria-current={active ? "step" : undefined} className={active ? "font-semibold text-ink" : "text-muted"}>
              <span className="mr-1 font-display text-base text-a">{index + 1}</span>
              {step.label}
            </li>
          );
        })}
      </ol>
    </header>
  );
}
