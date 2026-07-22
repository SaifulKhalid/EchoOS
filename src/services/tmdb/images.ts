/** TMDB image URL builders. Sizes chosen to balance sharpness vs. payload. */

const IMG_BASE = 'https://image.tmdb.org/t/p';

export function posterUrl(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' = 'w342',
): string | undefined {
  return path ? `${IMG_BASE}/${size}${path}` : undefined;
}

export function backdropUrl(
  path: string | null | undefined,
  size: 'w780' | 'w1280' = 'w780',
): string | undefined {
  return path ? `${IMG_BASE}/${size}${path}` : undefined;
}

/** Extract a 4-digit year from a TMDB release_date (YYYY-MM-DD). */
export function releaseYear(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) ? y : undefined;
}
