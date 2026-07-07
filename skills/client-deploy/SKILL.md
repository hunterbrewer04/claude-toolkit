---
name: client-deploy
description: Deploys a BrewMint client's static site (and its contact-form Worker, if present) to Cloudflare Pages via wrangler, then verifies the live site with a pass/fail check across sitemap, robots, llms.txt, manifest, favicon, homepage, and the contact-form endpoint. Logs the deploy in the repo's PROJECT_NOTES.md. Use when pushing a client site live -- e.g. "deploy the serenity site", "push the client site live", "ship this site", "deploy to production", or whenever a BrewMint static site repo needs to go out to Cloudflare Pages.
---

# Client Deploy

## Description

Ships a BrewMint client's static site repo (built via client-onboard's
template, or any repo with an equivalent `wrangler.toml`) to Cloudflare
Pages, deploys its contact-form Worker if one exists, then verifies the
live result actually works instead of assuming a clean `wrangler deploy`
means the site is correct. This is an outward-facing, one-way action --
once it runs, the change is visible on the client's real domain or at
minimum a public `*.pages.dev` URL -- so it always starts with confirming
exactly which client and repo are about to go live.

## Prerequisites

- `wrangler` CLI installed and authenticated: run `wrangler login` once, or
  set the `CLOUDFLARE_API_TOKEN` environment variable. Deploys fail
  immediately without one of these.
- The repo has a `wrangler.toml` with `pages_build_output_dir` set
  (client-onboard's template sets this to `.`), and optionally a `worker/`
  directory with its own `wrangler.toml`.
- The client's live base URL (custom domain, if attached) for the
  verification step -- otherwise use the `*.pages.dev` URL `wrangler`
  prints after the first deploy.

## Process

### Step 1: Confirm the client and repo

State which client, which repo path, and which Cloudflare Pages project
this maps to, and get explicit confirmation before doing anything else.
Never infer this from context alone -- deploying the wrong repo, or the
right repo before the client has actually approved the build, is exactly
the kind of mistake that's expensive to walk back once it's live. If it's
ambiguous which repo or client is meant, ask.

### Step 2: Deploy the Pages site

From the repo root (the directory containing `wrangler.toml`):

```
wrangler pages deploy . --project-name=<slug>
```

`wrangler` creates the Pages project on first deploy if it doesn't exist
yet, and prints the deployment URL. Capture that URL for Step 4 if the
client doesn't have a custom domain attached yet.

### Step 3: Deploy the Worker, if present

If the repo has a `worker/` directory:

```
cd worker && wrangler deploy
```

This deploys the contact-form Worker independently of the Pages site. If
the site's contact form posts to a relative path like `/api/contact`
(client-onboard's template does this so no CORS handling is needed), the
Worker must also be bound to a Workers Route on the site's domain (e.g.
`<domain>/api/contact`) in the Cloudflare dashboard -- `wrangler deploy`
does not create that route binding. This is one-time setup per client;
flag it to the user if this looks like the first deploy for this client,
since the route not being bound is a silent failure mode (the form submits,
gets a 404, and nobody notices until a client complains that leads never
came through).

### Step 4: Verify the deploy

```
scripts/check.sh <base-url>
```

`<base-url>` is the live custom domain if one's attached, otherwise the
`*.pages.dev` URL from Step 2. It checks, over HTTP:

- `/`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/site.webmanifest`,
  `/favicon.ico` -- each expected to return 200
- a dry `POST` to `/api/contact` -- confirms the endpoint exists and
  rejects an invalid payload (400/405) without sending a real submission
  or email; a 404 here just means this client has no contact-form Worker,
  which isn't a failure on its own

Prints a pass/fail table and exits non-zero if a required check failed.
Investigate and fix any failure before telling the client the site is
live -- a missing sitemap or a dead contact form is exactly the kind of
thing that stays invisible until someone actually checks for it.

### Step 5: Log the deploy

Append a dated entry to the repo's `PROJECT_NOTES.md`, under "Deploy log":

```markdown
### Deploy YYYY-MM-DD
Deployed to <base-url> via wrangler pages deploy. Worker: <deployed |
not present>. check.sh: <N>/<N> passed[, noting any failures and the fix].
```

Keep it to one entry per deploy, dated, no fluff -- consistent with the
D#/F# decision-and-flag log style the rest of the file uses.

## Output

- A live Cloudflare Pages deployment (and Worker deployment, if the repo
  has one).
- A printed check.sh pass/fail table, confirmed clean before reporting the
  site as live.
- A new dated entry in the repo's `PROJECT_NOTES.md`.
