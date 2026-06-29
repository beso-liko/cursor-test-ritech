# Dual-site deployment (marketing + app)

Marketing lives at **studybuddy.al** (separate repo). The app lives at **app.studybuddy.al** (this repo). Both deploy from the same Vercel team and stay in sync via Deploy Hooks + GitHub Actions.

## Architecture

| Site | Domain | Git repo | Vercel project |
|------|--------|----------|----------------|
| Marketing | `studybuddy.al`, `www.studybuddy.al` | marketing repo | `studybuddy-marketing` |
| App | `app.studybuddy.al` | `beso-liko/cursor-test-ritech` | `studybuddy-app` |

On push to `main` in either repo:

1. Vercel auto-deploys the changed project (Git integration).
2. GitHub Actions POSTs to the **other** project's Deploy Hook so both sites refresh together.

---

## Step 1 — Create two Vercel projects

Use the same Vercel team for both projects.

### Project A: Marketing (`studybuddy-marketing`)

1. Vercel Dashboard → **Add New → Project**
2. Import the **marketing** Git repository
3. Framework: **Next.js**
4. Root directory: repo root (or subfolder if applicable)
5. Production branch: `main`
6. Deploy

**Domains** (Settings → Domains):

- `studybuddy.al`
- `www.studybuddy.al` (redirect to apex recommended)

**Environment variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://app.studybuddy.al` |

### Project B: App (`studybuddy-app`)

1. Vercel Dashboard → **Add New → Project**
2. Import **`beso-liko/cursor-test-ritech`**
3. Framework: **Next.js**
4. Root directory: `/`
5. Production branch: `main`
6. Deploy

**Domains** (Settings → Domains):

- `app.studybuddy.al`

**Environment variables** (Production):

| Variable | Example / notes |
|----------|-----------------|
| `NEXT_PUBLIC_SITE_URL` | `https://app.studybuddy.al` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role |
| `OPENAI_API_KEY` | OpenAI key |
| `PINECONE_API_KEY` | Pinecone key |
| `PINECONE_INDEX_NAME` | e.g. `study-assistant` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk webhook secret |

**Clerk** (no changes if already configured):

- Production domain: `app.studybuddy.al`
- Webhook: `https://app.studybuddy.al/api/webhooks/clerk`

---

## Step 2 — DNS records

Add these at your registrar (or use Vercel nameservers and assign domains in each project). Copy exact values from each project's **Settings → Domains** if they differ.

### Marketing project (`studybuddy.al`)

| Type | Name / Host | Value | TTL |
|------|-------------|-------|-----|
| **A** | `@` | `76.76.21.21` | 3600 |
| **CNAME** | `www` | `cname.vercel-dns.com` | 3600 |

### App project (`app.studybuddy.al`)

| Type | Name / Host | Value | TTL |
|------|-------------|-------|-----|
| **CNAME** | `app` | `cname.vercel-dns.com` | 3600 |

Vercel may show a project-specific CNAME (e.g. `xxx.vercel-dns-017.com`) — use that instead of the generic target when shown.

---

## Step 3 — Deploy Hooks

In each Vercel project → **Settings → Git → Deploy Hooks**:

| Project | Hook name | Branch | GitHub secret name |
|---------|-----------|--------|-------------------|
| Marketing | `deploy-production` | `main` | `VERCEL_MARKETING_DEPLOY_HOOK` |
| App | `deploy-production` | `main` | `VERCEL_APP_DEPLOY_HOOK` |

### GitHub secrets

**Marketing repo** (Settings → Secrets and variables → Actions):

- `VERCEL_APP_DEPLOY_HOOK` — app project's hook URL

**App repo** (`beso-liko/cursor-test-ritech`):

- `VERCEL_MARKETING_DEPLOY_HOOK` — marketing project's hook URL

---

## Step 4 — GitHub Actions

Already in this repo: [`.github/workflows/deploy-both.yml`](../.github/workflows/deploy-both.yml)

**Marketing repo**: copy [`docs/marketing-deploy-both.yml`](./marketing-deploy-both.yml) to `.github/workflows/deploy-both.yml`.

---

## Step 5 — Marketing CTAs

In the marketing repo, link to the app with **absolute URLs** (not relative paths):

```tsx
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.studybuddy.al";

<Link href={`${appUrl}/sign-up`}>Get started</Link>
<Link href={`${appUrl}/sign-in`}>Sign in</Link>
```

See [`docs/marketing-cta-snippet.tsx`](./marketing-cta-snippet.tsx) for a reusable helper.

---

## Step 6 — Verify

```bash
node scripts/smoke-test-domains.mjs
```

Checklist:

- [ ] `https://studybuddy.al` — marketing (no Clerk auth wall)
- [ ] `https://app.studybuddy.al` — app dashboard / sign-in
- [ ] Push to marketing `main` → both Vercel projects redeploy
- [ ] Push to app `main` → both Vercel projects redeploy
- [ ] Marketing “Sign up” → `app.studybuddy.al/sign-up`

---

## Local development

```bash
# Marketing repo
npm run dev   # localhost:3000

# App repo
npm run dev   # localhost:3001
```

Marketing `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3001
```
