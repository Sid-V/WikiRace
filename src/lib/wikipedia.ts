// Wikipedia API client

export interface WikipediaPage {
  pageid: number;
  title: string;
  extract: string;
  thumbnail?: { source: string; width: number };
  fullurl: string;
  content?: string;
}

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';

// API response type definitions
interface RandomItem { id: number; ns: number; title: string }
interface RandomQueryResponse { query: { random: RandomItem[] } }
interface ApiError { error: { code?: string; info: string } }
type ParseText = string | { '*': string };
interface ParseResponseShape { parse: { text: ParseText; images?: string[] } }
interface ImageInfoItem { url: string; thumburl?: string }
interface ImageInfoPage { title: string; imageinfo?: ImageInfoItem[] }
interface ImageInfoResponse { query?: { pages?: Record<string, ImageInfoPage> } }

// Type guards for API responses
const isRandomQueryResponse = (d: unknown): d is RandomQueryResponse => {
  if (!d || typeof d !== 'object') return false;
  const obj = d as Record<string, unknown>;
  const query = obj.query;
  if (!query || typeof query !== 'object') return false;
  const random = (query as Record<string, unknown>).random;
  return Array.isArray(random) && random.every((r: unknown) => r && typeof r === 'object' && 'title' in r);
};

const isParseResponseShape = (d: unknown): d is ParseResponseShape => {
  if (!d || typeof d !== 'object') return false;
  const obj = d as Record<string, unknown>;
  const parse = obj.parse;
  if (!parse || typeof parse !== 'object') return false;
  const text = (parse as Record<string, unknown>).text;
  if (typeof text === 'string') return true;
  if (text && typeof text === 'object') {
    const textObj = text as Record<string, unknown>;
    return '*' in textObj && typeof textObj['*'] === 'string';
  }
  return false;
};

const isImageInfoResponse = (d: unknown): d is ImageInfoResponse => !!d && typeof d === 'object';

// Content caching with LRU eviction
const CACHE_VERSION = 12;
const contentCache = new Map<string, string>();
const MAX_CACHE = 40;
const cacheKey = (title: string) => `${CACHE_VERSION}:${title.toLowerCase().trim()}`;
const putCache = (key: string, value: string) => {
  if (contentCache.size >= MAX_CACHE) {
    const first = contentCache.keys().next().value;
    if (first) contentCache.delete(first);
  }
  contentCache.set(key, value);
};

export const clearWikipediaCache = () => contentCache.clear();

// Fetch page content from Wikipedia API
const fetchParse = async (title: string, signal?: AbortSignal, skin?: 'minerva'): Promise<ParseResponseShape> => {
  const params = new URLSearchParams({
    action: 'parse', format: 'json', formatversion: '2', page: title,
    prop: 'text|images', disableeditsection: '1', redirects: 'true', origin: '*'
  });
  if (skin) params.set('useskin', skin);
  const resp = await fetch(`${WIKIPEDIA_API_BASE}?${params}`, { signal });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json: unknown = await resp.json();
  if (!isParseResponseShape(json)) throw new Error('Unexpected parse response');
  return json;
};

