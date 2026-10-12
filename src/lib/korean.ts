/** 이름 뒤에 와/과를 붙인다. 한글이 아니면 와를 쓴다. */
export function withAnd(name: string): string {
  return `${name}${hasBatchim(name) ? "과" : "와"}`;
}

/** 이/가 */
export function withSubject(name: string): string {
  return `${name}${hasBatchim(name) ? "이" : "가"}`;
}

function hasBatchim(text: string): boolean {
  const last = text.at(-1);
  if (!last) return false;

  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}
