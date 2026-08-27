require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Whats Cooking backend is running!');
});

app.get('/recipes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recipes');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching recipes' });
  }
});

app.post('/recipes', async (req, res) => {
  try {
    const { name, description, meal_type, mood, instructions_or_link, possible_swaps } = req.body;

    if (!name || !meal_type) {
      return res.status(400).json({ error: 'name and meal_type are required' });
    }

    const result = await pool.query(
      `INSERT INTO recipes (name, description, meal_type, mood, instructions_or_link, possible_swaps)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, meal_type, mood, instructions_or_link, possible_swaps]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving the recipe' });
  }
});

app.get('/recommendation', async (req, res) => {
  try {
    const { meal_type, mood, time_required, protein, carb_base } = req.query;

    let query = 'SELECT * FROM recipes WHERE 1=1';
    const values = [];

    if (meal_type) {
      values.push(meal_type);
      query += ` AND meal_type = $${values.length}`;
    }
    if (mood) {
      values.push(mood);
      query += ` AND mood = $${values.length}`;
    }
    if (time_required) {
      values.push(time_required);
      query += ` AND time_required <= $${values.length}`;
    }
    if (protein) {
      values.push(protein);
      query += ` AND protein = $${values.length}`;
    }
    if (carb_base) {
      values.push(carb_base);
      query += ` AND carb_base = $${values.length}`;
    }

    query += ' ORDER BY RANDOM() LIMIT 1';

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No matching recipe found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong getting a recommendation' });
  }
});

app.post('/history', async (req, res) => {
  try {
    const { user_id, recipe_id, would_make_again, adjustments } = req.body;

    if (!user_id || !recipe_id) {
      return res.status(400).json({ error: 'user_id and recipe_id are required' });
    }

    const result = await pool.query(
      `INSERT INTO user_history (user_id, recipe_id, would_make_again, adjustments)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, recipe_id, would_make_again, adjustments]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving history' });
  }
});

app.post('/usage-event', async (req, res) => {
  try {
    const { user_id, is_repeat_visit } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const result = await pool.query(
      `INSERT INTO usage_events (user_id, is_repeat_visit)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, is_repeat_visit]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong logging usage event' });
  }
});

app.post('/funnel-event', async (req, res) => {
  try {
    const { user_id, session_id, step, value } = req.body;

    if (!user_id || !session_id || !step) {
      return res.status(400).json({ error: 'user_id, session_id, and step are required' });
    }

    const result = await pool.query(
      `INSERT INTO funnel_events (user_id, session_id, step, value)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, session_id, step, value]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong logging funnel event' });
  }
});

app.post('/generate-recipe', async (req, res) => {
  try {
    const { mood, category, ingredients } = req.body;

    if (!mood || !category || !ingredients) {
      return res.status(400).json({ error: 'mood, category, and ingredients are required' });
    }

    const ingredientList = Object.entries(ingredients)
      .filter(([key, value]) => Array.isArray(value) && value.length > 0)
      .map(([key, value]) => `${key}: ${value.join(', ')}`)
      .join('\n');

    const prompt = `You are a helpful home cooking assistant. Create ONE recipe using ONLY the ingredients listed below (plus common staples like water, oil, and heat). Do not require any ingredient not listed.

Mood: ${mood}
Category: ${category}
Available ingredients:
${ingredientList}

Respond with ONLY valid JSON, no other text, in this exact shape:
{
  "name": "Recipe name",
  "description": "One sentence description",
  "ingredients_used": ["ingredient with amount", "ingredient with amount"],
  "instructions": ["Step 1 text", "Step 2 text", "Step 3 text"],
  "possible_swaps": "Optional swap suggestions, or empty string if none"
}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const groqData = await groqResponse.json();
    const rawText = groqData.choices[0].message.content;
    const recipe = JSON.parse(rawText);

    res.json(recipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong generating a recipe' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});