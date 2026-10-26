# ApplyFlow — Production Deployment Guide (Vercel Hobby Plan)

This guide provides step-by-step instructions to deploy ApplyFlow to **Vercel's free Hobby plan** with a **free-tier PostgreSQL database (Neon)**.

---

## 1. Architecture Overview

ApplyFlow uses a **Single-Origin Full-Stack Architecture**:

```
               ┌────────────────────────────────────────────────────────┐
               │              Vercel Project (applyflow.app)            │
               │                                                        │
               │   ┌────────────────────┐     ┌─────────────────────┐   │
   HTTPS       │   │  Static Frontend   │     │   Serverless API    │   │
  Requests ───>│   │  (Vite + React)    │     │  (Express + Prisma) │   │
               │   │     dist/          │     │    api/index.ts     │   │
               │   └────────────────────┘     └──────────┬──────────┘   │
               └─────────────────────────────────────────┼──────────────┘
                                                         │ SSL Connection
                                                         ▼
                                              ┌─────────────────────┐
                                              │   Neon PostgreSQL   │
                                              │  (Serverless Pool)  │
                                              └─────────────────────┘
```

- **Single Domain**: Both frontend assets and `/api/*` endpoints are served from the same domain (e.g., `https://applyflowai.vercel.app`).
- **No Cross-Site Cookie Issues**: Session cookies (`applyflow_session`) use `SameSite=Lax; Secure; HttpOnly`, completely eliminating third-party cookie blocking in modern browsers (Safari, Chrome Incognito, iOS).
- **Zero Cost**: Operates entirely within the free Hobby tiers of Vercel and Neon.

---

## 2. Database Provisioning (Neon Serverless PostgreSQL)

ApplyFlow requires PostgreSQL with connection pooling for serverless execution.

