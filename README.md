# TravelNex

TravelNex is an AI-powered travel planning app built with Flask. It combines destination discovery, trip recommendations, live travel context, itinerary generation, and a browser-based frontend.

## Features

- AI-assisted destination guidance
- Trip package ranking and recommendations
- Itinerary generation
- Place lookup and travel inspiration
- Frontend built with HTML, CSS, and JavaScript
- Environment-based configuration for secrets and API keys

## Tech Stack

- Python
- Flask
- Flask-CORS
- MySQL
- Gunicorn
- Vanilla JavaScript

## Local Setup

1. Clone the repository.
2. Create a virtual environment.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Copy `.env.example` to `.env` and fill in your values.
5. Start the app:

```bash
python app.py
```

## Environment Variables

Set these values in your `.env` file or deployment environment:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `FLASK_SECRET_KEY`
- `GEOAPIFY_KEY`
- `OPENWEATHER_KEY`
- `GEMINI_KEY`
- `UNSPLASH_KEY`
- `PEXELS_KEY`

## Production Start

Use Gunicorn in production:

```bash
gunicorn app:app
```

## GitHub Note

This repository is ready to push to GitHub as a public profile project. If you want a live deployment, connect the GitHub repo to a hosting platform such as Render, Railway, or Fly.io, because GitHub Pages does not run Flask backends.
