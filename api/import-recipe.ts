// api/import-recipe.ts — Vercel Serverless Function
// Turns a recipe link, 1-4 photos/screenshots, or pasted text into a structured recipe.
import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const requestLog: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove entries outside the window
  while (requestLog.length > 0 && requestLog[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestLog.shift();
  }
  if (requestLog.length >= MAX_REQUESTS_PER_WINDOW) return true;
  requestLog.push(now);
  return false;
}

const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type ImageMediaType = (typeof VALID_MEDIA_TYPES)[number];

const CATEGORIES = ['dairy', 'meat', 'poultry', 'fish', 'vegetables', 'fruit', 'grains', 'pasta', 'canned', 'condiments', 'spices', 'snacks', 'drinks', 'baking', 'frozen', 'other'];
const PAGE_TEXT_LIMIT = 20_000;
const HTML_BYTE_LIMIT = 2_000_000;
const IMAGE_BYTE_LIMIT = 1_500_000;
const FETCH_TIMEOUT_MS = 8_000;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ---------- URL safety ----------

export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7));
  if (isIP(v) === 6) {
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
  }
  const parts = v.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/** Rejects non-http(s) URLs and hosts that obviously point inside a network. */
export function checkPublicUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null;
  if (isIP(host) && isPrivateAddress(host)) return null;
  if (!isIP(host) && !host.includes('.')) return null;
  return url;
}

async function resolvesPublic(url: URL): Promise<boolean> {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return !isPrivateAddress(host);
  try {
    const addresses = await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

/** Fetch with redirect checks on every hop, a timeout and a byte cap. */
async function safeFetch(raw: string, maxBytes: number, accept: string): Promise<{ body: Buffer; contentType: string; finalUrl: string } | null> {
  let current = raw;
  for (let hop = 0; hop < 5; hop++) {
    const url = checkPublicUrl(current);
    if (!url || !(await resolvesPublic(url))) return null;

    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': BROWSER_UA, Accept: accept, 'Accept-Language': 'en,pt;q=0.8' },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return null;
      current = new URL(location, url).toString();
      continue;
    }
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return { body: Buffer.concat(chunks), contentType: res.headers.get('content-type') ?? '', finalUrl: url.toString() };
  }
  return null;
}

// ---------- Page extraction ----------

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export function getMeta(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() : null;
}

function isRecipeType(node: any): boolean {
  const type = node?.['@type'];
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
}

function findRecipeNode(node: any): any {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (isRecipeType(node)) return node;
  if (node['@graph']) return findRecipeNode(node['@graph']);
  if (node.mainEntity) return findRecipeNode(node.mainEntity);
  return null;
}

/** Finds a schema.org Recipe in the page's JSON-LD blocks (including @graph arrays). */
export function extractJsonLdRecipe(html: string): any {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      const found = findRecipeNode(JSON.parse(block[1].trim()));
      if (found) return found;
    } catch {
      // malformed JSON-LD is common; keep looking
    }
  }
  return null;
}

function flattenInstructions(node: any): string[] {
  if (!node) return [];
  if (typeof node === 'string') {
    const text = decodeEntities(node.replace(/<br\s*\/?>|<\/?(p|div|li)[^>]*>/gi, ' ').replace(/<[^>]+>/g, ''));
    return [text.replace(/\s+/g, ' ').trim()].filter(Boolean);
  }
  if (Array.isArray(node)) return node.flatMap(flattenInstructions);
  if (node.itemListElement) {
    const heading = node['@type'] === 'HowToSection' && node.name ? [`— ${node.name} —`] : [];
    return [...heading, ...flattenInstructions(node.itemListElement)];
  }
  return flattenInstructions(node.text ?? node.name);
}

