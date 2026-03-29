# INTVyom Frontend

React + Vite frontend for the INTVyom AI voice assistant dashboard.

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS + shadcn/ui
- LiveKit (real-time voice)
- React Router v6
- TanStack Query

## Local Development

```bash
npm install
npm run dev
```

Dev server runs on `http://localhost:5173` (Vite default).

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint
- `npm run test` - run Vitest tests

## Environment Variables

Create a `.env` file in the root:

```env
VITE_BACKEND_URL=https://your-api-domain
VITE_LIVEKIT_URL=wss://your-livekit-domain
APP_PORT=8003
```

> `.env` is git-ignored — never commit real secrets.

## Production Deployment (Docker)

```bash
docker compose up -d --build
```

App is served by **nginx** on the port set in `APP_PORT` (default `8003`).

### How it works

| File               | Purpose                                      |
|--------------------|----------------------------------------------|
| `Dockerfile`       | Multi-stage: Node builds, nginx serves dist  |
| `nginx.conf`       | SPA routing — falls back to `/index.html`    |
| `docker-compose.yml` | Wires env vars and port mapping            |

### Verify

```bash
curl http://localhost:8003
```

## Project Structure

```
.
├── src/
│   ├── components/        # shared + shadcn/ui components
│   ├── hooks/             # custom React hooks
│   ├── lib/               # auth, analytics client, utilities
│   ├── pages/             # route-level pages (assistant, logs, analytics, etc.)
│   ├── test/              # Vitest tests
│   ├── App.tsx
│   └── main.tsx
├── public/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .env                   # local env (git-ignored)
└── README.md
```
