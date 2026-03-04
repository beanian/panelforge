# PanelForge — Deployment Model

## Overview

PanelForge runs as a single Docker container on Azure Container Apps. The container bundles the Express API server and the pre-built React client as static files. PostgreSQL runs as a managed database. Deployments are automated via GitHub Actions on every push to `main`.

```
GitHub (main)
    │ push
    ▼
GitHub Actions
    │ build + push
    ▼
Azure Container Registry
    (panelforgeacr.azurecr.io)
    │ deploy
    ▼
Azure Container Apps
    (panelforge / panelforge-rg)
    │ connect
    ▼
PostgreSQL (managed)
```

## Container Image

**Dockerfile** (root of repository):

```dockerfile
FROM node:20-slim

# Prisma requires OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (layer-cached)
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN cd server && npx prisma generate
RUN npm run build --workspace=client

ENV NODE_ENV=production PORT=8080
EXPOSE 8080

# Run migrations then start server
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && npx tsx src/index.ts"]
```

Key points:

- **Single-stage build** — the container includes both the build toolchain and runtime. The client is built at image build time; the server runs from TypeScript via `tsx`.
- **Migrations at startup** — `prisma migrate deploy` runs before the server starts, applying any pending migrations. This is safe for additive changes (new tables, new columns with defaults). Destructive migrations should be reviewed carefully.
- **Static file serving** — in production, the Express server serves the Vite-built client from `client/dist/` as static files and handles `/api` routes.
- **Port 8080** — Azure Container Apps expects this port.

## CI/CD Pipeline

**Workflow**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Azure Container Apps

on:
  push:
    branches: [main]
  workflow_dispatch:          # Manual trigger

env:
  REGISTRY: panelforgeacr.azurecr.io
  IMAGE_NAME: panelforge
```

### Steps

1. **Checkout** — clone the repository
2. **Docker login** — authenticate to Azure Container Registry using `ACR_USERNAME` and `ACR_PASSWORD` secrets
3. **Build and push** — build the Docker image, tag with both the commit SHA and `latest`, push both tags
4. **Azure login** — authenticate to Azure using `AZURE_CREDENTIALS` (service principal JSON)
5. **Deploy** — update the Azure Container App to use the new image:
   ```
   az containerapp update \
     --name panelforge \
     --resource-group panelforge-rg \
     --image panelforgeacr.azurecr.io/panelforge:{sha}
   ```

### Rollback

To roll back, re-deploy a previous image tag:

```bash
az containerapp update \
  --name panelforge \
  --resource-group panelforge-rg \
  --image panelforgeacr.azurecr.io/panelforge:{previous-commit-sha}
```

Previous images are retained in ACR with their commit SHA tags.

## Azure Resources

| Resource | Type | Name |
|----------|------|------|
| Resource Group | — | `panelforge-rg` |
| Container Registry | Azure Container Registry | `panelforgeacr` |
| Application | Azure Container Apps | `panelforge` |
| Database | PostgreSQL | Configured via `DATABASE_URL` env var |

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/panelforge?schema=public` |
| `PORT` | Server listen port | `8080` (production), `3001` (development) |
| `NODE_ENV` | Environment mode | `production` or `development` |

### Optional (Aircraft Lineage)

| Variable | Description | Default |
|----------|-------------|---------|
| `AIRCRAFT_CACHE_TTL_HOURS` | Cache expiry for aircraft photo data | `168` (7 days) |

### CI/CD Secrets (GitHub)

| Secret | Description |
|--------|-------------|
| `ACR_USERNAME` | Azure Container Registry username |
| `ACR_PASSWORD` | Azure Container Registry password |
| `AZURE_CREDENTIALS` | Azure service principal credentials (JSON) |

## Database Migrations

Prisma migrations are applied automatically at container startup via `prisma migrate deploy`. This command:

- Applies all pending migrations in order
- Is idempotent — re-running against an up-to-date database is a no-op
- Does not generate new migrations (that happens in development only)
- Fails the container startup if a migration fails, preventing the server from running against an inconsistent schema

### Migration Safety

All migrations to date are additive:

| Migration | Type | Risk |
|-----------|------|------|
| `init` | Create all tables | Safe (first run) |
| `mosfet_default_8_channels` | Add default value | Safe |
| `add_component_map_coords` | Add nullable columns | Safe |
| `add_section_owned_field` | Add column with default | Safe |
| `add_requires_mosfet_field` | Add column with default | Safe |
| `add_pin_labels` | Add columns | Safe |
| `pin_types_per_pin` | Add columns | Safe |
| `per_pin_power_mosfet` | Add columns | Safe |
| `add_current_columns` | Add columns | Safe |
| `add_psu_config` | Create table | Safe |
| `add_aircraft_cache` | Create table + index | Safe |

No migrations drop tables, remove columns, or alter data types. All new columns are either nullable or have defaults, ensuring zero data loss.

## Local Development

### Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL)

### Setup

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies
npm install

# Generate Prisma client
cd server && npx prisma generate

# Apply migrations + seed
npx prisma migrate dev
npx prisma db seed

# Start both client and server
cd .. && npm run dev
```

This starts:
- **Client** at `http://localhost:5173` (Vite dev server with HMR)
- **Server** at `http://localhost:3001` (tsx watch with auto-reload)
- **PostgreSQL** at `localhost:5432` (Docker)

The Vite dev server proxies `/api` requests to the Express server.

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: panelforge
      POSTGRES_PASSWORD: panelforge_dev
      POSTGRES_DB: panelforge
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Production Topology

```
┌─────────────────────────────────────────────────┐
│              Azure Container Apps                │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │          panelforge container             │   │
│  │                                          │   │
│  │  ┌─────────────┐  ┌──────────────────┐  │   │
│  │  │ Express API  │  │  Static client   │  │   │
│  │  │  /api/*      │  │  client/dist/*   │  │   │
│  │  │             ←┼──┤  (Vite build)    │  │   │
│  │  └──────┬──────┘  └──────────────────┘  │   │
│  │         │                                │   │
│  └─────────┼────────────────────────────────┘   │
│            │                                     │
└────────────┼─────────────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │  PostgreSQL   │
      │  (managed)    │
      └──────────────┘
             │
             ▼
      ┌──────────────────────────────┐
      │  External APIs (outbound)    │
      │  - api.planespotters.net     │
      └──────────────────────────────┘
```

All traffic enters through a single container. The Express server handles both API requests and serves the static React build. External API calls are made server-side only.
