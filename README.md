# Fridge-to-Recipes

Give the app the ingredients in your fridge (and optional diet, cuisine, max time, servings),
and it asks an AI for **3 recipes**: title, cook time, ingredients with **missing** items marked, and steps.

**How it works:** the app builds a prompt, sends it to an OpenAI-compatible AI API
(tested with Google Gemini), gets the recipes back as JSON and checks which ingredients you don't have.
If the API fails for a short time, it retries (up to 3 attempts).

## Two versions

- **CLI** (`app.js`) — run a command, recipes are printed in the terminal.
- **Web UI** (`server.js`, bonus) — a small local page made with Express.

Both use the same logic from `recipes.js`.

## Setup

```bash
git clone https://github.com/warior2018/fridge-to-recipes.git
cd fridge-to-recipes
npm install
cp .env.example .env
```

Needs Node.js 20.12+.

## Environment variables

Put them in `.env` (it is in `.gitignore`, never committed):

```
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
OPENAI_MODEL=gemini-3.8-flash
```

Only `OPENAI_API_KEY` is required. Free Gemini key: https://aistudio.google.com.
Without the other two, the app uses OpenAI (`gpt-4o-mini`).

## Run

**CLI:**
```bash
node app.js --ingredients "eggs, tomato" [--diet vegetarian] [--cuisine italian] [--time 20] [--servings 2]
```

**Web UI:**
```bash
npm run web
```
Then open http://localhost:3000.

## Example run

```bash
node app.js --ingredients "eggs, tomato, cheese, onion" --diet vegetarian --time 20 --servings 2
```

Output:

```
Fridge: eggs, tomato, cheese, onion
Constraints: diet=vegetarian, maxTime=20, servings=2
Asking gemini-3.8-flash...

=== Recipe 1: Quick Skillet Eggs in Spiced Tomato Sauce ===
Estimated cook time: ~15 min   Servings: 2

Ingredients:
  [x] 4 eggs
  [x] 2 large, finely diced tomato
  [x] 1 medium, diced onion
  [x] 1/2 cup, crumbled or shredded cheese
  [ ] 1 tbsp olive oil   <- MISSING
  [ ] 1/2 tsp salt   <- MISSING
  [ ] 1/4 tsp black pepper   <- MISSING
  [ ] 1/2 tsp ground cumin   <- MISSING

Steps:
  1. Heat the olive oil in a medium skillet over medium heat.
  2. Add the onion and cook for 3 minutes until translucent.
  3. Stir in the tomato, salt, black pepper, and ground cumin, then simmer for 4 minutes until the tomatoes soften into a thick sauce.
  4. Use a spoon to create four small wells in the sauce and crack an egg into each well.
  5. Sprinkle the cheese evenly over the top, cover the skillet with a lid, and cook on medium-low heat for 4 to 5 minutes until the egg whites are set and the cheese is melted.

You need to buy: olive oil, salt, black pepper, ground cumin

=== Recipe 2: Cheesy Tomato and Onion Scramble ===
Estimated cook time: ~10 min   Servings: 2

Ingredients:
  [x] 4 eggs
  [x] 1 medium, seeded and diced tomato
  [x] 1/2 medium, finely chopped onion
  [x] 1/2 cup, shredded cheese
  [ ] 1 tbsp butter   <- MISSING
  [ ] 1/2 tsp salt   <- MISSING
  [ ] 1/4 tsp black pepper   <- MISSING

Steps:
  1. In a bowl, beat the eggs with salt and black pepper until fully combined.
  2. Melt the butter in a non-stick skillet over medium heat.
  3. Add the onion and cook for 2 minutes until fragrant, then add the tomato and cook for 1 additional minute.
  4. Lower the heat to medium-low and pour in the beaten eggs.
  5. Gently stir and push the eggs across the pan until soft curds form, about 2 to 3 minutes.
  6. Fold in the cheese, remove the skillet from heat, and let the residual warmth melt the cheese before serving.

You need to buy: butter, salt, black pepper

=== Recipe 3: Stovetop Tomato, Onion, and Cheese Frittata ===
Estimated cook time: ~15 min   Servings: 2

Ingredients:
  [x] 4 eggs
  [x] 1 medium, thinly sliced tomato
  [x] 1/2 medium, thinly sliced onion
  [x] 1/2 cup, shredded cheese
  [ ] 1 tbsp olive oil   <- MISSING
  [ ] 1/2 tsp salt   <- MISSING
  [ ] 1/4 tsp black pepper   <- MISSING
  [ ] 1/2 tsp dried oregano   <- MISSING

Steps:
  1. In a medium bowl, whisk together the eggs, salt, black pepper, and dried oregano.
  2. Heat the olive oil in an 8-inch non-stick skillet over medium heat.
  3. Add the onion slices and sauté for 3 minutes until softened.
  4. Pour the whisked egg mixture into the skillet, tilting the pan so it covers the base evenly.
  5. Arrange the tomato slices evenly across the surface of the eggs and sprinkle the cheese on top.
  6. Turn the heat down to low, cover the skillet with a lid, and cook for 7 to 8 minutes until the eggs are firm in the center and the cheese is melted.

You need to buy: olive oil, salt, black pepper, dried oregano
```
