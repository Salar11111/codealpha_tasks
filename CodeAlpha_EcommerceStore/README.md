# Atelier & Oak — Heritage Storefront

Atelier & Oak is a premium made-to-last storefront for shoes and clothing, built as a full-stack MERN demo. Shoppers can browse the collection, open product pages, add items to a cart, register, log in, leave reviews, and place orders. A signed-in shopper can save items to a wishlist, and checkout remembers the shipping address. Stock of five or fewer shows as "Only N left." An admin can add or hide products and mark an order shipped.

No payment is collected — this is a portfolio build. Prices are integer cents; shipping is free ≥ $75, otherwise $7.95 flat; 8% tax is configurable via `TAX_RATE`.

## Screenshots

![Atelier & Oak shop page with 20 products and marquee header](docs/atelier-oak-shop.png)

![Atelier & Oak product detail page with variants, reviews, and restock notices](docs/product-detail.png)

## Task checklist

| Brief requirement | Where it lives |
| --- | --- |
| Product listings | Home page, `GET /api/products` |
| Product details page | `/products/:slug`, `GET /api/products/:id` |
| Shopping cart | `/cart`, `GET/POST/DELETE /api/cart` |
| Order processing | `/checkout` creates an order, reduces stock, clears the cart |
| User registration / login | `/register`, `/login`, JWT on `Authorization: Bearer` |
| Database for products, users, orders | MongoDB database `codealpha_ecommerce` |
| Wishlist save/remove | `/api/wishlist` (auth) |
| Admin CRUD and order status changes | `/admin` (auth as admin) |
| Review submission | `/reviews/product/:id` (auth, after ordering) |
| Transaction fallback | Sequential atomic stock decrements when standalone MongoDB is used |

## Stack

React (Vite), React Router, Node.js, Express, Mongoose, MongoDB, JWT, bcrypt.

## Setup

Requirements: Node.js 18+ and MongoDB running locally (prefer a replica set for checkout transactions).

Checkout uses sequential atomic stock decrements with compensating rollback on standalone MongoDB; replica-set deployments use full transactions. The repo's `docker-compose.yml` already starts a replica set:

```bash
docker compose up -d mongo
```

If you start `mongod` yourself, use `--replSet rs0` and run `rs.initiate()` once in `mongosh`. With a standalone `mongod`, browsing and the cart work, but placing an order falls back to stock-decrement logic that still preserves data integrity.

```bash
npm run install:all
```

Copy the environment file if you are not using the local default, then edit `server/.env`:

```bash
copy .env.example server\.env
```

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | Mongo connection string. Default database name: `codealpha_ecommerce` (needs `?replicaSet=rs0` for full-transaction checkout) |
| `JWT_SECRET` | Secret used to sign login tokens |
| `CLIENT_URL` | Frontend origin(s) allowed by CORS (`http://localhost:5173`; comma-separated for more) |
| `COOKIE_SAMESITE` | Session cookie policy: `lax` (default) or `none` for split-domain HTTPS |
| `PORT` | API port (`5001`) |
| `TAX_RATE` | Tax rate as decimal string, default `0.08` (8%) |

Seed products and the demo account:

```bash
npm run seed
```

Start the API and the client together:

```bash
npm run dev
```

Open http://localhost:5173

## Demo account

- Email: `demo@codealpha.dev` (shopper)
- Email: `admin@codealpha.dev` (can add, hide, and ship products)
- Password: `password123`

You can also register a new account from the Join button.

## API

- `POST /api/auth/register` `{ name, email, password }`
- `POST /api/auth/login` `{ email, password }`
- `GET /api/auth/me`
- `GET /api/products?q=&category=` — supports filters, sort, pagination, returns `facets` + `categoryCounts`; product URLs accept id or slug
- `GET /api/products/:id`
- `GET /api/cart` (auth)
- `POST /api/cart` `{ productId, qty, mode: "add" | "set" }` (auth)
- `DELETE /api/cart/:productId` (auth)
- `POST /api/orders` `{ fullName, line1, city, postalCode, country, state, postalCode }` (auth, also saves the address)
- `GET /api/orders` (auth, current user only)
- `GET /api/orders/all` and `PATCH /api/orders/:id/status` `{ status }` (admin)
- `GET /api/reviews/product/:id`
- `POST /api/reviews/product/:id` `{ rating, text }` (auth, only after ordering that product)
- `GET /api/wishlist` and `POST /api/wishlist/:productId` (auth, toggles a save)
- `GET/POST /api/admin/products` and `PATCH /api/admin/products/:id` (admin)
- `POST /api/admin/products/:id/restock` (admin)
- `GET /api/admin/stats` (admin)

Suggested GitHub repository name: `CodeAlpha_EcommerceStore`.

## Mongo transaction behavior

- **Replica set** (`?replicaSet=rs0`): `ORDER_STATUSES` flow uses `session.withTransaction()` — all stock decrements and order creation happen atomically. If any stock check fails, the entire transaction rolls back.
- **Standalone MongoDB** (no replica set): Transactions are not supported. The checkout fallback performs sequential `$inc` operations on each variant's `stock` field, and on failure pushes `stockHistory` entries and compensating decrements. No order is left in a half-applied state.