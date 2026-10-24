const form = document.getElementById("form");
const button = form.querySelector("button");
const statusText = document.getElementById("status");
const results = document.getElementById("results");

// Make an HTML element with text
function make(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

// Show one recipe as a card
function showRecipe(recipe, index) {
  const card = make("div", undefined, "card");
  card.append(make("h2", `${index + 1}. ${recipe.title}`));
  card.append(make("div", `~${recipe.cookTimeMinutes} min · ${recipe.servings} servings`, "meta"));

  card.append(make("h3", "Ingredients"));
  const list = make("ul");
  for (const ing of recipe.ingredients) {
    const text = `${ing.quantity} ${ing.name}`.trim() + (ing.inFridge ? "" : " (missing)");
    list.append(make("li", text, ing.inFridge ? "have" : "missing"));
  }
  card.append(list);

  card.append(make("h3", "Steps"));
  const steps = make("ol");
  recipe.steps.forEach((step) => steps.append(make("li", step)));
  card.append(steps);

  results.append(card);
}

// Send the form to the server and show the answer
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  results.innerHTML = "";
  statusText.className = "status";
  statusText.textContent = "Looking for recipes... (5-15 seconds)";
  button.disabled = true;

  try {
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const answer = await response.json();
    if (!response.ok) throw new Error(answer.error || "Something went wrong");

    statusText.textContent = "";
    answer.recipes.forEach(showRecipe);
  } catch (err) {
    statusText.className = "status error";
    statusText.textContent = "Error: " + err.message;
  } finally {
    button.disabled = false;
  }
});
