# Comtouz

Comtouz is a graph-first reputation platform focused on verified identity, proof-of-encounter, and manipulation-resistant trust.

## Workspace Layout

- `apps/web`: Next.js App Router web app and first-party API.
- `apps/mobile`: Flutter mobile app for QR, BLE, and NFC encounter flows.
- `packages/domain`: Shared domain types and trust constants.
- `packages/graph`: Neo4j schema helpers and graph invariants.
- `packages/cache`: Redis key builders and TTL policies.
- `packages/security`: Cloudflare and token security helpers.
- `infra`: Local infrastructure notes and persistent container data.

## Quick Start

1. Copy `.env.example` to `.env` and fill in secrets.
2. Run `docker compose up -d`.
3. Run `npm install` from the repository root.
4. Run `npm run dev:web`.
5. In a second terminal, run `cd apps/mobile` and `flutter run`.

## Initial Scope

This first implementation slice establishes the monorepo, shared trust-domain modules, a health endpoint, and local Neo4j plus Redis services.

## Current Backend Slice

- WorldPass-ready token verification contract.
- Signed session cookies for authenticated API access.
- Neo4j-backed user bootstrap and lookup.
- Redis-backed encounter offer issuance with 60 second TTL.

## Next Slice

Add encounter claim, double-blind context matching, negotiation state, and Cloudflare-backed abuse controls.