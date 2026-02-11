# Backend Options and Local‑First Sync Plan

This document outlines how to add an optional backend to Practice Space while preserving the app’s local‑first, offline default. It covers architectural choices, a pragmatic sync strategy, build‑time flavor selection, auth/privacy considerations, deployment, and a phased rollout plan.

## Goals
- Preserve the local‑first UX: fast, offline by default; IndexedDB remains the primary store.
- Keep original audio files local and unmodified; backend sync is metadata‑centric.
- Minimize complexity: small, composable adapters; opt‑in backend.
- Allow choosing “no backend” or one of several backends at build time.
- Provide predictable conflict resolution and safe migrations.

## Non‑Goals
- Replacing local storage with a hard dependency on a server.
- Building a full DAW or cloud audio processor; waveform generation stays in Web Workers.
- Introducing heavy real‑time CRDT frameworks unless the use case warrants it.

---

## Data Model (recap)
- Sources: user‑imported audio files; store metadata (name, path/handle, duration, tags). Original audio files are not modified.
- Slices: non‑destructive regions of a source (start/end, labels, tags); waveform preview is generated locally.
- Projects: collections of slices; may include group references (type+title) that expand dynamically.

Backend stores only metadata and user settings. Audio files remain local unless the user explicitly opts to upload copies.

---

## Architecture Options

### 1) Supabase (Postgres + Auth + Storage)
**Pros**: SQL, RLS policies for multi‑user, built‑in auth, storage for optional media, row‑level security.
**Cons**: Requires Postgres schema management; more ops than pure serverless.
**Fit**: Strong general choice; good balance of features, easy SDK.

### 2) Firebase (Firestore + Auth + Storage)
**Pros**: Fully managed, generous free tier, client SDKs, offline cache.
**Cons**: No SQL; complex security rules; export/migrate data less straightforward.
**Fit**: Simple to start, good for rapid prototypes and mobile.

### 3) PocketBase (embedded SQLite + auth + file storage)
**Pros**: Single binary, self‑hostable, simple REST; low footprint.
**Cons**: Operated by you; scaling/features limited vs managed cloud.
**Fit**: Great for hobby/self‑host; minimal ops.

### 4) Self‑hosted Node (Express/Nest) + Postgres
**Pros**: Full control, tailored APIs, predictable SQL schema.
**Cons**: Highest ops burden; more code to maintain.
**Fit**: Best for custom workflows or enterprise constraints.

### 5) Edge/serverless DBs (Cloudflare D1/R2, Turso/libSQL)
**Pros**: Low latency, easy global deploys; R2 for optional media.
**Cons**: Varying feature maturity; auth/story is DIY.
**Fit**: Good for metadata sync with simple auth.

Recommendation: Start with Supabase adapter for robust SQL + auth, then add a Firebase adapter for a fully‑managed option. Keep a “no backend” adapter as the default.

---

## Sync Strategy (Local‑First)

### Core principles
- IndexedDB remains the source of truth on device; backend is a replication target.
- Changes are recorded as small “ops” with timestamps and a `clientId`.
- Sync runs opportunistically: on launch, periodic, and on network regain; user can trigger manual sync.

### Entity syncing
- Sources: metadata only (name, duration, tags, fingerprint). File handles/paths are local‑only.
- Slices: immutable `id`; editable fields (title, tags, range) use last‑write‑wins per field.
- Projects: union semantics for `sliceIds`; group references kept as `{type,title}`.

### Conflict resolution
- Scalars (title/description): last‑write‑wins using `updatedAt` and `clientId` tie‑break.
- Sets (`sliceIds`, tags): merge by union; deletion tracked via tombstones to prevent resurrecting removed items.
- Group references: treat as set; same union/tombstone rules.

### Change tracking
- Maintain an `ops` log in IndexedDB: `{id, entityType, entityId, opType, payload, clientId, ts}`.
- On sync, push unsynced ops; server applies idempotently and returns `checkpoint`.
- Pull server changes since `checkpoint`; apply locally and mark ops synced.

