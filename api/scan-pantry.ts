// api/scan-pantry.ts — Vercel Serverless Function
// Analyzes a photo of groceries — or a spoken/typed description — and returns structured pantry items.
import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const { image, mediaType, text } = req.body || {};

    const hasImage = typeof image === 'string' && image.length > 0;
    const hasText = typeof text === 'string' && text.trim().length > 0;

    if (!hasImage && !hasText) {
      return res.status(400).json({ error: 'Missing image or text' });
    }
    if (hasImage && !VALID_MEDIA_TYPES.includes(mediaType)) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }
    if (hasText && text.length > 4000) {
      return res.status(400).json({ error: 'Text too long' });
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a grocery scanning assistant for a family pantry app. You will receive either a photo of groceries (items on a counter, in bags, a receipt, or an open fridge/freezer/cupboard) or a spoken/typed description of groceries (dictated while unpacking, possibly rambling and in any language). Identify every distinct food or household grocery item.

For each item return:
- "name": short generic product name, capitalized (e.g. "Frozen Peas", "Chicken Breast", "Penne Pasta"). No brand names unless needed to identify the item.
- "emoji": a single emoji that best represents the item.
- "category": one of exactly: dairy, meat, poultry, fish, vegetables, fruit, grains, pasta, canned, condiments, spices, snacks, drinks, baking, frozen, other.
- "location": where this item is normally stored — one of exactly: fridge, freezer, cupboard. Frozen goods go to freezer; fresh dairy/meat/produce to fridge; dry, canned and shelf-stable goods to cupboard.
- "quantity": the number visible (default 1 if unclear).
- "unit": one of exactly: item, kg, g, L, ml, pack, bag, bottle, can, box, bunch, loaf. Choose what matches the packaging (e.g. a bag of frozen peas = "bag").

Rules:
1. Only include items you can actually identify — do not guess wildly.
2. Merge duplicates into one entry with a higher quantity.
3. Ignore non-grocery objects (hands, tables, shopping bags themselves) and filler speech ("um", "let's see", "we also got").
4. If the photo is a receipt, parse the line items instead.
5. Item names always in English, even if the description is in another language. If the speaker names a storage place ("in the freezer we have..."), respect it over the default location.
6. If you cannot identify any grocery items, return an empty array.

Return ONLY valid JSON in this exact format (no markdown, no code fences):
{ "items": [ { "name": "...", "emoji": "...", "category": "...", "location": "...", "quantity": 1, "unit": "..." } ] }`;

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      // Fast JSON-only endpoint: skip thinking; new tokenizer needs extra output headroom
      thinking: { type: 'disabled' },
      max_tokens: 3500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: hasImage
            ? [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: image },
                },
                { type: 'text', text: 'Identify all grocery items in this photo.' },
              ]
            : [
                {
                  type: 'text',
                  text: `Identify all grocery items in this description:\n\n${text.trim()}`,
                },
              ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return res.status(200).json({ items });
  } catch (error: any) {
    console.error('Pantry scan error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to scan photo' });
  }
}
