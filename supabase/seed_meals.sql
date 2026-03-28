-- Seed saved_meals with Family Favorite Meals
-- Run this in the Supabase SQL Editor

INSERT INTO saved_meals (family_id, name, emoji, notes, meal_types) VALUES
-- Brazilian & Comfort Dishes
('default', 'Strogonoff de frango com arroz', '🍗', NULL, ARRAY['lunch','dinner']),
('default', 'Moqueca com arroz', '🐟', 'fish or egg', ARRAY['lunch','dinner']),
('default', 'Feijão tropeiro com arroz', '🫘', NULL, ARRAY['lunch','dinner']),
('default', 'Arroz, feijão, carne, veggie/salad', '🍛', NULL, ARRAY['lunch','dinner']),
('default', 'Escondidinho de carne moída', '🥘', NULL, ARRAY['lunch','dinner']),
('default', 'Fricassê de carne moída', '🍲', NULL, ARRAY['lunch','dinner']),
('default', 'Polenta recheada', '🌽', NULL, ARRAY['lunch','dinner']),
('default', 'Galinha ensopada', '🐔', NULL, ARRAY['lunch','dinner']),
('default', 'Costelinha com polenta', '🍖', NULL, ARRAY['lunch','dinner']),
('default', 'Linguiça – caldo verde', '🌿', NULL, ARRAY['lunch','dinner']),
('default', 'Panqueca de carne moída', '🥞', NULL, ARRAY['lunch','dinner']),
('default', 'Kibe assado com salada', '🧆', NULL, ARRAY['lunch','dinner']),
('default', 'Quibe, arroz, feijão, salada', '🧆', NULL, ARRAY['lunch','dinner']),
('default', 'Sopa de capeletti', '🍜', NULL, ARRAY['lunch','dinner']),
('default', 'Caldo de aipim', '🥣', NULL, ARRAY['lunch','dinner']),
('default', 'Sopa de abóbora com carne moída', '🎃', NULL, ARRAY['lunch','dinner']),
('default', 'Feijoada com arroz e salada', '🫘', NULL, ARRAY['lunch','dinner']),

-- Pasta & Italian-Inspired
('default', 'Lasanha de carne', '🍝', NULL, ARRAY['lunch','dinner']),
('default', 'Lasanha de frango', '🍝', NULL, ARRAY['lunch','dinner']),
('default', 'Macarronada de carne moída', '🍝', NULL, ARRAY['lunch','dinner']),
('default', 'Gnocchi com cogumelos', '🍄', NULL, ARRAY['lunch','dinner']),
('default', 'Gnocchi with creamy sauce, tomatoes, and spinach', '🥬', NULL, ARRAY['lunch','dinner']),
('default', 'Tuna Pasta', '🐟', NULL, ARRAY['lunch','dinner']),

-- Curries & Asian Dishes
('default', 'Chicken curry', '🍛', 'with garlic, peppers, onions', ARRAY['lunch','dinner']),
('default', 'Thai green curry', '🟢', NULL, ARRAY['lunch','dinner']),
('default', 'Butter chicken curry', '🧈', NULL, ARRAY['lunch','dinner']),
('default', 'Pumpkin curry', '🎃', NULL, ARRAY['lunch','dinner']),
('default', 'Laksa curry', '🍜', NULL, ARRAY['lunch','dinner']),
('default', 'Butternut squash curry', '🍂', NULL, ARRAY['lunch','dinner']),
('default', 'Porco vietnamese', '🐖', NULL, ARRAY['lunch','dinner']),

-- Fish & Seafood
('default', 'Salmão com purê e legumes', '🐟', NULL, ARRAY['lunch','dinner']),
('default', 'Peixe frito com farofa', '🐠', NULL, ARRAY['lunch','dinner']),
('default', 'Peixe frito, arroz e feijão tropeiro', '🐠', NULL, ARRAY['lunch','dinner']),
('default', 'Risoto camarão com peas e chorizo', '🦐', NULL, ARRAY['lunch','dinner']),

-- Meat & Grill
('default', 'Meatballs with tomato sauce and pasta', '🍝', NULL, ARRAY['lunch','dinner']),
('default', 'Pork tenderloin', '🥩', NULL, ARRAY['lunch','dinner']),
('default', 'Pulled pork', '🐷', NULL, ARRAY['lunch','dinner']),
('default', 'Steak, chips, and vegetables', '🥩', NULL, ARRAY['lunch','dinner']),
('default', 'Chicken in air fryer com mandioca frita', '🍗', 'heart, breast, wings', ARRAY['lunch','dinner']),
('default', 'Assinha na airfryer com arroz e feijão', '🍗', NULL, ARRAY['lunch','dinner']),
('default', 'Sobrecoxa assada com vegetais na airfryer', '🍗', NULL, ARRAY['lunch','dinner']),
('default', 'Asinha de frango com feijão e arroz', '🍗', NULL, ARRAY['lunch','dinner']),
('default', 'Coração com farofa e arroz', '❤️', NULL, ARRAY['lunch','dinner']),

-- Quick & Kid-Friendly
('default', 'Fish fingers, batata and veggies', '🐟', NULL, ARRAY['lunch','dinner']),
('default', 'Frittata and veggies', '🥚', NULL, ARRAY['breakfast','lunch','dinner']),
('default', 'Omelette and veggies', '🥚', NULL, ARRAY['breakfast','lunch','dinner']),
('default', 'Nachos', '🌮', NULL, ARRAY['lunch','dinner']),
('default', 'Quesadilla, guacamole, salsa', '🌯', NULL, ARRAY['lunch','dinner']),
('default', 'Torta de frango com salada', '🥧', NULL, ARRAY['lunch','dinner']),
('default', 'Baked potato', '🥔', NULL, ARRAY['lunch','dinner']),
('default', 'Couscous (veggies), frango, salada', '🥗', NULL, ARRAY['lunch','dinner']),
('default', 'Fajita de frango', '🌮', NULL, ARRAY['lunch','dinner']),
('default', 'Panqueca', '🥞', NULL, ARRAY['breakfast','lunch','dinner']),
('default', 'Chicken nuggets (homemade)', '🍗', NULL, ARRAY['lunch','dinner']),
('default', 'Pizza night', '🍕', 'homemade or quick base', ARRAY['lunch','dinner']),

-- Soups & Light Meals
('default', 'Carrot & coriander soup', '🥕', NULL, ARRAY['lunch','dinner']),
('default', 'Leek & potato soup', '🥣', NULL, ARRAY['lunch','dinner']),
('default', 'Caldo verde', '🥬', NULL, ARRAY['lunch','dinner']),
('default', 'Vegetable soup with bread', '🍞', NULL, ARRAY['lunch','dinner']),
('default', 'Chicken noodle soup', '🍜', NULL, ARRAY['lunch','dinner']);