1. Sign up for a free account at [neon.tech](https://neon.tech).
2. Create a new project:
   - **Name**: `applyflow-prod`
   - **Postgres version**: 16 (or latest)
   - **Region**: Select the region closest to your Vercel deployment (e.g., `us-east-1` / Washington, D.C.).
3. Under **Dashboard > Connection Details**, toggle **"Connection pooling"**:
   - **Pooled connection string** (for runtime):
     ```
     postgresql://<user>:<password>@ep-xyz-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
     ```
   - **Direct connection string** (for migrations):
     ```
     postgresql://<user>:<password>@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require
     ```

> [!IMPORTANT]
> Always use the **Pooled connection string** for `DATABASE_URL` in Vercel to prevent exhausting database connections during traffic spikes.

---

## 3. Applying Database Migrations

Apply database migrations using `prisma migrate deploy`. **Never** run `prisma migrate dev` against production databases.

### Running Migrations from Your Local Machine

Run the deployment migration script pointing to your Neon database:

```bash
# Set your production database URL (use direct connection or pooled with pgbouncer=true)
export DATABASE_URL="postgresql://<user>:<password>@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Apply all pending migrations safely
npm run prisma:deploy
```

On Windows (PowerShell):
```powershell
$env:DATABASE_URL="postgresql://<user>:<password>@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require"
npm run prisma:deploy
```

Verify output confirms:
```
All migrations have been successfully applied.
```

---

## 4. Environment Variables Specification

Configure the following variables in the **Vercel Dashboard** under **Project Settings > Environment Variables**:

| Variable Name | Environment | Description | Example / Source |
|---|---|---|---|
| `DATABASE_URL` | Production, Preview | Neon Pooled PostgreSQL connection string | `postgresql://user:pass@ep-xyz-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true` |
| `NODE_ENV` | Production, Preview | Sets production runtime mode | `production` |
| `CORS_ORIGIN` | Production | Primary production frontend domain | `https://applyflowai.vercel.app` |
| `ENABLE_DEMO_AUTH` | Production, Preview | Enables demo authentication fallback | `true` |
| `VITE_GOOGLE_CLIENT_ID` | Production, Preview, Dev | Google OAuth 2.0 Client ID for Frontend GIS | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_ID` | Production, Preview, Dev | Google OAuth 2.0 Client ID for backend audience check | `xxxx.apps.googleusercontent.com` |

| `RESEND_API_KEY` | Production, Preview, Dev | Resend API key for password reset email delivery (Recommended for Vercel) | `re_xxxxxxxxx` |
| `EMAIL_FROM` | Production, Preview, Dev | Sender email address for password reset and notifications | `ApplyFlow <no-reply@yourdomain.com>` or `onboarding@resend.dev` |
| `APP_URL` | Production | Explicit public application URL for reset link generation | `https://applyflowai.vercel.app` |
| `SMTP_HOST` | Production, Preview, Dev | Optional SMTP server host (fallback if not using Resend) | `smtp.gmail.com` |
| `SMTP_PORT` | Production, Preview, Dev | Optional SMTP server port | `587` |
| `SMTP_USER` | Production, Preview, Dev | Optional SMTP authentication username | `your-email@gmail.com` |
| `SMTP_PASS` | Production, Preview, Dev | Optional SMTP authentication password / app password | `your-app-password` |

> [!NOTE]
> `CORS_ORIGIN` is optional because ApplyFlow automatically recognizes same-host requests and Vercel preview domains (`*.vercel.app`).
> If neither `RESEND_API_KEY` nor `SMTP_HOST` is configured, ApplyFlow operates in development simulation mode (logs reset links and emails directly to the server terminal and surfaces the reset URL on the UI).

### 4.1 Configuring Google OAuth 2.0 (Google Identity Services)

To enable live Google Sign-In with real user Google accounts:

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select or create a Google Cloud Project (e.g., `ApplyFlow`).
3. Click **Configure Consent Screen** (if not already completed):
   - Choose **External** user type.
   - Fill in App Name (`ApplyFlow`), User support email, and Developer contact email.
   - On the Scopes step, the default scopes (`openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`) are all you need.
4. Go to **Credentials > Create Credentials > OAuth client ID**:
   - **Application type**: `Web application`
   - **Name**: `ApplyFlow Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for local development)
     - `https://applyflowai.vercel.app` (your production Vercel domain)
     - Any custom domains you use
   - Click **Create** and copy your **Client ID** (ends with `.apps.googleusercontent.com`).
5. Set the Client ID:
   - In `.env.local` for local development:
     ```bash
     VITE_GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"
     GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"
     ```
   - In **Vercel Project Settings > Environment Variables**:
     - Add `VITE_GOOGLE_CLIENT_ID` with your Client ID (applies to Production, Preview, Development).
     - Add `GOOGLE_CLIENT_ID` with your Client ID.
6. Trigger a redeploy in Vercel or push to `main` so the new Vite environment variable is baked into the frontend build.

### 4.2 Configuring Email Delivery for Password Reset (Resend or SMTP)

ApplyFlow sends secure, responsive HTML password reset confirmation emails.

#### Option A: Resend (Recommended for Vercel Serverless)
1. Sign up for a free account at [resend.com](https://resend.com) (includes 3,000 free emails/month).
2. Create an API Key in the Resend Dashboard under **API Keys**.
3. In your **Vercel Project Settings > Environment Variables**:
   - `RESEND_API_KEY`: `re_xxxxxxxxx`
   - `EMAIL_FROM`: `ApplyFlow <onboarding@resend.dev>` (or your verified domain like `ApplyFlow <no-reply@applyflow.app>`)
   - `APP_URL`: `https://applyflowai.vercel.app` (your actual Vercel domain; if omitted, ApplyFlow automatically infers it from incoming client request headers)

#### Option B: Standard SMTP (Gmail, SendGrid, Mailgun)
If you prefer standard SMTP, configure:
- `SMTP_HOST`: e.g. `smtp.gmail.com`
- `SMTP_PORT`: `587`
- `SMTP_USER`: your email address
- `SMTP_PASS`: your SMTP or Google App Password (not your personal Gmail password)
- `EMAIL_FROM`: `ApplyFlow <your-email@gmail.com>`

---

## 5. Vercel Project Configuration

`vercel.json` is already included in the repository root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm install && npm --prefix server install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/((?!api(?:/|$)).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### Deploying via Vercel Dashboard

1. Navigate to [vercel.com/new](https://vercel.com/new).
2. Import the `applyflow` Git repository.
3. In **Project Configuration**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (automatic)
   - **Output Directory**: `dist` (automatic)
4. Add the **Environment Variables** documented in Section 4.
5. Click **Deploy**.

---

## 6. Post-Deployment Verification

Once the deployment completes, verify each core capability:

### 1. Health Probe
Visit:
```
https://applyflowai.vercel.app/api/health
```
Expected response:
```json
{ "status": "ok" }
```

### 2. User Authentication & Session Persistence
1. Navigate to `https://applyflowai.vercel.app`.
2. Register a new account (`name`, `email`, `password`).
3. Check Developer Tools > **Application > Cookies**:
   - Cookie `applyflow_session` should be present.
   - Flags must show `HttpOnly = true`, `Secure = true`, `SameSite = Lax`.
4. Refresh the page: user session should restore automatically without requiring a second login.

### 3. Application & Interview Workflows
1. Create a new job application card.
2. Drag card across Kanban stages (`Applied` -> `Interview` -> `Offer`).
3. Schedule an interview round.
4. Verify the interview notification badge updates appropriately.
5. Delete the application; verify related interviews are cleaned up via database cascade.

### 4. Direct SPA Routing & Page Refresh
1. Navigate to `https://applyflowai.vercel.app/`.
2. Switch tabs to **Kanban** or **Interviews**.
3. Hard refresh the browser (`Ctrl+F5` or `Cmd+Shift+R`):
   - Page should load cleanly without 404 errors (handled by Vercel rewrite to `index.html`).

---

## 7. Rollback Procedures

If an unexpected runtime regression occurs in production:

1. In the Vercel Dashboard, go to **Deployments**.
2. Locate the previous healthy deployment.
3. Click the **`...`** menu and select **"Instant Rollback"** (or **"Promote to Production"**).
4. Vercel will immediately redirect production traffic to the previous deployment build within seconds.

> [!WARNING]
> Database schema changes are independent of frontend deployments. Maintain backward-compatible Prisma migrations to prevent breaking older builds during rollbacks.

---

## 8. Free-Tier Constraints & Best Practices

- **Neon Auto-Suspend**: Free-tier Neon databases suspend after 5 minutes of inactivity. The first request after suspension may experience a ~500ms cold start while PostgreSQL wakes up.
- **Serverless Timeout**: Vercel Hobby functions have a default 10-second execution timeout. All ApplyFlow API queries complete in < 50ms, well within this limit.
- **Bandwidth**: Vercel Hobby includes 100 GB/month of bandwidth, sufficient for thousands of active job seekers.
- **Local Development**: Local Docker-based PostgreSQL and standalone development commands (`npm run dev`, `npm run server:dev`) remain completely functional without requiring cloud credentials.

---

## 9. Job Discovery & BDJobs Integration

ApplyFlow includes a production-ready **Job Discovery** feature that connects directly to **BDJobs**, allowing users to search jobs, view structured metadata, apply on the original listing, and save listings directly to their application tracker.

### 9.1 Selected Integration Method & Verification

- **Data Source**: Live queries to BDJobs public search endpoint:
  ```
  GET https://api.bdjobs.com/Jobs/api/JobSearch/GetJobSearch?keyword={keyword}&isPro=1&pg={page}&rpp={pageSize}
  ```
  *(Parameter `isPro=1` is required by BDJobs to populate the `data` array with structured listings)*.
- **Canonical Outbound Listing URL**:
  ```
  https://bdjobs.com/h/details/{jobId}
  ```
- **Fallback Search Link**:
  ```
  https://bdjobs.com/h/jobs?keyword={query}
  ```
- **Robots / Terms**: Does not disallow `/Jobs/api` or `/h/` paths.
- **No API Secrets Required**: The public endpoint does not require API keys or paid credentials.
- **Security & Hostname Whitelist**: Outbound links are strictly validated server-side and client-side against permitted BDJobs hostnames (`bdjobs.com`, `jobs.bdjobs.com`, `www.bdjobs.com`, `api.bdjobs.com`). No arbitrary redirects are allowed. All external links open with `target="_blank"` and `rel="noopener noreferrer"`.

### 9.2 Upstream Rate Limits, Timeouts & Caching

- **Serverless Timeout**: Upstream queries to `api.bdjobs.com` have a strict 6,000ms timeout (`AbortSignal.timeout(6000)`), keeping execution safely below Vercel Hobby's 10-second limit.
- **Graceful Fallbacks**: If BDJobs is experiencing temporary downtime, rate limits, or network timeouts, the API returns a structured `{ status: "unavailable" }` response accompanied by a direct fallback link to BDJobs carrying over the user's search query. No fake or fabricated results are ever displayed.
- **In-Memory Caching**: Identical search queries are cached in memory for 5 minutes (max 100 entries) to minimize redundant upstream bandwidth and avoid rate-limiting.

### 9.3 Tracker Persistence (Dual-Mode & Duplicate Prevention)

- **PostgreSQL / Prisma**: Added `source String?`, `sourceJobId String? @map("source_job_id")`, and `salary String?` with index `@@index([userId, sourceJobId])`.
- **Guest Mode**: Guest users store discovered jobs in `localStorage` under `applyflow_guest_applications_v1`.
- **Duplicate Prevention**: Both server API and guest storage enforce duplicate checking based on `sourceJobId` / `jobUrl`. Attempting to save a previously saved job returns HTTP 409 Conflict and alerts the user without creating duplicate records.
- **Canonical Status**: Discovered jobs are saved with status `Saved`. Opening an external listing to apply never silently mutates the application state; status transitions remain user-controlled.

### 9.4 Adding Another Provider

The provider layer is modular and decoupled from React components:

1. Implement the `JobProvider` interface in `server/src/services/jobs/types.ts`:
   ```typescript
   export interface JobProvider {
     readonly id: string
     readonly name: string
     readonly isAvailable: boolean
     search(params: JobSearchParams): Promise<JobSearchResponse>
     getListingUrl(sourceJobId: string): string
     getSearchUrl(params: JobSearchParams): string
   }
   ```
2. Create the provider class in `server/src/services/jobs/<providerName>Provider.ts`.
3. Register the provider in `server/src/services/jobs/jobService.ts`:
   ```typescript
   registerProvider(new MyNewProvider())
   ```
4. Frontend cards and tracker persistence automatically handle the new provider via the normalized `DiscoveredJob` model.

