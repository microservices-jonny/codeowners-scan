export function truncate(
  s: string,
  {max, omission}: {max: number; omission: string}
): string {
  if (s.length >= max - omission.length) {
    return s.slice(0, max - omission.length) + omission
  }
  return s
}
