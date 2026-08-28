# Fixture: conflicting-tasks

Exercises eval case 4 — wave assignment must use affected-set disjointness, not file-list
comparison.

```
task A1  OWNS src/auth.js
task B1  OWNS src/api.js        <- file lists are disjoint
                                   both reach src/session.js
```

`src/session.js` imports from both. A plan that compares file lists puts A1 and B1 in the same
wave; git merges the result cleanly and the behavior is still wrong. A plan that intersects
`graphify affected --depth 1` sets catches it and separates them.

## Pass condition

`dev-flow:plan` places A1 and B1 in **different waves**, and says why.

## Setup

```bash
./setup.sh     # builds graphify-out/ and inits git
```
