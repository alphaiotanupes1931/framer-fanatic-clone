export const VIDEO_PAGE_SIZE = 24;

export function videoPageRange(page: number) {
  const from = page * VIDEO_PAGE_SIZE;
  // One lookahead row tells us whether another full or partial page exists.
  return { from, to: from + VIDEO_PAGE_SIZE };
}

export function videoPage<T>(rows: T[], page: number) {
  return {
    items: rows.slice(0, VIDEO_PAGE_SIZE),
    nextPage: rows.length > VIDEO_PAGE_SIZE ? page + 1 : undefined,
  };
}

export function uniqueVideos<T extends { id: string }>(pages: { items: T[] }[]): T[] {
  return Array.from(new Map(pages.flatMap((page) => page.items).map((video) => [video.id, video])).values());
}