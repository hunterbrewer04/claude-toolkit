# business.md format

The canonical shape for `business.md`, the file client-onboard writes after
scraping (or, if there's no existing site, after a discovery call). Every
BrewMint client folder has one in this shape -- keep it consistent so the
website-brief pipeline (Step 3) and any future agent reading the folder
can rely on the structure.

```markdown
# [Business Name]

> [One-line tagline or positioning statement]

[One paragraph: what the business does, where it's based, how long it's
operated, and anything that signals credibility -- ratings, certifications,
years in business. Written from the scraped content, not invented.]

## Contact Information

- **Address:** [street, city, state zip]
- **Phone:** [phone]
- **Email:** [email]
- **Hours:** [hours, if known]

## Key People

- **[Name]** -- [Title]

## Services

### [Service Category Name]
[One to two sentence description, condensed-faithful from the scrape.]

### [Next Service Category]
...

## Credentials

- [Certification, rating, license, association membership]

## Pages

- [Home]([url])
- [Page Name]([url])
```

Notes:

- **Source line.** If the content came from a crawl, keep the raw crawl
  cache (`.firecrawl/`) alongside `business.md` so the mapping from source
  URL to summarized fact is always re-checkable. Don't discard it after
  writing business.md.
- **Services as subsections, not a flat list.** Each major service line
  gets its own `###` so the website-brief pipeline and later the actual
  page-building agent can map one subsection to one page/section directly.
- **No invented facts.** If a fact (hours, email, a specific certification)
  isn't in the scraped data, omit it rather than guess -- CONTENT_INVENTORY.md
  and DESIGN_SPEC.md downstream both inherit this rule, and it starts here.
- **Pages section mirrors the site map at scrape time**, not the future
  new site's sitemap -- it's a record of what existed, not a plan.
- **No new-business case:** if there's no existing site to scrape, write
  business.md directly from discovery-call notes, in the same structure,
  and simply omit the Pages section.