### Optional media upload
- Default: no upload. If enabled, store copies in backend storage (e.g., Supabase Storage/R2) with checksums.
- Upload is background and resumable; references kept in metadata as optional URLs.

---

## Build‑Time Flavor Selection

Introduce a `BackendAdapter` interface and choose implementation via env:

```ts
// services/backend/types.ts
export interface BackendAdapter {
  init(): Promise<void>
  auth?: {
    signIn(): Promise<void>
    signOut(): Promise<void>
    currentUser(): Promise<{ id: string } | null>
  }
  pushOps(ops: Op[]): Promise<Checkpoint>
  pullChanges(since: Checkpoint): Promise<ChangeSet>
}
```

Adapters:
- `NoBackendAdapter` (default): no‑op sync; local only.
- `SupabaseAdapter`: Postgres tables, row policies, storage optional.
- `FirebaseAdapter`: Firestore collections, rules, storage optional.

Selection:
- Use `import.meta.env.VITE_BACKEND` = `none | supabase | firebase`.
- Create `services/backend/index.ts` that exports the chosen adapter.
- Keep UI logic unchanged by relying on provided/injected store APIs; only the sync layer swaps.

---

## Auth & Privacy

- Auth options: Supabase Auth, Firebase Auth, or minimal token auth (self‑hosted).
- Scopes: metadata read/write; media upload only if user opts in.
- Privacy defaults: no media leaves device unless enabled; redact file paths/handles from server.
- Security: use hashed fingerprints (e.g., SHA‑256) for dedup; encrypt uploaded media at rest via provider.

---

## Deployment & Ops

- Supabase: SQL migrations via `supabase/migrations`; configure RLS; set env in Vite.
- Firebase: deploy rules and indexes; set env; configure storage buckets.
- Self‑hosted: dockerize API; run Postgres; set up backups; CI for migrations/tests.
- Observability: basic metrics (sync successes/failures), error reporting.

---

## Phased Rollout

1) Abstraction layer
   - Define `BackendAdapter` and wire the sync orchestrator; ship `NoBackendAdapter`.
2) Supabase POC
   - Create schema (sources, slices, projects, ops, checkpoints); basic auth.
   - Implement push/pull; last‑write‑wins + union semantics.
3) Manual sync UI
   - Add “Sync now” and status indicator; show conflicts resolved.
4) Background sync
   - Periodic + on network regain; exponential backoff.
5) Optional media upload
   - Opt‑in toggle; background resumable uploads; checksum verification.
6) Add Firebase adapter
   - Mirror the orchestrator against Firestore + Storage; verify feature parity.
7) Stabilize and document
   - Ship docs and migration guide; bake in tests.

---

## Open Questions

- Multi‑user collaboration: real‑time needs? If so, consider websockets and finer‑grained CRDTs for shared projects.
- Media dedup across devices: do we need server‑side reference counting?
- Storage quotas: what limits and user messaging are acceptable?

---

## Implementation Checklist

- [ ] Define `BackendAdapter` and common types (`Op`, `Checkpoint`, `ChangeSet`).
- [ ] Implement `NoBackendAdapter` and orchestrator hooks in the app.
- [ ] Supabase schema + adapter with auth and RLS.
- [ ] Conflict resolution unit tests (scalars, sets, tombstones).
- [ ] Manual sync UI + status.
- [ ] Background sync + backoff.
- [ ] Optional media upload (checksums, resumable).
- [ ] Firebase adapter for managed option.
- [ ] Deployment guides and env setup.

---

## Env Configuration (example)

```env
VITE_BACKEND=none          # none | supabase | firebase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
VITE_ENABLE_MEDIA_UPLOAD=false
```

This plan keeps the current local‑first philosophy intact while enabling optional cloud sync and collaboration without entangling core audio functionality.
