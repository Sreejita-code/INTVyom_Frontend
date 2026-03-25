# INTVyom Frontend

React + Vite frontend for the INTVyom dashboard UI.

## Tech Stack

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- shadcn/ui

## Local Development

```bash
npm install
npm run dev
```

Default dev server runs on `http://localhost:8080`.

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - create production build
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint
- `npm run test` - run Vitest tests

## Production Deployment (EC2 + Docker)

This repo includes:

- `Dockerfile` - multi-stage build (Node build + Nginx runtime)
- `nginx.conf` - SPA routing config (`/index.html` fallback)
- `docker-compose.yml` - container orchestration with port `8003`
- `.dockerignore` - slimmer/faster Docker builds
- `.env.production.example` - required production env keys

### 1. Create production env file

```bash
cp .env.production.example .env.production
```

Then set real values:

```env
VITE_BACKEND_URL=https://your-api-domain
VITE_LIVEKIT_URL=wss://your-livekit-domain
```

### 2. Build and start

```bash
docker compose --env-file .env.production up -d --build
```

### 3. Verify

```bash
curl http://localhost:8003
```

App will be available on:

- `http://<EC2_PUBLIC_IP>:8003`

## Project Structure

```text
.
|-- src/
|   |-- components/
|   |-- hooks/
|   |-- lib/
|   |-- pages/
|   |-- test/
|   |-- App.tsx
|   `-- main.tsx
|-- public/
|-- Dockerfile
|-- docker-compose.yml
|-- nginx.conf
|-- .dockerignore
|-- .env.production.example
`-- README.md
```
