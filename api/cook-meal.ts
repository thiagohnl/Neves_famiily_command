// api/cook-meal.ts — Vercel Serverless Function
// Given a cooked meal's name and the current pantry, proposes which
// pantry items were consumed and how much of each.
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
    const { mealName, pantryItems } = req.body || {};

    if (!mealName || typeof mealName !== 'string') {
      return res.status(400).json({ error: 'Missing meal name' });
    }
    if (!Array.isArray(pantryItems) || pantryItems.length === 0) {
      return res.status(200).json({ deductions: [] });
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a pantry tracking assistant for a family meal app. A family just cooked a meal. Given the meal's name and their current pantry stock, estimate which pantry items were consumed and how much of each, so the app can deduct them.

Assume a typical family-sized batch (about 4 portions) unless the meal name suggests otherwise.

Rules:
1. Only reference items from the provided pantry list, using their exact "id". Never invent items.
2. "quantity" is the amount consumed, expressed in that item's own unit. It must be greater than 0 and must not exceed the item's available quantity.
3. Only include items that are plausibly ingredients of this meal. When unsure whether an item was used, leave it out.
4. Skip negligible seasoning amounts (salt, pepper, a splash of oil) — only include a seasoning or condiment if the meal consumes a meaningful amount of it.
5. Prefer whole-package amounts when packaging makes partial use unlikely (e.g. a bag of beans that gets soaked whole), otherwise estimate realistic partial amounts.
6. The meal name may be in any language (e.g. Brazilian dishes like feijoada).
7. If nothing in the pantry matches the meal, return an empty array.

Return ONLY valid JSON in this exact format (no markdown, no code fences):
{ "deductions": [ { "id": "...", "name": "...", "quantity": 1 } ] }`;

    const pantryContext = pantryItems.map((p: any) => ({
      id: p.id,
      name: p.name,
      available: p.quantity,
      unit: p.unit,
      location: p.location,
    }));

    const userMessage = `MEAL COOKED: ${mealName}

CURRENT PANTRY (${pantryContext.length} items):
${JSON.stringify(pantryContext, null, 1)}

Which items were consumed, and how much of each?`;

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      // Fast JSON-only endpoint: skip thinking; new tokenizer needs extra output headroom
      thinking: { type: 'disabled' },
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    const deductions = Array.isArray(parsed?.deductions) ? parsed.deductions : [];
    return res.status(200).json({ deductions });
  } catch (error: any) {
    console.error('Cook meal error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to estimate ingredients' });
  }
}
