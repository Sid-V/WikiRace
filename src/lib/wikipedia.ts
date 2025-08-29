// Wikipedia API service
export interface WikipediaPage {
  pageid: number;
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  fullurl: string;
  content?: string;
}

export interface GameSession {
  id: string;
  startPage: WikipediaPage;
  endPage: WikipediaPage;
  currentPage: WikipediaPage;
  path: WikipediaPage[];
  startTime: number;
  endTime?: number;
  completed: boolean;
  solutionPath?: string[];
  solutionDistance?: number;
}

const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php";

// --------------------
// Typed Wikipedia API helpers
// --------------------

interface RandomItem { id: number; ns: number; title: string }
interface RandomQueryResponse { query: { random: RandomItem[] } }
interface ApiError { error: { code?: string; info: string } }

function isRandomQueryResponse(data: unknown): data is RandomQueryResponse {
  if (!data || typeof data !== 'object') return false;
  const random = (data as { query?: { random?: unknown } }).query?.random;
  return Array.isArray(random) && random.every(r => !!r && typeof r === 'object' && 'title' in (r as object));
}

interface ParseBlock { "*": string }
interface ParseResponseShape { parse: { text: ParseBlock; images?: string[] } }

function isParseResponseShape(data: unknown): data is ParseResponseShape {
  if (!data || typeof data !== 'object') return false;
  const text = (data as { parse?: { text?: { ['*']?: unknown } } }).parse?.text;
  return typeof text?.['*'] === 'string';
}

interface ImageInfoItem { url: string; thumburl?: string }
interface ImageInfoPage { title: string; imageinfo?: ImageInfoItem[] }
interface ImageInfoResponse { query?: { pages?: Record<string, ImageInfoPage> } }
function isImageInfoResponse(data: unknown): data is ImageInfoResponse {
  return !!data && typeof data === 'object';
}

// Simple cache for page content to avoid duplicate API calls
const contentCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

function addToCache(key: string, content: string) {
  if (contentCache.size >= MAX_CACHE_SIZE) {
    const firstKey = contentCache.keys().next().value;
    if (firstKey) {
      contentCache.delete(firstKey);
    }
  }
  contentCache.set(key, content);
}

// Get a random Wikipedia page (lightweight - just title and basic info)
export async function getRandomPage(): Promise<WikipediaPage> {
  const randomParams = new URLSearchParams({
    action: "query",
    format: "json",
    list: "random",
    rnnamespace: "0", // Main namespace only
    rnlimit: "1",
    origin: "*",
  });

  const randomResponse = await fetch(`${WIKIPEDIA_API_BASE}?${randomParams}`);
  const randomJson: unknown = await randomResponse.json();
  if (!isRandomQueryResponse(randomJson)) {
    const apiErr = (randomJson as ApiError)?.error?.info;
    throw new Error(apiErr ?? 'Unexpected random page response shape');
  }
  const randomTitle = randomJson.query.random[0]!.title;

  // Return minimal page object - we'll get full content when needed
  return {
    pageid: 0, // We don't need the real pageid for the game
    title: randomTitle,
    extract: "",
    fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(randomTitle)}`,
  };
}

// Get a random Wikipedia page with full content (for start page)
export async function getRandomPageWithContent(): Promise<{ page: WikipediaPage; content: string }> {
  const randomParams = new URLSearchParams({
    action: "query",
    format: "json",
    list: "random",
    rnnamespace: "0", // Main namespace only
    rnlimit: "1",
    origin: "*",
  });

  const randomResponse = await fetch(`${WIKIPEDIA_API_BASE}?${randomParams}`);
  const randomJson: unknown = await randomResponse.json();
  if (!isRandomQueryResponse(randomJson)) {
    const apiErr = (randomJson as ApiError)?.error?.info;
    throw new Error(apiErr ?? 'Unexpected random page response shape');
  }
  const randomTitle = randomJson.query.random[0]!.title;

  // Get the content immediately
  const content = await getPageContent(randomTitle);
  
  const page: WikipediaPage = {
    pageid: 0,
    title: randomTitle,
    extract: "",
    fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(randomTitle)}`,
    content: content,
  };

  return { page, content };
}

