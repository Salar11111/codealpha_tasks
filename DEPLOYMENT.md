# Deployment

Three independent apps share one repository and one MongoDB replica set. Each app is a static React build served by nginx plus a separate Express API.

| Service | Port (local) | Image / runtime |
| --- | --- | --- |
| `ecommerce-web` | 5173 | nginx + Vite build |
| `ecommerce-api` | 5001 | Node 20 + Express |
| `social-web` | 5174 | nginx + Vite build |
| `social-api` | 5002 | Node 20 + Express (uploads + Socket.io) |
| `projects-web` | 5175 | nginx + Vite build |
| `projects-api` | 5003 | Node 20 + Express (Socket.io) |
| `mongo` | 27017 | MongoDB 7, single-node replica set `rs0` |

## Before you deploy

1. Generate a strong `JWT_SECRET` (32+ characters) for each API. Use a different value per app.
2. Use a managed MongoDB (Atlas or a replica set you operate). The shop needs a replica set because checkout uses a transaction.
3. Set `NODE_ENV=production`.
4. Set `CLIENT_URL` to the public browser origin of that app, for example `https://shop.example.com`. It accepts a comma-separated list when the same API serves several origins.
5. Decide on cookies. Keep `COOKIE_SAMESITE=lax` when the API is proxied under the same site as the client (the default Compose setup). See [Cross-site deployments](#cross-site-deployments).
6. Back up the `social_uploads` volume (or move uploads to object storage before scaling).

## Single VPS with Docker Compose (recommended)

Requirements: a Linux host with Docker Engine and Compose, a domain name, and ports 80/443 open.

```bash
git clone https://github.com/Salar11111/codealpha_tasks.git
cd codealpha_tasks
docker compose up --build -d
docker compose exec ecommerce-api npm run seed
docker compose exec social-api npm run seed
docker compose exec projects-api npm run seed
```

Open <http://SERVER_IP:5173>, `:5174`, and `:5175` to confirm the stack works.

Before exposing it publicly:

- Edit the `environment` blocks in `docker-compose.yml`:
  - replace every `JWT_SECRET` placeholder;
  - set each `CLIENT_URL` to its public origin;
  - keep `NODE_ENV: production`.
- Stop publishing the database and APIs. The nginx containers reach them over the Compose network, so remove the `ports` blocks from `mongo`, `*-api` (or bind them to `127.0.0.1`).
- Put TLS in front of the three web containers.

Example Caddyfile (Caddy obtains and renews certificates automatically):

```caddyfile
shop.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:5173
}

feed.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:5174
}

boards.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:5175
}
```

nginx with certbot works the same way: terminate TLS on the host and proxy each domain to its web container port. Keep `X-Forwarded-For` and `X-Forwarded-Proto` while proxying; the APIs already trust one proxy hop.

Each client nginx image serves hashed assets with immutable caching, `index.html` with `no-cache`, gzip for text assets, and proxies `/api` (plus `/uploads` and `/socket.io` for the social app, `/socket.io` for the board) to its API container.

## Cross-site deployments

Cookies are `HttpOnly`, `SameSite=Lax` by default, and `Secure` in production.

- **Same origin (recommended):** browser, client, and API share a domain through the nginx proxy. Keep `COOKIE_SAMESITE=lax`.
- **Different subdomains of one site** (`app.example.com` + `api.example.com`): still same-site. Keep `Lax`, add both origins to `CLIENT_URL`, and send credentials from the browser (the clients already use `credentials: 'include'`).
- **Different registrable domains** (`app.vercel.app` + `api.onrender.com`): set `COOKIE_SAMESITE=none` on the API. `Secure` is forced automatically, so the API must be HTTPS. Add the client origin to `CLIENT_URL`. Login and session cookies will not work over plain HTTP.

`CLIENT_URL` is the CORS allow-list. Requests without an `Origin` header (health checks, curl) are unaffected.

## Split static hosting and PaaS

The browser clients call `/api` on their own origin by default, which is what the nginx images provide. If you host the static build somewhere without a proxy, build it with explicit origins:

```bash
VITE_API_URL=https://api.example.com VITE_SOCKET_URL=https://api.example.com npm run build
```

- `VITE_API_URL` prefixes `/api` requests and social `/uploads` image paths.
- `VITE_SOCKET_URL` points Socket.io at the API (defaults to `VITE_API_URL`).
- Both are baked in at build time. Do not rely on changing them after upload.
- When the client and API are on different domains, follow the cross-site cookie rules above.

### Render or Railway

API services:

| Setting | Value |
| --- | --- |
| Root directory | `CodeAlpha_SocialMedia/server` (or the other app) |
| Build command | `npm ci` |
| Start command | `npm start` |
| Environment | `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `PORT` is provided by the platform |

Static clients:

| Setting | Value |
| --- | --- |
| Root directory | `CodeAlpha_EcommerceStore/client` (or the other app) |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Environment | `VITE_API_URL` / `VITE_SOCKET_URL` if the API is on another domain |

Prefer a small VM or a Docker web service for the social feed and boards: Socket.io needs WebSocket-capable proxying, which static-site rewrite rules do not always provide. On Render, a persistent disk is required for the social API's `/app/uploads` directory; without it, uploaded images disappear on redeploy. A single API instance is assumed — running several replicas needs sticky sessions (or a Socket.io adapter) and shared storage for uploads.

## MongoDB

- Atlas connection strings include the replica set; add the database name, for example `mongodb+srv://USER:PASS@cluster/DBNAME?retryWrites=true&w=majority`.
- For self-hosted MongoDB, initialise a replica set once (`rs.initiate()`), then use `?replicaSet=rs0` in `MONGO_URI` for the shop.
- Enable database backups and restrict network access to the API hosts.
- The Compose file uses the database names `codealpha_ecommerce`, `codealpha_social`, and `codealpha_projects`.

## Health checks and verification

Every API exposes `GET /api/health` returning `{"ok":true}`. Point your platform health check or uptime monitor at it.

After deploying:

```bash
curl -fsS https://api.example.com/api/health
curl -fsS https://shop.example.com/ | grep -o '<title>[^<]*'
```

Then in a browser:

1. Register or sign in and reload the page — the session should survive without a token in `localStorage`.
2. Shop: add to cart, check out, and confirm the order appears in **Orders**. Sign in as an admin to add stock and ship it.
3. Feed: post an image, like, comment, follow, and confirm the notification arrives live.
4. Boards: create a project and a task, drag it across columns, and confirm a second browser sees the move.
5. `docker compose logs -f` (or the platform log viewer) should show no 5xx responses or CORS errors.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

- ESLint for the three servers and the three clients (ESLint 10 for clients).
- All API suites against a MongoDB replica set.
- Production builds for all three clients.
- `docker compose build` for every image.