function imageUrlOf(image: any): string | null {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return imageUrlOf(image[0]);
  return typeof image.url === 'string' ? image.url : null;
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

export interface PageContent {
  text: string;
  imageUrl: string | null;
  structured: boolean;
}

/** Condenses a fetched page into what Claude needs: the JSON-LD recipe when present, otherwise meta + visible text. */
export function summarizePage(html: string): PageContent {
  const recipe = extractJsonLdRecipe(html);
  if (recipe) {
    const compact = {
      name: recipe.name,
      description: recipe.description,
      recipeYield: recipe.recipeYield,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime,
      recipeIngredient: recipe.recipeIngredient,
      recipeInstructions: flattenInstructions(recipe.recipeInstructions),
    };
    return {
      text: `STRUCTURED RECIPE DATA (schema.org):\n${JSON.stringify(compact, null, 1)}`,
      imageUrl: imageUrlOf(recipe.image) ?? getMeta(html, 'og:image'),
      structured: true,
    };
  }

  const title = getMeta(html, 'og:title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
  const description = getMeta(html, 'og:description') ?? getMeta(html, 'description') ?? '';
  const body = htmlToText(html).slice(0, PAGE_TEXT_LIMIT);
  return {
    text: `PAGE TITLE: ${decodeEntities(title)}\nPREVIEW DESCRIPTION: ${description}\n\nPAGE TEXT:\n${body}`,
    imageUrl: getMeta(html, 'og:image'),
    structured: false,
  };
}

// Instagram's public embed page carries the caption and image without a login wall
export function instagramEmbedUrl(url: URL): string | null {
  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
  const match = url.pathname.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  const kind = match[1] === 'reels' ? 'reel' : match[1];
  return `https://www.instagram.com/${kind}/${match[2]}/embed/captioned/`;
}

function summarizeInstagramEmbed(html: string): PageContent {
  const caption = html.match(/<div class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments"/i)?.[1] ?? '';
  const image = html.match(/<img[^>]+class="EmbeddedMediaImage"[^>]+src="([^"]+)"/i)?.[1] ?? null;
  const text = htmlToText(caption || html).slice(0, PAGE_TEXT_LIMIT);
  return { text: `INSTAGRAM POST CAPTION:\n${text}`, imageUrl: image ? decodeEntities(image) : null, structured: false };
}

async function loadPage(url: URL): Promise<PageContent | null> {
  const embed = instagramEmbedUrl(url);
  if (embed) {
    const page = await safeFetch(embed, HTML_BYTE_LIMIT, 'text/html');
    if (page) return summarizeInstagramEmbed(page.body.toString('utf8'));
  }

  if (/(^|\.)tiktok\.com$/i.test(url.hostname)) {
    const oembed = await safeFetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`, 200_000, 'application/json');
    if (oembed) {
      try {
        const data = JSON.parse(oembed.body.toString('utf8'));
        return { text: `TIKTOK VIDEO CAPTION:\n${data.title ?? ''}`, imageUrl: data.thumbnail_url ?? null, structured: false };
      } catch {
        // fall through to the plain page
      }
    }
  }

  const page = await safeFetch(url.toString(), HTML_BYTE_LIMIT, 'text/html,application/xhtml+xml');
  if (!page) return null;
  return summarizePage(page.body.toString('utf8'));
}

async function downloadImage(imageUrl: string, pageUrl: URL): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const absolute = new URL(imageUrl, pageUrl).toString();
    const image = await safeFetch(absolute, IMAGE_BYTE_LIMIT, 'image/*');
    const mediaType = image?.contentType.split(';')[0].trim() ?? '';
    if (!image || image.body.byteLength === 0 || image.body.byteLength >= IMAGE_BYTE_LIMIT) return null;
    if (!(VALID_MEDIA_TYPES as readonly string[]).includes(mediaType)) return null;
    return { base64: image.body.toString('base64'), mediaType };
  } catch {
    return null;
  }
}

// ---------- Claude ----------

const RECIPE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['found', 'name', 'emoji', 'meal_types', 'servings', 'prep_minutes', 'cook_minutes', 'ingredients', 'steps', 'notes', 'cover_image_index'],
  properties: {
    found: { type: 'boolean' },
    name: { type: 'string' },
    emoji: { type: 'string' },
    meal_types: { type: 'array', items: { type: 'string', enum: ['breakfast', 'lunch', 'dinner'] } },
    servings: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    prep_minutes: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    cook_minutes: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'name', 'quantity', 'unit', 'emoji', 'category', 'staple'],
        properties: {
          text: { type: 'string' },
          name: { type: 'string' },
          quantity: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          unit: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          emoji: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          staple: { type: 'boolean' },
        },
      },
    },
    steps: { type: 'array', items: { type: 'string' } },
    notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    cover_image_index: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
  },
};

const SYSTEM_PROMPT = `You are the recipe importer for a family meal-planning app. You receive a recipe as web page content, a social media caption, pasted text, or photos/screenshots (cookbook pages, Instagram captions, handwritten cards, a plated dish). Extract the recipe faithfully.

Output rules:
- "found": false when the content has no actual recipe (e.g. only a video title, a login page, or a dish photo with no ingredients or method). Fill the other fields with empty values in that case.
- "name": the dish name, short and natural, in the source language.
- "emoji": one emoji for the dish.
- "meal_types": which of breakfast, lunch, dinner the dish suits (at least one).
- "servings", "prep_minutes", "cook_minutes": integers when stated or clearly inferable, otherwise null.
- "ingredients": one entry per ingredient line, in recipe order.
  - "text": the original line exactly as written, in the source language (e.g. "2 dentes de alho picados").
  - "name": a short generic ENGLISH grocery name, capitalized, no brand, size, preparation or packaging (e.g. "Garlic", "Chicken Breast", "Coconut Milk", "Penne Pasta"). This name is matched against the family's pantry, so the same product must always get the same name.
  - "quantity": a number (convert fractions: "1/2" -> 0.5, "1 ½" -> 1.5); null for "to taste" or when absent. For ranges use the higher value. The quantity must be counted in the chosen unit: "400g can chopped tomatoes" is 1 can (or 400 g), never 400 can.
  - "unit": one of g, kg, ml, L, item, can, bottle, pack, bag, box, bunch, loaf when it fits; otherwise the cooking unit in English singular (tsp, tbsp, cup, clove, pinch, slice). Use null for plain counts like "3 eggs". Convert "oz"/"lb" only if the source gives no metric amount (1 oz = 28 g, 1 lb = 454 g).
  - "emoji": one emoji for the ingredient; "category": the closest grocery category.
  - "staple": true only for small seasoning-sized amounts of things families always have and never shop for per recipe: salt, black pepper, water, and oil or sugar used by the pinch, splash, "to taste" or up to about 2 tbsp. A real quantity of the same product (e.g. 2 cups of sugar in a cake, 1 cup of oil) is NOT a staple, and nothing outside that list (baking powder, spices, stock, butter...) is ever a staple.
- "steps": the method as clear, separate steps in the source language, without numbering. Keep section headings (e.g. "For the sauce") as their own short step. Do not invent steps; if the source only has ingredients, return an empty array.
- "notes": useful tips, substitutions or storage advice from the source, otherwise null. Never include hashtags, promotions or "follow me" text.
- "cover_image_index": when photos are provided, the 0-based index of the photo that best shows the finished dish; null if none shows the dish (e.g. only text screenshots) or no photos were given.`;

export function sanitizeRecipe(raw: any) {
  const int = (v: any) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);
  const str = (v: any, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const ingredients = (Array.isArray(raw?.ingredients) ? raw.ingredients : [])
    .slice(0, 80)
    .map((i: any) => ({
      text: str(i?.text) || str(i?.name),
      name: str(i?.name, 80),
      quantity: typeof i?.quantity === 'number' && Number.isFinite(i.quantity) && i.quantity > 0 ? Math.round(i.quantity * 100) / 100 : null,
      unit: str(i?.unit, 20) || null,
      emoji: str(i?.emoji, 16) || '🥄',
      category: CATEGORIES.includes(i?.category) ? i.category : 'other',
      staple: i?.staple === true,
    }))
    .filter((i: any) => i.name);
  const mealTypes = (Array.isArray(raw?.meal_types) ? raw.meal_types : []).filter((t: any) => ['breakfast', 'lunch', 'dinner'].includes(t));

  return {
    name: str(raw?.name, 120),
    emoji: str(raw?.emoji, 16) || '🍽️',
    meal_types: mealTypes.length ? mealTypes : ['lunch', 'dinner'],
    servings: int(raw?.servings),
    prep_minutes: int(raw?.prep_minutes),
    cook_minutes: int(raw?.cook_minutes),
    ingredients,
    steps: (Array.isArray(raw?.steps) ? raw.steps : []).map((s: any) => str(s, 2000)).filter(Boolean).slice(0, 60),
    notes: str(raw?.notes, 2000) || null,
  };
}

const NO_RECIPE_MESSAGE =
  "Couldn't find a recipe there. If it's an Instagram or TikTok video, paste the caption text or add screenshots of it instead.";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (isRateLimited()) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    const { url, images, text } = req.body || {};
    const hasUrl = typeof url === 'string' && url.trim().length > 0;
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const imageList: { data: string; mediaType: ImageMediaType }[] = Array.isArray(images) ? images : [];

    if (!hasUrl && !hasText && imageList.length === 0) {
      return res.status(400).json({ error: 'Send a link, photos or text' });
    }
    if (imageList.length > 4) {
      return res.status(400).json({ error: 'Up to 4 photos at a time' });
    }
    if (imageList.some((img) => typeof img?.data !== 'string' || !VALID_MEDIA_TYPES.includes(img.mediaType))) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }
    if (hasText && text.length > 15_000) {
      return res.status(400).json({ error: 'Text too long' });
    }

    const content: Anthropic.ContentBlockParam[] = [];
    let sourceUrl: string | null = null;
    let linkImage: { base64: string; mediaType: string } | null = null;
    const warnings: string[] = [];

    if (hasUrl) {
      const parsed = checkPublicUrl(url);
      if (!parsed) return res.status(400).json({ error: "That doesn't look like a valid public link" });
      sourceUrl = parsed.toString();

      const page = await loadPage(parsed).catch(() => null);
      if (!page || page.text.replace(/\s/g, '').length < 40) {
        return res.status(422).json({ error: NO_RECIPE_MESSAGE, fallback: 'paste_or_screenshot' });
      }
      if (page.imageUrl) linkImage = await downloadImage(page.imageUrl, parsed);
      content.push({ type: 'text', text: `SOURCE LINK: ${sourceUrl}\n\n${page.text}` });
    }

    imageList.forEach((img, i) => {
      content.push({ type: 'text', text: `Photo ${i}:` });
      content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } });
    });

    if (hasText) {
      content.push({ type: 'text', text: `PASTED RECIPE TEXT:\n${text.trim()}` });
    }
    content.push({ type: 'text', text: 'Extract the recipe.' });

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      // Fast extraction endpoint: skip thinking; schema-constrained JSON output
      thinking: { type: 'disabled' },
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
      messages: [{ role: 'user', content }],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ error: NO_RECIPE_MESSAGE, fallback: 'paste_or_screenshot' });
    }
    if (response.stop_reason === 'max_tokens') {
      warnings.push('The recipe was very long and may be cut off — check the last steps.');
    }

    const block = response.content.find((b) => b.type === 'text');
    const parsed = JSON.parse(block && block.type === 'text' ? block.text : '{}');
    const recipe = sanitizeRecipe(parsed);

    if (parsed?.found === false || (recipe.ingredients.length === 0 && recipe.steps.length === 0)) {
      return res.status(422).json({ error: NO_RECIPE_MESSAGE, fallback: 'paste_or_screenshot' });
    }
    if (hasUrl && recipe.steps.length === 0) {
      warnings.push("Only the ingredients were found — the method may be in the video. Add the steps by hand or from a screenshot.");
    }

    const coverIndex = Number.isInteger(parsed?.cover_image_index) && imageList[parsed.cover_image_index] ? parsed.cover_image_index : null;

    return res.status(200).json({
      recipe: {
        ...recipe,
        source_url: sourceUrl,
        // Link imports ship the preview image back (its CDN URL may expire); photo imports point at the uploaded photo
        image_base64: linkImage?.base64 ?? null,
        image_media_type: linkImage?.mediaType ?? null,
        cover_image_index: coverIndex,
      },
      warnings,
    });
  } catch (error: any) {
    console.error('Recipe import error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to import recipe' });
  }
}
