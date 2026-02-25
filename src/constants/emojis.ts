export const EMOJI_CATEGORIES = {
  foods: {
    name: 'Foods',
    emojis: [
      { emoji: '🍽️', name: 'plate', keywords: ['plate', 'dish', 'meal', 'dinner'] },
      { emoji: '🍝', name: 'spaghetti', keywords: ['spaghetti', 'pasta', 'noodles', 'italian'] },
      { emoji: '🍕', name: 'pizza', keywords: ['pizza', 'slice', 'italian', 'cheese'] },
      { emoji: '🍲', name: 'pot of food', keywords: ['pot', 'stew', 'soup', 'cooking'] },
      { emoji: '🍛', name: 'curry rice', keywords: ['curry', 'rice', 'indian', 'spicy'] },
      { emoji: '🍣', name: 'sushi', keywords: ['sushi', 'japanese', 'fish', 'raw'] },
      { emoji: '🍔', name: 'hamburger', keywords: ['burger', 'hamburger', 'fast food', 'beef'] },
      { emoji: '🌮', name: 'taco', keywords: ['taco', 'mexican', 'shell', 'meat'] },
      { emoji: '🥪', name: 'sandwich', keywords: ['sandwich', 'bread', 'lunch', 'deli'] },
      { emoji: '🥗', name: 'salad', keywords: ['salad', 'healthy', 'vegetables', 'greens'] },
      { emoji: '🍗', name: 'poultry leg', keywords: ['chicken', 'drumstick', 'meat', 'poultry'] },
      { emoji: '🍟', name: 'french fries', keywords: ['fries', 'potato', 'fast food', 'crispy'] },
      { emoji: '🧇', name: 'waffle', keywords: ['waffle', 'breakfast', 'syrup', 'sweet'] },
      { emoji: '🥞', name: 'pancakes', keywords: ['pancakes', 'breakfast', 'syrup', 'stack'] },
      { emoji: '🍳', name: 'cooking', keywords: ['egg', 'frying', 'breakfast', 'cooking'] },
      { emoji: '🍩', name: 'doughnut', keywords: ['donut', 'doughnut', 'sweet', 'dessert'] },
      { emoji: '🍪', name: 'cookie', keywords: ['cookie', 'sweet', 'dessert', 'baked'] },
      { emoji: '🍰', name: 'cake', keywords: ['cake', 'birthday', 'dessert', 'sweet'] },
      { emoji: '🍎', name: 'apple', keywords: ['apple', 'fruit', 'red', 'healthy'] },
      { emoji: '🍐', name: 'pear', keywords: ['pear', 'fruit', 'green', 'healthy'] },
      { emoji: '🍊', name: 'orange', keywords: ['orange', 'fruit', 'citrus', 'vitamin'] },
      { emoji: '🍋', name: 'lemon', keywords: ['lemon', 'citrus', 'sour', 'yellow'] },
      { emoji: '🍌', name: 'banana', keywords: ['banana', 'fruit', 'yellow', 'potassium'] },
      { emoji: '🍉', name: 'watermelon', keywords: ['watermelon', 'fruit', 'summer', 'juicy'] },
      { emoji: '🍇', name: 'grapes', keywords: ['grapes', 'fruit', 'wine', 'cluster'] },
      { emoji: '🍓', name: 'strawberry', keywords: ['strawberry', 'fruit', 'red', 'sweet'] },
      { emoji: '🍒', name: 'cherries', keywords: ['cherry', 'fruit', 'red', 'sweet'] },
      { emoji: '🍑', name: 'peach', keywords: ['peach', 'fruit', 'fuzzy', 'sweet'] },
      { emoji: '🥝', name: 'kiwi', keywords: ['kiwi', 'fruit', 'green', 'fuzzy'] },
      { emoji: '🥕', name: 'carrot', keywords: ['carrot', 'vegetable', 'orange', 'healthy'] },
      { emoji: '🥔', name: 'potato', keywords: ['potato', 'vegetable', 'starch', 'brown'] },
      { emoji: '🌽', name: 'corn', keywords: ['corn', 'vegetable', 'yellow', 'kernels'] },
      { emoji: '🍄', name: 'mushroom', keywords: ['mushroom', 'fungi', 'vegetable', 'umami'] },
      { emoji: '🧀', name: 'cheese', keywords: ['cheese', 'dairy', 'yellow', 'wedge'] },
      { emoji: '🥖', name: 'baguette', keywords: ['bread', 'baguette', 'french', 'long'] },
      { emoji: '🍞', name: 'bread', keywords: ['bread', 'loaf', 'wheat', 'slice'] },
      { emoji: '🥯', name: 'bagel', keywords: ['bagel', 'bread', 'round', 'hole'] },
      { emoji: '🥨', name: 'pretzel', keywords: ['pretzel', 'twisted', 'salty', 'german'] },
      { emoji: '🍫', name: 'chocolate', keywords: ['chocolate', 'candy', 'sweet', 'brown'] },
      { emoji: '🍬', name: 'candy', keywords: ['candy', 'sweet', 'wrapper', 'sugar'] },
      { emoji: '🍭', name: 'lollipop', keywords: ['lollipop', 'candy', 'stick', 'sweet'] },
      { emoji: '🍯', name: 'honey', keywords: ['honey', 'sweet', 'bee', 'golden'] },
      { emoji: '🥤', name: 'cup with straw', keywords: ['drink', 'soda', 'straw', 'cup'] },
      { emoji: '🧃', name: 'beverage box', keywords: ['juice', 'box', 'drink', 'straw'] },
      { emoji: '🧋', name: 'bubble tea', keywords: ['bubble tea', 'boba', 'drink', 'asian'] },
      { emoji: '🍵', name: 'tea', keywords: ['tea', 'hot', 'cup', 'green'] },
      { emoji: '☕', name: 'coffee', keywords: ['coffee', 'hot', 'cup', 'caffeine'] },
      { emoji: '🥛', name: 'milk', keywords: ['milk', 'glass', 'white', 'dairy'] },
      { emoji: '🍶', name: 'sake', keywords: ['sake', 'japanese', 'alcohol', 'bottle'] },
      { emoji: '🍹', name: 'tropical drink', keywords: ['cocktail', 'tropical', 'drink', 'umbrella'] },
      { emoji: '🍸', name: 'cocktail', keywords: ['cocktail', 'martini', 'drink', 'alcohol'] },
      { emoji: '🍺', name: 'beer', keywords: ['beer', 'mug', 'alcohol', 'foam'] },
      { emoji: '🍻', name: 'beers', keywords: ['beer', 'cheers', 'alcohol', 'celebration'] },
      { emoji: '🥂', name: 'champagne', keywords: ['champagne', 'cheers', 'celebration', 'glasses'] }
    ]
  }
};

export const ALL_EMOJIS = EMOJI_CATEGORIES.foods.emojis;

export const searchEmojis = (query: string) => {
  if (!query.trim()) return ALL_EMOJIS;
  
  const searchTerm = query.toLowerCase();
  return ALL_EMOJIS.filter(item => 
    item.name.toLowerCase().includes(searchTerm) ||
    item.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
  );
};