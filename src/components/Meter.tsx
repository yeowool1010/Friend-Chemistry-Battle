export function Meter({ value, tone }: { value: number; tone: "a" | "b" }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-soft" aria-hidden>
      <div className={tone === "a" ? "h-full rounded-full bg-a" : "h-full rounded-full bg-b"} style={{ width: `${value}%` }} />
    </div>
  );
}