// Get full page content with HTML for rendering
export async function getPageContent(title: string, signal?: AbortSignal): Promise<string> {
  // Check cache first
  const cacheKey = title.toLowerCase().trim();
  const cachedContent = contentCache.get(cacheKey);
  if (cachedContent) {
    return cachedContent;
  }

  const params = new URLSearchParams({
    action: "parse",
    format: "json",
    page: title,
    prop: "text|images|sections",
    disableeditsection: "false", // Keep edit sections for authentic look
    disabletoc: "false", // Keep table of contents
    mobileformat: "false", // Use desktop format for full content
    origin: "*",
  });

  const response = await fetch(`${WIKIPEDIA_API_BASE}?${params}` , { signal });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch page`);
  }

  const dataJson: unknown = await response.json();
  const apiErr = (dataJson as ApiError)?.error?.info;
  if (apiErr) {
    throw new Error(apiErr);
  }
  if (!isParseResponseShape(dataJson)) {
    throw new Error('Unexpected parse response shape');
  }

  let content = dataJson.parse.text['*'];

  // Get image URLs if available
  const images = dataJson.parse.images ?? [];
  
  // Minimal cleanup - only remove audio/video and enhance images
  content = removeAudioVideo(content);
  // Defer expensive image URL enhancement until after main content cleanup (progress perceived faster)
  content = await enhanceImagesWithUrls(content, images, title, signal);
  content = formatLinksOnly(content);
  content = addWikipediaStyles(content);
  
  // Cache the processed content
  addToCache(cacheKey, content);
  
  return content;
}

// Enhance images with proper URLs from Wikipedia API while preserving layout
async function enhanceImagesWithUrls(content: string, imageList: string[], _pageTitle: string, signal?: AbortSignal): Promise<string> {
  if (!imageList || imageList.length === 0) {
    return content;
  }

  // Get image info for all images to ensure proper display
  // Limit to first 20 images for speed; can be tuned
  const imagesToProcess = imageList.slice(0, 20);
  
  try {
    const imageParams = new URLSearchParams({
      action: "query",
      format: "json",
      titles: imagesToProcess.join('|'),
      prop: "imageinfo",
      iiprop: "url|size",
      iiurlwidth: "800",
      origin: "*",
    });

  if (signal?.aborted) return content;
  const imageResponse = await fetch(`${WIKIPEDIA_API_BASE}?${imageParams}`, { signal });
    const imageJson: unknown = await imageResponse.json();
    if (isImageInfoResponse(imageJson)) {
      const pages = imageJson.query?.pages;
      if (pages) {
        const imageMap = new Map<string, ImageInfoItem>();
        Object.values(pages).forEach((page) => {
          const imageInfo = page.imageinfo?.[0];
          if (imageInfo) {
            const filename = page.title.replace('File:', '');
            imageMap.set(filename, {
              url: imageInfo.url,
              thumburl: imageInfo.thumburl
            });
          }
        });
        imageMap.forEach(({ url, thumburl }, filename) => {
          if (signal?.aborted) return; // stop processing if aborted
          const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const patterns = [
            new RegExp(`src="[^"]*${escapedFilename}[^"]*"`, 'gi'),
            new RegExp(`src="[^"]*File:${escapedFilename}[^"]*"`, 'gi'),
            new RegExp(`src="/wiki/File:${escapedFilename}[^"]*"`, 'gi')
          ];
            patterns.forEach(pattern => {
            content = content.replace(pattern, `src="${thumburl ?? url}"`);
          });
        });
      }
    }
  } catch (error) {
    console.warn('Failed to enhance images:', error);
  }
  
  // Fix any remaining broken image references
  content = content.replace(/src="\/wiki\/File:([^"]+)"/gi, (_match: string, filename: string) => {
    return `src="https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}"`;
  });
  
  return content;
}

