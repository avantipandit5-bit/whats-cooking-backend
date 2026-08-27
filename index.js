require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});