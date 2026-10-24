// Read settings from the .env file (if it exists)
try {
  process.loadEnvFile();
} catch {
  // no .env file, use normal environment variables
}

// Settings
const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 60_000;
const RECIPE_COUNT = 3;
const KNOWN_OPTIONS = ["ingredients", "diet", "cuisine", "time", "servings"];

// Check that a value is a number bigger than 0
function parsePositiveInt(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`--${name} must be a positive whole number, got "${value}"`);
  }
  return n;
}

// Check user input and build the ingredient list
function validate(args) {
  for (const key of Object.keys(args)) {
    if (!KNOWN_OPTIONS.includes(key)) {
      throw new Error(`Unknown option --${key}. Run with --help to see all options`);
    }
  }

  if (!args.ingredients) {
    throw new Error('--ingredients is required, e.g. --ingredients "eggs, tomato"');
  }
  const ingredients = args.ingredients
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (ingredients.length === 0) {
    throw new Error("--ingredients list is empty");
  }

  const constraints = {};
  if (args.diet) constraints.diet = args.diet.trim();
  if (args.cuisine) constraints.cuisine = args.cuisine.trim();
  if (args.time !== undefined) constraints.maxTime = parsePositiveInt(args.time, "time");
  if (args.servings !== undefined) constraints.servings = parsePositiveInt(args.servings, "servings");

  return { ingredients, constraints };
}

// Build the prompt for the AI
function buildMessages(ingredients, constraints) {
  const system = `You are a practical home cook. You suggest realistic recipes.
Reply ONLY with valid JSON (no markdown, no comments) in exactly this shape:
{
  "recipes": [
    {
      "title": "string",
      "cookTimeMinutes": number,
      "servings": number,
      "ingredients": [ { "name": "string", "quantity": "string" } ],
      "steps": [ "string" ]
    }
  ]
}`;

  const lines = [
    `Suggest exactly ${RECIPE_COUNT} different recipes.`,
    `Ingredients I have: ${ingredients.join(", ")}.`,
    "Use mostly what I have; a few extra ingredients are fine.",
    "List EVERY ingredient a recipe needs, including salt, oil and spices.",
    'When a recipe uses an ingredient from my list, write its "name" exactly as I wrote it.',
    'Keep "quantity" separate from "name" (e.g. name "eggs", quantity "3").',
  ];
  if (constraints.diet) lines.push(`Dietary restriction (must follow strictly): ${constraints.diet}.`);
  if (constraints.cuisine) lines.push(`Cuisine: ${constraints.cuisine}.`);
  if (constraints.maxTime) lines.push(`Each recipe must take at most ${constraints.maxTime} minutes in total.`);
  lines.push(`Servings: ${constraints.servings ?? 2}.`);

  return [
    { role: "system", content: system },
    { role: "user", content: lines.join("\n") },
  ];
}

// Error with info: can we try again or not
class ApiError extends Error {
  constructor(message, { status, retryable }) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

// Cut long text
function shorten(text, max = 200) {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

// Send the prompt to the AI and get the answer
async function callApi(messages) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err.name === "TimeoutError" ? `no answer within ${TIMEOUT_MS / 1000}s` : err.message;
    throw new ApiError(`Network error: ${reason}`, { retryable: true });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new ApiError("API key was rejected (401). Check OPENAI_API_KEY in your .env", { status: 401, retryable: false });
    }
    if (body.includes("insufficient_quota")) {
      throw new ApiError("Your API account has no credits left (insufficient_quota)", { status: res.status, retryable: false });
    }
    const retryable = res.status === 429 || res.status >= 500;
    throw new ApiError(`API returned ${res.status}: ${shorten(body)}`, { status: res.status, retryable });
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new ApiError("API answer had no message text", { retryable: true });
  }
  return content;
}

// Wait some milliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Try again if the API fails for a short time
async function withRetry(fn, attempts = MAX_ATTEMPTS) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!err.retryable || attempt >= attempts) throw err;
      const delay = 1000 * 2 ** (attempt - 1);
      console.error(`Attempt ${attempt}/${attempts} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

// Turn the AI answer (JSON text) into recipe objects
function parseRecipes(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new ApiError("Model did not return valid JSON", { retryable: true });
  }
  const recipes = Array.isArray(data?.recipes) ? data.recipes : [];
  const valid = recipes.filter(
    (r) =>
      typeof r?.title === "string" &&
      Array.isArray(r.ingredients) &&
      r.ingredients.length > 0 &&
      Array.isArray(r.steps) &&
      r.steps.length > 0
  );
  if (valid.length < RECIPE_COUNT) {
    throw new ApiError(`Expected ${RECIPE_COUNT} complete recipes, got ${valid.length}`, { retryable: true });
  }
  return valid.slice(0, RECIPE_COUNT);
}

// Make words simple: lowercase, no commas, no plural "s"
function normalizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.endsWith("oes") ? w.slice(0, -2) : w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

// Check if an ingredient is in the fridge
function isInFridge(ingredientName, fridge) {
  const recipeWords = new Set(normalizeWords(ingredientName));
  return fridge.some((item) => {
    const fridgeWords = normalizeWords(item);
    return fridgeWords.length > 0 && fridgeWords.every((w) => recipeWords.has(w));
  });
}

// Get 3 recipes and mark which ingredients are missing
async function getRecipes(ingredients, constraints) {
  if (!API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Copy .env.example to .env and put your key there");
  }

  const messages = buildMessages(ingredients, constraints);
  const recipes = await withRetry(async () => parseRecipes(await callApi(messages)));

  return recipes.map((recipe) => ({
    title: recipe.title,
    cookTimeMinutes: recipe.cookTimeMinutes,
    servings: recipe.servings,
    steps: recipe.steps,
    ingredients: recipe.ingredients.map((ing) => {
      const name = String(ing?.name ?? ing).trim();
      return {
        name,
        quantity: ing?.quantity ? String(ing.quantity) : "",
        inFridge: isInFridge(name, ingredients),
      };
    }),
  }));
}

module.exports = { MODEL, KNOWN_OPTIONS, validate, getRecipes };
