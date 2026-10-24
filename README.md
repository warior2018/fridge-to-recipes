# Fridge-to-Recipes

A command-line app that takes the ingredients you have on hand plus optional
constraints (diet, cuisine, max cook time, servings) and asks an LLM for
**three recipe suggestions**. For each recipe it prints the title, the full
ingredient list with items **missing from your fridge** marked, step-by-step
instructions and an estimated cook time.

No dependencies: plain Node.js using the built-in `fetch`.

## Setup

1. Install **Node.js 20.12 or newer** (`node -v` to check).
2. Clone the repo and go into the folder:
   ```bash
   git clone <repo-url>
   cd fridge-to-recipes
   ```
3. Create your `.env` from the example and put your API key in it:
   ```bash
   cp .env.example .env
   ```
   `.env` is listed in `.gitignore`, so the key is never committed.

## Environment variables

| Variable          | Required | Default                     | Meaning                                   |
|-------------------|----------|-----------------------------|-------------------------------------------|
| `OPENAI_API_KEY`  | yes      | –                           | API key for the LLM provider              |
| `OPENAI_MODEL`    | no       | `gpt-4o-mini`               | Model name                                |
| `OPENAI_BASE_URL` | no       | `https://api.openai.com/v1` | Any OpenAI-compatible Chat Completions API |

Variables can live in `.env` (loaded automatically) or be exported in the shell.

### Using Google Gemini (free tier)

The example run below uses Gemini through its OpenAI-compatible endpoint.
Get a free key at https://aistudio.google.com ("Get API key") and set:

```
OPENAI_API_KEY=your-gemini-key
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
OPENAI_MODEL=gemini-3.8-flash
```

## Usage

```bash
node app.js --ingredients "eggs, tomato, cheese" [--diet vegetarian] [--cuisine italian] [--time 20] [--servings 2]
node app.js --help
```

Only `--ingredients` is required; any subset of the constraints can be added.

## How it works

1. **Arguments** are parsed from `process.argv` and validated (empty list,
   non-numeric time/servings, unknown options → clear error, exit code 1).
2. **Prompt**: the ingredients and constraints are turned into a prompt that
   asks the model to answer with JSON in a fixed shape (JSON mode is enabled).
3. **API call** with a 60 s timeout.
4. **Retry**: network errors, timeouts, `429` and `5xx` responses, and invalid
   or incomplete JSON are retried up to 3 attempts total with exponential
   backoff (1 s, 2 s). Permanent errors (`401` wrong key, no credits, other
   `4xx`) fail immediately with a readable message.
5. **Missing ingredients** are decided by the app itself, not by the model:
   each recipe ingredient is compared word by word against your fridge list
   (`cheese` matches `grated cheese`, `tomato` matches `tomatoes`).

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
