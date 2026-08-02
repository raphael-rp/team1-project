# Team 1 — Fitness Tracker

Team 1 Problem Statement — a fitness tracking app (meals, water, workouts, BMI, gamification) built with Express, EJS, and MongoDB.

## Prerequisites

- [Node.js](https://nodejs.org/) 22.x
- [Docker](https://www.docker.com/) (recommended — no MongoDB install or Atlas account needed)
- A MongoDB instance if running without Docker (local install or [Atlas](https://www.mongodb.com/atlas))

## Environment variables

Create a `.env` file in the project root (never commit this — it's already git-ignored). See `.env.example` for the full template.

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | Port the server listens on (defaults to `3000` if unset) |
| `NODE_ENV` | `development` or `production` |
| `SESSION_SECRET` | Optional — signs the session cookie. Falls back to a hardcoded default if unset; set a real random value for anything beyond local dev. |

`.env.test` is already checked in and points at a local test database — used automatically by the test suite, no setup needed.

## Running with Docker (recommended)

Builds the app and starts it alongside its own MongoDB container — no Atlas account needed:

```bash
docker compose up --build
```

The app will be available at `http://localhost:3000`.

To build and run the image directly instead of via Compose:

```bash
docker build -t team1-project .
docker run --rm -p 3000:3000 --env-file .env team1-project
```

## Running without Docker

```bash
npm install
npm start
```

Requires `MONGODB_URI` in `.env` pointing at a real MongoDB instance (local or Atlas).

## Running tests

```bash
npm test
```

Runs the full Jest + Supertest suite against a local MongoDB instance (`.env.test`'s `MONGODB_URI`). Needs a MongoDB instance reachable at that URI — either run one locally, or via `docker run -d -p 27017:27017 mongo:7`.

## CI/CD

On every push and pull request to `main`, GitHub Actions (`.github/workflows/ci.yml`) automatically:
1. Installs dependencies
2. Runs the full test suite against a real MongoDB service container
3. Builds the Docker image and smoke-tests it

## Project structure

```
app.js               Express app (routes, middleware) — exports the app, does not start a server
server.js             Connects to MongoDB, then starts app.js listening
views/                EJS templates
public/               Static assets (CSS, client-side JS)
tests/                Jest + Supertest test suite
scripts/              One-off maintenance scripts (e.g. password migration)
Dockerfile            Builds a production image
docker-compose.yml    Local dev stack: app + MongoDB
```
