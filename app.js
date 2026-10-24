const { MODEL, validate, getRecipes } = require("./recipes");

// Show how to use the program
function printHelp() {
  console.log(`Usage:
  node app.js --ingredients "eggs, tomato, cheese" [options]

Required:
  --ingredients   Comma-separated list of what is in your fridge

Optional constraints:
  --diet          Dietary restriction, e.g. vegetarian, vegan, gluten-free
  --cuisine       Cuisine, e.g. italian, mexican, japanese
  --time          Max cook time in minutes (positive whole number)
  --servings      Number of servings (positive whole number)
  -h, --help      Show this help`);
}

// Read options from the command line, e.g. --time 20
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === "-h" || token === "--help") {
      args.help = true;
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument "${token}". Options must start with --`);
    }

    let key = token.slice(2);
    let value;
    if (key.includes("=")) {
      [key, value] = [key.slice(0, key.indexOf("=")), key.slice(key.indexOf("=") + 1)];
    } else {
      value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Option --${key} needs a value`);
      }
      i++;
    }
    args[key] = value;
  }
  return args;
}

// Print one recipe
function printRecipe(recipe, index) {
  const time = Number.isFinite(Number(recipe.cookTimeMinutes)) ? `~${recipe.cookTimeMinutes} min` : "unknown";
  console.log(`\n=== Recipe ${index + 1}: ${recipe.title} ===`);
  console.log(`Estimated cook time: ${time}   Servings: ${recipe.servings ?? "?"}`);

  console.log("\nIngredients:");
  const missing = [];
  for (const ing of recipe.ingredients) {
    const qty = ing.quantity ? `${ing.quantity} ` : "";
    if (ing.inFridge) {
      console.log(`  [x] ${qty}${ing.name}`);
    } else {
      console.log(`  [ ] ${qty}${ing.name}   <- MISSING`);
      missing.push(ing.name);
    }
  }

  console.log("\nSteps:");
  recipe.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));

  console.log(missing.length ? `\nYou need to buy: ${missing.join(", ")}` : "\nYou have everything!");
}

// Main program
async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  if (args.help || argv.length === 0) {
    printHelp();
    return;
  }

  const { ingredients, constraints } = validate(args);

  const shown = Object.entries(constraints).map(([k, v]) => `${k}=${v}`).join(", ") || "none";
  console.log(`Fridge: ${ingredients.join(", ")}`);
  console.log(`Constraints: ${shown}`);
  console.log(`Asking ${MODEL}...`);

  const recipes = await getRecipes(ingredients, constraints);
  recipes.forEach((recipe, i) => printRecipe(recipe, i));
}

// Start the program and show errors
main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exitCode = 1;
});
