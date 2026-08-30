# What's Cooking — Backend

A full-stack meal recommendation app that suggests what to cook based on mood, time available, and what's actually in your kitchen — built to remove decision fatigue around "what should I eat" rather than just listing recipes.

**Live app:** https://whats-cooking-app.lovable.app
**Live backend:** https://whats-cooking-backend-68rl.onrender.com

## What I built
I designed and built the entire backend solo — six API endpoints handling recipe retrieval, personalized recommendations, usage tracking, and AI-generated recipe suggestions.

## Stack
- Node.js + Express (API)
- Postgres on Neon (database)
- Groq API (`openai/gpt-oss-120b`) for AI-generated recipe suggestions
- Hosted on Render
- Frontend built in Lovable

## A real decision along the way
Early on I had to decide between generating recipes fresh via the Groq API on every request versus pre-storing a curated set. I went with a hybrid: a curated base set for reliability and speed, with Groq API calls layered in for more personalized, mood-specific suggestions — balancing response speed against variety.

## Endpoints
- `GET /recipes` — retrieve base recipe set
- `POST /recommend` — mood + time + ingredient-based recommendation
- `POST /generate` — AI-generated recipe via Groq API
- `GET /history` — user's past recommendations
- `POST /feedback` — log whether a suggestion was made / would make again
- `GET /usage` — session/usage tracking
