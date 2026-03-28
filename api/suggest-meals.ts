// api/suggest-meals.ts — Vercel Serverless Function
import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
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
    const { pantryItems, savedMeals, recentMealPlan, favorites, expiringItems } = req.body;

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a family meal planning assistant. Based on the family's pantry stock, saved meals, and preferences, suggest meals for 7 days (Monday through Sunday).

Rules:
1. Prioritize using ingredients that are expiring soon
2. Include family favorites when possible
3. Ensure variety — avoid repeating meals from recent weeks
4. Suggest practical meals that can be made from available ingredients
5. You may suggest NEW meals not in the saved library if the ingredients are available
6. Keep it family-friendly and realistic

Return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "days": [
    {
      "day": "Monday",
      "breakfast": { "name": "...", "emoji": "...", "reason": "...", "is_new": true/false },
      "lunch": { "name": "...", "emoji": "...", "reason": "...", "is_new": true/false },
      "dinner": { "name": "...", "emoji": "...", "reason": "...", "is_new": true/false }
    }
  ]
}

Where "is_new" is true if the meal is NOT in the saved meals library, and "reason" is a brief explanation (e.g., "Uses chicken expiring Thursday", "Family favorite").`;

    // Summarize data to minimize tokens
    const pantryContext = (pantryItems || []).map((p: any) => ({
      name: p.name,
      qty: `${p.quantity} ${p.unit}`,
      location: p.location,
      ...(p.expiry_date ? { expires: p.expiry_date } : {}),
    }));

    const mealsContext = (savedMeals || []).map((m: any) => ({
      name: m.name,
      types: m.meal_types,
    }));

    const recentContext = (recentMealPlan || []).map((m: any) => ({
      date: m.date,
      slot: m.slot || m.meal_type,
      name: m.meal_name,
    }));

    const userMessage = `Here's what the family has available:

PANTRY STOCK (${pantryContext.length} items):
${JSON.stringify(pantryContext, null, 1)}

SAVED MEALS LIBRARY (${mealsContext.length} meals):
${JSON.stringify(mealsContext, null, 1)}

FAMILY FAVORITES: ${JSON.stringify(favorites || [])}

ITEMS EXPIRING WITHIN 5 DAYS:
${JSON.stringify((expiringItems || []).map((i: any) => ({ name: i.name, expires: i.expiry_date, qty: `${i.quantity} ${i.unit}` })), null, 1)}

RECENT MEAL PLANS (last 2 weeks):
${JSON.stringify(recentContext, null, 1)}

Please suggest a full week of meals.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(text);
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    return res.status(200).json({ suggestions });
  } catch (error: any) {
    console.error('AI suggestion error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate suggestions' });
  }
}
