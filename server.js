const express = require("express");
const path = require("path");
const { KNOWN_OPTIONS, validate, getRecipes } = require("./recipes");

const app = express();
const PORT = process.env.PORT || 3000;

// Read JSON from requests
app.use(express.json());

// Send our HTML page from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// The page sends the form here and gets 3 recipes back
app.post("/api/recipes", async (req, res) => {
  // Keep only known fields that are not empty
  const args = {};
  for (const key of KNOWN_OPTIONS) {
    const value = req.body?.[key];
    if (value !== undefined && String(value).trim() !== "") {
      args[key] = String(value);
    }
  }

  let input;
  try {
    input = validate(args);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const recipes = await getRecipes(input.ingredients, input.constraints);
    res.json({ recipes });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    res.status(502).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Fridge-to-Recipes is running: http://localhost:${PORT}`);
});
