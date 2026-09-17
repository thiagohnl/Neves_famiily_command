import {
  checkPublicUrl,
  extractJsonLdRecipe,
  getMeta,
  instagramEmbedUrl,
  isPrivateAddress,
  sanitizeRecipe,
  summarizePage,
} from '../../../api/import-recipe';

const recipePage = `<!doctype html><html><head>
<meta property="og:title" content="Best Feijoada &amp; Rice">
<meta property="og:image" content="https://cdn.example.com/og.jpg">
<script type="application/ld+json">{ not json }</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
  {"@type":"WebPage","name":"Page"},
  {"@type":["Recipe"],"name":"Feijoada","recipeYield":"6","prepTime":"PT20M",
   "image":[{"url":"https://cdn.example.com/feijoada.jpg"}],
   "recipeIngredient":["500g black beans","2 bay leaves"],
   "recipeInstructions":[
     {"@type":"HowToSection","name":"Beans","itemListElement":[{"@type":"HowToStep","text":"Soak the beans overnight."}]},
     {"@type":"HowToStep","text":"Simmer for <b>2 hours</b>."}
   ]}
]}
</script></head><body><p>Hello</p></body></html>`;

describe('import-recipe helpers', () => {
  it('finds a Recipe inside a JSON-LD @graph, skipping malformed blocks', () => {
    const recipe = extractJsonLdRecipe(recipePage);
    expect(recipe?.name).toBe('Feijoada');
  });

  it('summarizes structured pages with flattened steps and the recipe image', () => {
    const page = summarizePage(recipePage);
    expect(page.structured).toBe(true);
    expect(page.imageUrl).toBe('https://cdn.example.com/feijoada.jpg');
    expect(page.text).toContain('— Beans —');
    expect(page.text).toContain('Soak the beans overnight.');
    expect(page.text).toContain('Simmer for 2 hours.');
  });

  it('falls back to og meta and visible text when there is no JSON-LD', () => {
    const html = `<html><head><meta property="og:description" content="Ingredients: 2 eggs"><meta property="og:image" content="/img.jpg"></head>
      <body><script>var x=1</script><nav>menu</nav><p>Whisk the eggs</p></body></html>`;
    const page = summarizePage(html);
    expect(page.structured).toBe(false);
    expect(page.text).toContain('Ingredients: 2 eggs');
    expect(page.text).toContain('Whisk the eggs');
    expect(page.text).not.toContain('var x');
    expect(page.text).not.toContain('menu');
    expect(page.imageUrl).toBe('/img.jpg');
    expect(getMeta(recipePage, 'og:title')).toBe('Best Feijoada & Rice');
  });

  it('rejects private, local and non-http links', () => {
    expect(checkPublicUrl('https://www.bbcgoodfood.com/recipes/x')).not.toBeNull();
    expect(checkPublicUrl('ftp://example.com/x')).toBeNull();
    expect(checkPublicUrl('http://localhost:3000')).toBeNull();
    expect(checkPublicUrl('http://192.168.1.10/admin')).toBeNull();
    expect(checkPublicUrl('http://169.254.169.254/latest/meta-data')).toBeNull();
    expect(checkPublicUrl('http://[::1]/')).toBeNull();
    expect(checkPublicUrl('http://intranet/')).toBeNull();
    expect(checkPublicUrl('not a url')).toBeNull();
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
    expect(isPrivateAddress('::ffff:10.0.0.1')).toBe(true);
  });

  it('builds Instagram embed URLs for posts and reels', () => {
    expect(instagramEmbedUrl(new URL('https://www.instagram.com/reel/DTkulmVjJwW/?igsh=abc'))).toBe(
      'https://www.instagram.com/reel/DTkulmVjJwW/embed/captioned/'
    );
    expect(instagramEmbedUrl(new URL('https://instagram.com/p/C8bWJ7kyB3A/'))).toBe(
      'https://www.instagram.com/p/C8bWJ7kyB3A/embed/captioned/'
    );
    expect(instagramEmbedUrl(new URL('https://www.instagram.com/recipeincaption/'))).toBeNull();
    expect(instagramEmbedUrl(new URL('https://example.com/p/abc/'))).toBeNull();
  });

  it('sanitizes model output', () => {
    const recipe = sanitizeRecipe({
      name: '  Bolo de Cenoura ',
      emoji: '',
      meal_types: ['snack', 'breakfast'],
      servings: 8.4,
      prep_minutes: -5,
      cook_minutes: 40,
      ingredients: [
        { text: '3 cenouras', name: 'Carrot', quantity: 3, unit: null, emoji: '🥕', category: 'vegetables', staple: false },
        { text: 'sal', name: 'Salt', quantity: null, unit: '', emoji: '🧂', category: 'seasoning', staple: true },
        { text: 'nothing', name: '', quantity: 1 },
      ],
      steps: ['Bata tudo', '  ', 42],
      notes: '',
    });
    expect(recipe.name).toBe('Bolo de Cenoura');
    expect(recipe.emoji).toBe('🍽️');
    expect(recipe.meal_types).toEqual(['breakfast']);
    expect(recipe.servings).toBe(8);
    expect(recipe.prep_minutes).toBeNull();
    expect(recipe.ingredients).toHaveLength(2);
    expect(recipe.ingredients[1]).toMatchObject({ category: 'other', unit: null, staple: true });
    expect(recipe.steps).toEqual(['Bata tudo']);
    expect(recipe.notes).toBeNull();
  });
});
