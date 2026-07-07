---
name: client-onboard
description: Sets up a new BrewMint web client end to end -- creates the client folder, scrapes the client's existing site into business.md, runs the website-prompt-generator intake/research/build-prompt pipeline, scaffolds the static site repo from template (wrangler.toml, contact-form Worker, SEO files, living docs), git inits it, and registers the client in the Client Portal. Use when onboarding a new client -- e.g. "onboard this new client", "scrape this business's site and set up the client folder", "set up a new client", "start a new client project", or whenever given a business name and URL to bring on as a BrewMint client.
---

# Client Onboard

## Description

Turns a business name and (usually) a URL into a fully scaffolded BrewMint
client: an intake package (business.md, client-intake.md, niche-research.md,
website-brief.md, build-prompt.md) and a git-initialized static site repo
with deploy config, SEO files, and living docs already in place. It runs
after the sales call, before the actual site gets built -- everything here
prepares the ground so the next Claude Code session can open build-prompt.md
and start building immediately.

## Prerequisites

- Firecrawl (or an equivalent scrape tool) available, for Step 2. If the
  client has no existing site, skip scraping and build business.md from
  discovery-call notes instead.
- The `website-prompt-generator` skill installed (at
  `~/.claude/skills/website-prompt-generator/SKILL.md`) -- Step 3 invokes
  it rather than re-implementing its intake/research/prompt logic.
- Write access to `~/Desktop/BrewMint/Clients/` and
  `~/Desktop/BrewMint/BrewMint-Client-Portal/`.
- `git`, `node`, and `python3` on PATH.

## Process

### Step 1: Name the client and create the folder

Confirm (or derive) two names, because they're different and mixing them up
is exactly the bug this skill exists to prevent:

- **Display name** -- e.g. "Republic Roofing Co." -- used for the client
  folder and all client-facing docs.
- **Slug** -- kebab-case, e.g. `republic-roofing` -- used only for the site
  repo folder and everything inside it (wrangler project name, worker name,
  portal-unrelated). Derive it by lowercasing the display name, replacing
  spaces with hyphens, and stripping anything outside `[a-z0-9-]`, unless
  given an explicit slug.

Create `~/Desktop/BrewMint/Clients/<Client Display Name>/`. The site repo
goes **inside** this folder as `<slug>/` in Step 4 -- it is never a second,
separate top-level entry under `Clients/`. (This has gone wrong before: a
display-name folder and a same-client slug folder ended up as unrelated
siblings under `Clients/`, and the slug one silently became the real,
current repo while the display-name one went stale. Nesting the slug repo
inside the display folder makes that impossible.)

### Step 2: Scrape the existing site and write business.md

If the client has a live site, scrape it (crawl the full site if it's
small, or the key pages -- home, services, about, contact -- if large).
Save the raw scrape output into `<Client Display Name>/.firecrawl/` (crawl
result JSON plus any supplementary page-research files) and keep it; it's
the source-of-truth cache business.md was built from.

Write `business.md` in the client folder root following
`references/business-md-format.md`. If there's no existing site, skip the
scrape and write business.md straight from discovery-call notes in the
same structure, omitting the Pages section.

### Step 3: Run the website-prompt-generator pipeline

Invoke the `website-prompt-generator` skill with `business.md` as input. It runs its
own client-intake questions, spawns a niche-research sub-agent, and writes
`client-intake.md`, `niche-research.md`, and `website-brief.md` into the
client folder. Let it run its full process -- don't shortcut the intake
questions, they're what keeps the eventual build from guessing at what the
client actually wants.

After it finishes, extract the "Claude Code Prompt" section of
website-brief.md into a standalone `build-prompt.md` in the client folder.
Make it self-contained (repeat the project overview and client-preferences
summary inline) so a future session can open build-prompt.md alone, in a
fresh context, and have everything needed to start the build without also
reading website-brief.md.

The client folder now has five files: business.md, client-intake.md,
niche-research.md, website-brief.md, build-prompt.md.

### Step 4: Scaffold the site repo

Run:

```
scripts/scaffold.sh "<client-folder>" "<Client Display Name>" <slug> [domain]
```

`<client-folder>` is the display-name folder from Step 1. `domain`
defaults to `example.com` if the real domain isn't known yet -- fix it
later (grep the repo for `example.com` before launch). This copies
`template/` into `<client-folder>/<slug>/`, substitutes the
`{{CLIENT_NAME}}` / `{{SLUG}}` / `{{DOMAIN}}` tokens, and generates a
placeholder favicon set. It does not touch git and does not deploy
anything.

The result has: `index.html` skeleton, `css/`, `js/`, `assets/img/`,
`wrangler.toml` (`pages_build_output_dir = "."`), `worker/` (contact-form
Worker skeleton -- its own `wrangler.toml`, `package.json`, `src/index.js`),
`robots.txt`, `sitemap.xml` stub, `llms.txt` stub, `site.webmanifest`, the
favicon set, `.gitignore`, and the four living docs plus `To-Do.md`.

Fill in the living docs before handing off -- an empty DESIGN_SPEC.md is
useless to whoever builds the site next:

- **DESIGN_SPEC.md** -- positioning, tokens, motion/accessibility rules.
  Pull positioning from client-intake.md and niche-research.md.
- **CONTENT_INVENTORY.md** -- source-of-truth facts/services/testimonials,
  copied from business.md. Flag anything unverified rather than smoothing
  it over.
- **IMAGE_MANIFEST.md** -- leave empty; it fills in once real photos exist
  (see the `.img-slot` convention documented in css/main.css).
- **PROJECT_NOTES.md** -- leave the D#/F# log empty; it fills in during the
  actual build and every future deploy (client-deploy appends to it).

### Step 5: git init

```
git init
```

inside `<client-folder>/<slug>/`. Do not stage or commit anything --
Hunter reviews and commits himself.

### Step 6: Register in the Client Portal

From `~/Desktop/BrewMint/BrewMint-Client-Portal/`, run its own
registration script non-interactively (it just reads stdin lines, so
piped answers work fine):

```
printf '%s\n%s\n%s\n%s\n' "<Client Display Name>" "<demo URL or TBD>" "<stripe link or TBD>" "<slug>.pdf" | node scripts/new-client.js
```

This appends an entry to `clients.json` with the portal's own slug (a
random 4-byte hex prefix + kebab name, e.g. `a3f82e1c-republic-roofing`) --
that slug only namespaces the client's portal page and is unrelated to the
site repo's `<slug>/` folder name from Step 1. Don't conflate the two.

After registering, tell the user: upload the signed contract PDF to
`public/contracts/`, then run `npm run build` in the portal repo to
regenerate client pages once demoUrl/stripeUrl are final. Don't run that
build yourself unless asked -- the values are often still placeholders at
this point.

## Output

- `~/Desktop/BrewMint/Clients/<Client Display Name>/` containing:
  `.firecrawl/`, `business.md`, `client-intake.md`, `niche-research.md`,
  `website-brief.md`, `build-prompt.md`, and `<slug>/` (the git-initialized,
  scaffolded site repo).
- A new entry in `~/Desktop/BrewMint/BrewMint-Client-Portal/clients.json`.
