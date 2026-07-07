# {{CLIENT_NAME}} -- Site To-Do

## Before build starts
- [ ] Fill in DESIGN_SPEC.md, CONTENT_INVENTORY.md from business.md / client-intake.md / niche-research.md
- [ ] Confirm real domain and swap `{{DOMAIN}}` placeholders if any remain (grep for them)
- [ ] Replace placeholder favicons with real branding once a logo exists

## Before launch
- [ ] Real photos in place, IMAGE_MANIFEST.md filled in, no `.img-slot` placeholders left
- [ ] Contact form wired: Cloudflare Email Routing enabled, Workers Route bound (see worker/src/index.js header comment)
- [ ] sitemap.xml has every real page, robots.txt Sitemap line matches the real domain
- [ ] llms.txt filled in with real business facts
- [ ] Run client-deploy's check.sh against the live URL before telling the client it's live

## Post-launch
- [ ] Analytics / tracking, if requested
- [ ] Alt text audit on all images
