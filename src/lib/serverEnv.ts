/** 빌드 시점에 빈 값으로 고정되지 않도록, 요청이 들어온 뒤에 읽는다. */
export function readServerEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}
