# Tolaria Vault Conventions

Complete conventions for Tolaria starter vaults. Each vault has its own `AGENTS.md` that may extend or override these — when in doubt, defer to the vault's own `AGENTS.md`.

## Table of Contents

- [Notes](#notes)
- [Types](#types)
- [Relationships](#relationships)
- [Wikilinks](#wikilinks)
- [Views](#views)
- [Filenames](#filenames)
- [Underscore-prefixed keys](#underscore-prefixed-keys)
- [Common pitfalls](#common-pitfalls)

---

## Notes

One Markdown note per file. Standard shape:

```yaml
---
type: Note
related_to: "[[tolaria]]"
status: Active
url: https://example.com
---

# Example note

Body content in Markdown.
```

**Rules:**
- The first H1 in the body is the display title. **Do not add `title:` frontmatter** to new notes — legacy `title:` is read as a fallback only when no H1 exists.
- The `type:` value must match a type file at the vault root (e.g. `type: Note` requires `note.md` to exist with `type: Type`).
- Other frontmatter is freeform per the vault's needs (`status`, `url`, custom fields).

---

## Types

In starter vaults, types are regular notes stored at the vault root and use `type: Type`.

```yaml
---
type: Type
_icon: rocket
_color: "#3b82f6"
_order: 0
_list_properties_display:
  - related_to
_sort: "property:onboarding:asc"
---

# Project
```

Useful type metadata:

| Key | Purpose |
|-----|---------|
| `_icon` / `icon` | Lucide icon name |
| `_color` / `color` | Hex color for badges |
| `_order` / `order` | Sort order in the sidebar |
| `_list_properties_display` | Frontmatter keys shown in note list |
| `_sort` | Default sort for notes of this type |
| `template` | Default body for new notes of this type |
| `view` | Default view to open for this type |
| `visible` | Whether the type appears in the sidebar |
| `sidebar label` | Display name override |

**When editing an existing type file, preserve the key style already used there** (underscored vs non-underscored). Do not mass-normalize.

---

## Relationships

Any frontmatter property whose value contains `[[wikilinks]]` is treated as a relationship. Common keys: `related_to`, `belongs_to`. Custom relationship names are valid too.

**Single relationship:**
```yaml
related_to: "[[tolaria]]"
```

**Multiple relationships:**
```yaml
related_to:
  - "[[project-a]]"
  - "[[project-b]]"
```

**Legacy form:** Some vaults use `Belongs to:` with a colon and capitalized key. Preserve this when editing existing notes that already use it.

---

## Wikilinks

Three forms:

| Syntax | Purpose |
|--------|---------|
| `[[filename]]` | Link by filename (without `.md`) |
| `[[Note Title]]` | Link by H1 title (resolves to filename) |
| `[[filename\|display text]]` | Custom display text |

Wikilinks work in **both frontmatter values** (must be quoted as scalar strings) **and Markdown body**.

---

## Views

Saved views live in `views/*.yml`. Tolaria scans every `.yml` file in `views/`; the filename is the stable view id, so use kebab-case (`active-projects.yml`).

**Schema:**

```yaml
name: Active Projects
icon: null
color: null
sort: "property:onboarding:asc"
filters:
  any:
    - field: type
      op: equals
      value: Project
    - field: related_to
      op: contains
      value: "[[tolaria]]"
```

**Rules:**
- `name` is required
- `icon`, `color`, `sort` are optional
- `sort` uses `option:direction`. Built-in options: `modified`, `created`, `title`, `status`. Custom-property sorts use `property:<Property Name>`, e.g. `property:onboarding:asc`
- `filters` must be a tree whose root is exactly one `all:` group or one `any:` group
- Each filter condition uses `field`, `op`, and usually `value`
- **Never create JSON view files or `.view.json` filenames**

**Filterable fields:** `type`, `status`, `title`, `favorite`, `body`, plus any frontmatter key actually in use (`related_to`, `belongs_to`, `url`, etc.)

**Operators:** `equals`, `not_equals`, `contains`, `not_contains`, `any_of`, `none_of`, `is_empty`, `is_not_empty`, `before`, `after`

- `any_of` and `none_of` expect `value` to be a YAML list
- `regex: true` is supported with `equals`, `not_equals`, `contains`, `not_contains`
- Relationship filters can use wikilinks in `value` (e.g. `value: "[[tolaria]]"`)

---

## Filenames

- Kebab-case: `my-note-title.md`
- One note per file
- `.md` extension only

---

## Underscore-prefixed keys

Frontmatter keys starting with `_` (`_icon`, `_color`, `_order`, `_sort`, `_list_properties_display`) are **Tolaria-managed state**. Leave them alone unless the user explicitly asks to change them.

The non-underscored equivalents (`icon`, `color`, `order`, `sort`) are user-editable. Some vaults mix both — when editing, match the style already in the file.

---

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| Adding `title:` frontmatter to new notes | Use first H1 instead |
| Setting `type:` to a value with no matching root file | Create the type file first or pick an existing type |
| Using JSON for views | Use YAML in `views/*.yml` |
| Using `.view.json` extensions | Use `.yml` |
| Treating `attachments/*` as notes | Attachments are assets — reference them, don't index them |
| Mass-normalizing underscored keys | Preserve the style in each file |
| Unquoted wikilinks in frontmatter | Quote scalars: `related_to: "[[note]]"` |
| Moving type files out of vault root | Keep them at root unless user explicitly asks |
| Silently overwriting an existing custom `AGENTS.md` | Read it first, preserve user customization |
