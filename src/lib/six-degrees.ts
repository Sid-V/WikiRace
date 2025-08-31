// Six Degrees API helpers (find short path between pages)

interface SixDegreesPagesEntry { title: string }
interface SixDegreesResponse {
  pages: Record<string, SixDegreesPagesEntry>;
  paths: number[][];
}

const SIX_DEGREES_API = 'https://api.sixdegreesofwikipedia.com';


export interface StartPageData<PageType> { page: PageType; content: string }
export interface EndPageData { pageid: number; title: string; extract: string; fullurl: string }

export async function chooseValidatedStartAndEndConcurrent<PageType extends { title: string; pageid?: number; extract?: string }>(
  getRandomStartMinimal: () => Promise<PageType>,
  getRandomEnd: () => Promise<PageType>,
  getPageContent: (title: string) => Promise<string>,
  options: { maxDegrees?: number; endAttemptsPerStart?: number; safetyLimit?: number } = {}
): Promise<{
  startPageData: { page: PageType; content: string };
  endPage: EndPageData;
  path: string[];
  degrees: number;
}> {
  const maxDegrees = options.maxDegrees ?? 10;
  const endAttemptsPerStart = options.endAttemptsPerStart ?? 2;
  const safetyLimit = options.safetyLimit ?? 10000;

  for (let safety = 0; safety < safetyLimit; safety++) {
    const startPage = await getRandomStartMinimal();
    const startContentPromise = getPageContent(startPage.title);
    for (let endAttempt = 0; endAttempt < endAttemptsPerStart; endAttempt++) {
      let endCandidate: PageType;
      try { endCandidate = await getRandomEnd(); } catch { continue; }
      if (endCandidate.title.toLowerCase() === startPage.title.toLowerCase()) continue;
      let resp: Response;
      try {
        resp = await fetch(`${SIX_DEGREES_API}/paths`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: startPage.title, target: endCandidate.title })
        });
      } catch { continue; }
      if (resp.status === 400) { endAttempt = endAttemptsPerStart; break; }
      if (!resp.ok) continue;
      let json: unknown;
      try { json = await resp.json(); } catch { continue; }
      if (!json || typeof json !== 'object') continue;
      const pages = (json as SixDegreesResponse).pages;
      const paths = (json as SixDegreesResponse).paths;
      if (!paths || paths.length === 0) continue;
      const pathIds = paths[0];
      if (!Array.isArray(pathIds) || pathIds.length < 2) continue;
      const titles: string[] = [];
      let validPath = true;
      for (const pid of pathIds) {
        const entry = pages?.[String(pid)];
        if (!entry?.title) { validPath = false; break; }
        titles.push(entry.title);
      }
      if (!validPath) continue;
      const degrees = titles.length - 1;
  if (degrees > maxDegrees) continue;
  // Trust API path; skip HTML link chain validation for speed.
  const startContent = await startContentPromise;
      return {
        startPageData: { page: { ...startPage, content: startContent } as PageType, content: startContent },
        endPage: {
          pageid: endCandidate.pageid ?? 0,
          title: titles[titles.length - 1]!,
          extract: endCandidate.extract ?? '',
          fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(titles[titles.length - 1]!)}`,
        },
        path: titles,
        degrees
      };
    }
  }
  throw new Error('Failed to find a solvable start/end pair within safety limit');
}
