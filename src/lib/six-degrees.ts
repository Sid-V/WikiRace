// Six Degrees of Wikipedia API integration
// API base: https://api.sixdegreesofwikipedia.com
// Provides utilities to find a target page within a constrained number of degrees from a start page.

// Legacy SixDegreesResult interface removed (no longer used).

interface SixDegreesPagesEntry { title: string }
interface SixDegreesResponse {
  pages: Record<string, SixDegreesPagesEntry>;
  paths: number[][];
}

const SIX_DEGREES_API = 'https://api.sixdegreesofwikipedia.com';

// Utility: escape for RegExp
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

// Validate that each hop in path is clickable (data-wiki-page) in sanitized HTML chain.
// startHtml: sanitized HTML of first page.
// getPageContent: fetches sanitized HTML for subsequent pages.
async function validateFullPath(
  startHtml: string,
  path: string[],
  getPageContent: (title: string) => Promise<string>
): Promise<boolean> {
  if (path.length < 2) return false;
  const hasLink = (html: string, target: string) => {
    const pattern = new RegExp(`data-wiki-page=\\"${escapeRegExp(target)}\\"`, 'i');
    return pattern.test(html);
  };
  let currentHtml = startHtml;
  for (let i = 0; i < path.length - 1; i++) {
    const fromTitle = path[i];
    const toTitle = path[i + 1];
    if (!fromTitle || !toTitle) return false;
    if (!hasLink(currentHtml, toTitle)) {
      // eslint-disable-next-line no-console
      console.warn('[SixDegrees] Missing link', fromTitle, '->', toTitle, '— rejecting solution');
      return false;
    }
    if (i < path.length - 2) {
      try {
        currentHtml = await getPageContent(toTitle);
      } catch {
        return false;
      }
    }
  }
  return true;
}

/**
 * Core high-level helper: choose a start (with content) and an end page such that
 * the Six Degrees API returns a path with degrees <= maxDegrees and every hop is
 * actually present as a clickable link in sanitized content (full validation).
 * - Unlimited start attempts (bounded by safetyLimit) until a valid pair is found.
 * - For each start, tries up to endAttemptsPerStart end candidates.
 * - A 400 response triggers immediate regeneration of the start page.
 */
export interface StartPageData<PageType> { page: PageType; content: string }
export interface EndPageData { pageid: number; title: string; extract: string; fullurl: string }

export async function chooseValidatedStartAndEnd<PageType extends { title: string; pageid?: number; extract?: string }>(
  getRandomStartWithContent: () => Promise<StartPageData<PageType>>,
  getRandomEnd: () => Promise<PageType>,
  getPageContent: (title: string) => Promise<string>,
  options: {
    maxDegrees?: number;
    endAttemptsPerStart?: number;
    safetyLimit?: number;
  } = {}
): Promise<{
  startPageData: StartPageData<PageType>;
  endPage: EndPageData;
  path: string[];
  degrees: number;
}> {
  const maxDegrees = options.maxDegrees ?? 10;
  const endAttemptsPerStart = options.endAttemptsPerStart ?? 2;
  const safetyLimit = options.safetyLimit ?? 10000;

  let startPageData = await getRandomStartWithContent();
  let endPage: EndPageData | null = null;
  let solutionPath: string[] | undefined;

  for (let safety = 0; safety < safetyLimit; safety++) {
    for (let endAttempt = 0; endAttempt < endAttemptsPerStart; endAttempt++) {
      let endCandidate: PageType;
      try {
        endCandidate = await getRandomEnd();
      } catch {
        continue;
      }
      if (endCandidate.title.toLowerCase() === startPageData.page.title.toLowerCase()) continue;
      let resp: Response;
      try {
        resp = await fetch(`${SIX_DEGREES_API}/paths`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: startPageData.page.title, target: endCandidate.title })
        });
      } catch {
        continue; // network error
      }
      if (resp.status === 400) {
        // ambiguous invalid start/target; regenerate start
        console.warn('[SixDegrees] 400 response; regenerating start page');
        startPageData = await getRandomStartWithContent();
        endAttempt = -1; // restart end attempts for new start
        continue;
      }
      if (!resp.ok) continue;
      let json: unknown;
      try { json = await resp.json(); } catch { continue; }
      if (!json || typeof json !== 'object') continue;
      const pages = (json as SixDegreesResponse).pages;
      const paths = (json as SixDegreesResponse).paths;
      if (!paths || !Array.isArray(paths) || paths.length === 0) continue;
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
      if (degrees <= maxDegrees) {
        const fullValid = await validateFullPath(startPageData.content, titles, getPageContent);
        if (fullValid) {
          endPage = {
            pageid: endCandidate.pageid ?? 0,
            title: titles[titles.length - 1]!,
            extract: endCandidate.extract ?? "",
            fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(titles[titles.length - 1]!)}`,
          };
          solutionPath = titles;
          break;
        }
      }
    }
    if (endPage) break;
    startPageData = await getRandomStartWithContent();
  }

  if (!endPage || !solutionPath) {
    throw new Error('Failed to find a solvable start/end pair within safety limit');
  }

  return {
    startPageData,
  endPage,
    path: solutionPath,
    degrees: solutionPath.length - 1,
  };
}

// Removed legacy helpers (findEndPageWithinDegrees / chooseStartAndEndWithinDegrees) after inlining new validated logic.
