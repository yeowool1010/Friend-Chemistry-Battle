"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/", label: "시작" },
  { href: "/test", label: "테스트" },
  { href: "/profile", label: "나" },
  { href: "/c", label: "케미" },
];

export function AppHeader() {
  const pathname = usePathname();
  const showSteps = pathname !== "/";

  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
      <Link href="/" className="group">
        <p className="text-xs font-semibold tracking-[0.22em] text-muted">FRIEND CHEMISTRY</p>
        <p className="font-display text-3xl leading-none group-hover:text-a">케미 배틀</p>
      </Link>
      {showSteps ? (
      <ol className="flex gap-3 text-sm">
        {STEPS.map((step, index) => {
          const active =
            step.href === "/"
              ? pathname === "/"
              : pathname === step.href ||
                pathname.startsWith(`${step.href}/`) ||
                (step.href === "/c" && pathname.startsWith("/b/"));
          return (
            <li key={step.href} aria-current={active ? "step" : undefined} className={active ? "font-semibold text-ink" : "text-muted"}>
              <span className="mr-1 font-display text-base text-a">{index + 1}</span>
              {step.label}
            </li>
          );
        })}
      </ol>
      ) : null}
    </header>
  );
}