export const getRandomPage = async (): Promise<WikipediaPage> => {
  const params = new URLSearchParams({
    action: 'query', format: 'json', list: 'random',
    rnnamespace: '0', rnlimit: '1', origin: '*'
  });
  const resp = await fetch(`${WIKIPEDIA_API_BASE}?${params}`);
  const json: unknown = await resp.json();
  if (!isRandomQueryResponse(json)) {
    const apiErr = (json as ApiError)?.error?.info;
    throw new Error(apiErr || 'Failed to get random page');
  }
  const title = json.query.random[0]!.title;
  return {
    pageid: 0, title, extract: '',
    fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`
  };
};

const extractHtml = (parse: ParseResponseShape): string => {
  const t = parse.parse.text;
  return typeof t === 'string' ? t : t['*'];
};

// Clean and optimize Wikipedia HTML content
const sanitizeContent = (html: string): { content: string; navboxes: string[] } => {
  const navboxes = html.match(/<div[^>]*class="[^"]*navbox[^"]*"[\s\S]*?<\/div>/gi) ?? [];
  
  const template = document.createElement('template');
  template.innerHTML = html;
  const doc = template.content;
  
  // Batch remove unwanted elements
  const removeSelectors = [
    'script', 'audio', 'video', 'iframe',
    '.ambox', '.dmbox', '.tmbox', '.cmbox', '.fmbox', '.imbox', '.ombox',
    '.hatnote', '.dablink', '.rellink',
    '[role="note"]', '[class*="mbox-"]', '[class*="notice"]'
  ];
  removeSelectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });
  
  // Clean attributes and fix images in single pass
  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on') || /mfTempOpenSection/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
    
    if (el.tagName === 'IMG') {
      const src = el.getAttribute('src');
      if (src) {
        let newSrc = src;
        if (src.startsWith('//')) newSrc = 'https:' + src;
        else if (src.startsWith('/')) newSrc = 'https://en.wikipedia.org' + src;
        else if (!src.startsWith('http')) newSrc = 'https://upload.wikimedia.org' + src;
        el.setAttribute('src', newSrc);
        el.setAttribute('loading', 'lazy');
        el.setAttribute('decoding', 'async');
      }
    }
  });
  
  // Process links efficiently
  doc.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href') ?? '';
    
    if (href.startsWith('#')) {
      link.removeAttribute('href');
      (link as HTMLElement).style.textDecoration = 'none';
      return;
    }
    
    const wikiMatch = /^(?:https?:\/\/(?:\w+\.)*wikipedia\.org)?\/wiki\/(.+)$/i.exec(href) ?? 
                     /^\/\/(?:\w+\.)*wikipedia\.org\/wiki\/(.+)$/i.exec(href);
    
    if (wikiMatch?.[1]) {
      const pageName = decodeURIComponent(wikiMatch[1]);
      if (pageName.includes(':') && !pageName.startsWith('Portal:') && !pageName.startsWith('List_of_')) {
        link.removeAttribute('href');
        (link as HTMLElement).style.textDecoration = 'none';
      } else {
        link.setAttribute('href', '#');
        link.setAttribute('data-wiki-page', pageName.replace(/_/g, ' '));
        (link as HTMLElement).style.cursor = 'pointer';
      }
    } else {
      link.removeAttribute('href');
      (link as HTMLElement).style.textDecoration = 'none';
    }
  });
  
  // Expand collapsible content
  ['.mw-collapsible', '.navbox', '.vertical-navbox'].forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => {
      el.classList.remove('mw-collapsed', 'collapsed', 'autocollapse');
      (el as HTMLElement).style.display = '';
      el.querySelectorAll('.mw-collapsible-content').forEach(content => {
        (content as HTMLElement).style.display = '';
      });
    });
  });
  
  // Replace toggle links and mark external sections
  doc.querySelectorAll('a.mw-collapsible-text').forEach(toggle => {
    const span = document.createElement('span');
    span.className = 'navbox-toggle';
    span.textContent = '(links)';
    toggle.replaceWith(span);
  });
  
  doc.querySelectorAll('h2').forEach(h2 => {
    if (/external\s+links/i.test(h2.textContent ?? '')) {
      h2.classList.add('ext-links');
      h2.setAttribute('data-ext-links', '');
    }
  });
  
  return { content: template.innerHTML, navboxes };
};

const enhanceImages = async (html: string, imageNames: string[], signal?: AbortSignal): Promise<string> => {
  if (!imageNames.length) return html;
  const batch = imageNames.slice(0, 20);
  try {
    const params = new URLSearchParams({
      action: 'query', format: 'json', titles: batch.join('|'), 
      prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: '800', origin: '*'
    });
    if (signal?.aborted) return html;
    const resp = await fetch(`${WIKIPEDIA_API_BASE}?${params}`, { signal });
    const json: unknown = await resp.json();
    if (!isImageInfoResponse(json)) return html;
    const pages = json.query?.pages;
    if (!pages) return html;
    
    const imageMap = new Map<string, ImageInfoItem>();
    if (pages && typeof pages === 'object') {
      Object.values(pages).forEach(p => {
        const ii = p.imageinfo?.[0];
        if (ii) imageMap.set(p.title.replace('File:', ''), { url: ii.url, thumburl: ii.thumburl });
      });
    }
    
    imageMap.forEach(({ url, thumburl }, name) => {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [
        new RegExp(`src="[^"]*${esc}[^"]*"`, 'gi'),
        new RegExp(`src="[^"]*File:${esc}[^"]*"`, 'gi'),
        new RegExp(`src="/wiki/File:${esc}[^"]*"`, 'gi')
      ];
      patterns.forEach(r => { html = html.replace(r, `src="${thumburl ?? url}"`); });
    });
  } catch (e) { 
    console.warn('Image enhancement failed', e); 
  }
  
  return html.replace(/src="\/wiki\/File:([^"]+)"/gi, 
    (_, f: string) => `src="https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}"`);
};

export const getPageContent = async (title: string, signal?: AbortSignal): Promise<string> => {
  const key = cacheKey(title);
  const cached = contentCache.get(key);
  if (cached) return cached;
  
  let parse: ParseResponseShape;
  try { 
    parse = await fetchParse(title, signal); 
  } catch { 
    parse = await fetchParse(title, signal, 'minerva'); 
  }
  
  const rawHtml = extractHtml(parse);
  const { content, navboxes } = sanitizeContent(rawHtml);
  let html = await enhanceImages(content, parse.parse.images ?? [], signal);
  
  // Restore navboxes if lost
  if (navboxes.length && !/class="navbox"/i.test(html)) {
    html += `\n<div class="navboxes-fallback">${navboxes.join('\n')}</div>`;
  }
  
  html = `<div class="wikipedia-content">${html}</div>`;
  putCache(key, html);
  return html;
};

export const getPageContentProgressive = async (
  title: string, 
  onEnhanced?: (html: string) => void, 
  signal?: AbortSignal
): Promise<string> => {
  const key = cacheKey(title);
  const cached = contentCache.get(key);
  if (cached) return cached;
  
  let parse: ParseResponseShape;
  try { 
    parse = await fetchParse(title, signal); 
  } catch { 
    parse = await fetchParse(title, signal, 'minerva'); 
  }
  
  const rawHtml = extractHtml(parse);
  const { content, navboxes } = sanitizeContent(rawHtml);
  
  let initial = content;
  if (navboxes.length && !/class="navbox"/i.test(initial)) {
    initial += `\n<div class="navboxes-fallback">${navboxes.join('\n')}</div>`;
  }
  
  initial = `<div class="wikipedia-content">${initial}</div>`;
  putCache(key, initial);
  
  // Enhance images asynchronously
  void (async () => {
    try {
      const upgraded = await enhanceImages(initial, parse.parse.images ?? [], signal);
      putCache(key, upgraded);
      onEnhanced?.(upgraded);
    } catch { /* ignore */ }
  })();
  
  return initial;
};