// Remove only audio/video content and top notices - keep everything else exactly as Wikipedia shows it
function removeAudioVideo(html: string): string {
  let content = html;
  
  // Remove audio/video elements only
  content = content.replace(/<audio[\s\S]*?<\/audio>/gi, '');
  content = content.replace(/<video[\s\S]*?<\/video>/gi, '');
  content = content.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  
  // Remove Wikipedia notice boxes at the top (disambiguation, cleanup notices, etc.)
  content = content.replace(/<table[^>]*class="[^"]*(?:ambox|dmbox|tmbox|cmbox|fmbox|imbox|ombox)[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '');
  content = content.replace(/<div[^>]*class="[^"]*(?:hatnote|dablink|rellink)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  // NOTE: We intentionally keep navboxes to preserve intra-article links used by Six Degrees paths.
  // If we want to visually hide them while retaining links, we can do that via CSS on .navbox.
  // content = content.replace(/<div[^>]*class="[^"]*navbox[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // Remove "For other uses" and similar disambiguation notices
  content = content.replace(/<div[^>]*class="[^"]*(?:noprint|plainlinks|hlist)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // Remove maintenance templates and notices (keep navbox-style navigation retained above)
  content = content.replace(/<div[^>]*(?:role="note"|class="[^"]*(?:mbox-|notice)[^"]*")[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // Remove External links section
  content = content.replace(/<h2[^>]*><span[^>]*>External links<\/span>[\s\S]*?(?=<h[12][^>]*>|$)/gi, '');
  content = content.replace(/<h2[^>]*>External links[\s\S]*?(?=<h[12][^>]*>|$)/gi, '');
  
  // Fix image URLs to use HTTPS
  content = content.replace(/\/\/upload\.wikimedia\.org/g, 'https://upload.wikimedia.org');
  content = content.replace(/src="\/\/upload\.wikimedia\.org/g, 'src="https://upload.wikimedia.org');
  
  return content;
}

// Format link destination according to game rules
// (removed unused formatLink helper)

// Format only the links to make them clickable for the game, preserve everything else
function formatLinksOnly(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
  
  // Fix image sources to ensure they load properly
  const images = fragment.querySelectorAll('img');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      let newSrc = src;
      
      // Handle relative URLs
      if (src.startsWith('//')) {
        newSrc = 'https:' + src;
      } else if (src.startsWith('/')) {
        newSrc = 'https://en.wikipedia.org' + src;
      }
      
      img.setAttribute('src', newSrc);
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    }
  });
  
  // Process Wikipedia links only to make them clickable for the game
  const links = fragment.querySelectorAll('a[href]');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    // Skip anchor links
    if (href.startsWith('#')) {
      link.removeAttribute('href');
      (link as HTMLElement).style.color = 'inherit';
      (link as HTMLElement).style.textDecoration = 'none';
      return;
    }
    
    // Handle Wikipedia article links only
    if (href.startsWith('/wiki/')) {
      const pageName = href.substring(6); // Remove "/wiki/"
      const decodedName = decodeURIComponent(pageName);
      
      // Only allow main namespace articles and some specific namespaces
      if (decodedName.includes(':')) {
        // Allow only Portal and List_of_ pages
        if (!decodedName.startsWith('Portal:') && !decodedName.startsWith('List_of_')) {
          // Remove href for all other namespace pages
          link.removeAttribute('href');
          (link as HTMLElement).style.color = 'inherit';
          (link as HTMLElement).style.textDecoration = 'none';
          return;
        }
      }
      
      // Make it a game-clickable Wikipedia link
      const cleanPageName = decodedName.replace(/_/g, ' ');
      link.setAttribute('href', '#');
      link.setAttribute('data-wiki-page', cleanPageName);
      (link as HTMLElement).style.color = '#0645ad';
      (link as HTMLElement).style.textDecoration = 'underline';
      (link as HTMLElement).style.cursor = 'pointer';
    } else {
      // Remove all external links - make them non-clickable
      link.removeAttribute('href');
      (link as HTMLElement).style.color = 'inherit';
      (link as HTMLElement).style.textDecoration = 'none';
    }
  });
  
  return template.innerHTML;
}

// Add Wikipedia wrapper div - styles are now in globals.css
function addWikipediaStyles(html: string): string {
  
  return `<div class="wikipedia-content">${html}</div>`;
}



