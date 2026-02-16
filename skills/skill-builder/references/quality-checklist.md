# Quality Checklist

Pre-deployment validation for skills. Complete every item before deploying.

## Frontmatter

- [ ] SKILL.md exists in the skill directory
- [ ] YAML frontmatter is present (delimited by `---`)
- [ ] `name` field is present and ≤64 characters
- [ ] `name` uses only letters, numbers, hyphens, and spaces
- [ ] `description` field is present and ≤1024 characters
- [ ] No extra fields beyond `name` and `description`

## Description Quality

- [ ] Written in third person ("This skill should be used when...")
- [ ] Includes specific trigger phrases in quotes ("create a skill", "write a skill")
- [ ] Does NOT summarize the skill's workflow or process
- [ ] Covers relevant synonyms and related terms
- [ ] Is specific enough for Claude to distinguish from other skills

## Body Content

- [ ] SKILL.md body is under 500 lines
- [ ] Body is 1,500-2,000 words (or appropriately sized for content)
- [ ] Written in imperative/infinitive form throughout
- [ ] No second-person language ("you should", "you need to")
- [ ] Includes Overview section with core principle
- [ ] Includes Quick Reference table or bullets
- [ ] One excellent code example (not multi-language duplicates)
- [ ] Consistent terminology throughout

## Progressive Disclosure

- [ ] Detailed content (>100 lines) moved to `references/`
- [ ] All reference files linked from SKILL.md's "Additional Resources" section
- [ ] References are one level deep (no chained references)
- [ ] Reference files >100 lines include a table of contents
- [ ] Only necessary directories created (no empty directories)

## Files and Paths

- [ ] All files referenced in SKILL.md actually exist
- [ ] All paths use forward slashes (no backslashes)
- [ ] Files named descriptively (`validation-rules.md`, not `doc2.md`)
- [ ] Scripts are executable (`chmod +x`)
- [ ] Scripts include usage documentation (comments or --help)
- [ ] No time-sensitive information (or properly handled in "old patterns" sections)

## Content Quality

- [ ] No information Claude already knows (common programming concepts, standard libraries)
- [ ] No narrative storytelling ("In session 2025-10-03, we found...")
- [ ] No multi-language duplication (one excellent example, not five mediocre ones)
- [ ] Flowcharts used only for non-obvious decision points
- [ ] Cross-references use skill name: `**REQUIRED:** Use superpowers:tdd`
- [ ] No `@` links to files (force-loads context)
- [ ] No vague labels in diagrams (helper1, step2, pattern3)

## Testing

- [ ] Trigger test: skill loads when expected phrases are used
- [ ] Application test: skill produces correct behavior on real task
- [ ] Edge case test: skill handles unusual scenarios gracefully
- [ ] Validation script passes: `bash scripts/validate-skill.sh /path/to/skill/`
