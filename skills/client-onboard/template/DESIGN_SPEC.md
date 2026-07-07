# {{CLIENT_NAME}} -- Design System & IA Spec (v1)

Single source of truth for all page-building agents. Do not deviate from
tokens, structure, or motion rules without flagging it in PROJECT_NOTES.md.

## Positioning
[Tagline / positioning statement. What tone should the site read as --
upscale and editorial, rugged and trade-forward, clean and corporate? Pull
from client-intake.md's style/vibe answer and niche-research.md.]

ALL COPY AND FACTS COME FROM CONTENT_INVENTORY.md -- read it before writing
any page.

## Tech
Static multi-page site: plain HTML5 + one shared stylesheet + one shared JS
file. No build step, no framework -- see css/main.css and js/main.js.
- `/index.html` -- homepage
- `/services/` or per-service pages -- fill in once the sitemap is set
- `/about.html` -- about / trust page
- `/contact.html` -- contact + form
- `/css/main.css` -- entire design system (tokens -> base -> components ->
  sections -> utilities)
- `/js/main.js` -- nav, scroll reveals, micro-interactions
- `/assets/img/` -- real photos, once available

## Image policy
NO stock photos, NO AI-generated imagery, NO guessed URLs. Every image slot
uses the shared `.img-slot` component (see css/main.css) until a real photo
exists: a tonal placeholder with a `data-asset` id, mapped to the real file
in IMAGE_MANIFEST.md. Layouts must be designed so dropping in a real photo
requires only setting `src` -- aspect ratios are fixed via CSS.

## Design tokens (CSS custom properties in `:root`)
Placeholder palette is in css/main.css -- replace once real brand colors are
known (client intake, existing brand assets, or niche-research direction).
Contrast rule: body text pairs must meet WCAG AA (4.5:1). Note the rule
here once real colors land, e.g. "accent color X is never used for
body-size text on light backgrounds."

Type: [heading font / body font once chosen -- Google Fonts or self-hosted].
Fluid type scale via `clamp()` -- see --step-* tokens in css/main.css.

Spacing: 4px base; section padding via `--space-section`. Content max-width
`--content-max`. Generous whitespace is the default.

## Motion system
- Scroll reveals: `[data-reveal]` fade + rise, gated behind `html.js` (see
  css/main.css comment -- this exists to avoid a real bug: without the
  `html.js` gate, a no-JS visitor sees a permanently blank page).
- `prefers-reduced-motion: reduce` disables all of the above. Mandatory,
  not optional.
- Animate only `transform`/`opacity`. Images `loading="lazy"` below the
  fold, hero eager + `fetchpriority="high"`.

## Shared components
- Header: logo/wordmark, nav, primary CTA. Mobile: hamburger -> menu,
  focus-trapped if it becomes an overlay, Esc closes.
- Footer: NAP (name/address/phone, verbatim from CONTENT_INVENTORY.md),
  hours, quick links, socials. Identical markup on every page.
- CTA band: reusable section, heading + primary CTA button.

## Per-page IA
[Fill in once the sitemap exists -- see build-prompt.md's sitemap section.
One subsection per page: what sections it has, in what order, and why.]

## Copy rules (HARD BOUNDARIES)
- Every claim comes from CONTENT_INVENTORY.md. No invented pricing, no
  invented staff names/credentials, no invented outcome/efficacy claims.
- If a claim the client wants isn't recoverable from real content, write
  around it and log it in PROJECT_NOTES.md under Flags -- don't invent it.
- SEO: unique title (<=60ch) + meta description (<=155ch) per page, local
  intent where relevant, one `<h1>` per page, JSON-LD with only real,
  verified data.

## Accessibility (WCAG 2.1 AA)
Contrast AA everywhere, visible focus styles, alt text on all meaningful
images (empty alt for decorative), keyboard-operable nav, labeled form
fields, `lang="en"`, logical heading order.
