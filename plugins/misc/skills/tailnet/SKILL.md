---
name: tailnet
description: Manages Hunter's home tailnet servers (registered in ~/.claude/tailnet-servers.json) for moving files onto them and sharing local files off this Mac. Covers four actions - transfer a file/folder to a server over rsync+ssh, serve a local file or directory over HTTP on this Mac's tailscale IP so another device on the tailnet can open it, stop servers started that way, and send a file straight to a phone or tablet via Taildrop. Use when Hunter says things like "transfer this to my server", "send this to code-projects on my home server", "copy this over to the micro server", "serve this on my tailscale ip so I can read it on my phone", "let me pull this up on my iPad", "shut down the server", "stop serving that", or "send this to my iphone" (Taildrop, not AirDrop).
---

# Tailnet

Move files onto Hunter's home servers and share local files across his tailnet (Tailscale private network). Four verbs: transfer, serve, stop, send.

## Description

This skill wraps the tailnet workflows Hunter repeats by hand: pushing a file or project folder to a home server over `rsync`+`ssh`, temporarily serving something from this Mac so a phone or tablet on the same tailnet can open it in a browser, killing that temporary server when he's done, and one-shot sending a file to a device via Tailscale's Taildrop. It is Mac-only — the servers themselves are managed remotely over SSH, never scripted into by this skill.

## Prerequisites

- `tailscale` CLI installed and `tailscaled` running on this Mac (`tailscale status` to check). `serve` degrades to binding `127.0.0.1` if it can't get a tailscale IP — tell Hunter when that happens, since it means the phone won't be able to reach it.
- SSH aliases for the registered servers already configured in `~/.ssh/config`. If an alias doesn't resolve, that's a local SSH config problem, not something this skill fixes.
- `python3` and standard Unix tools only — no extra dependencies.

## Server registry

Read the registry at `~/.claude/tailnet-servers.json` before acting on `transfer` or
`send`. It is machine-local and deliberately not stored in this repo, since it holds
private tailnet addresses. `servers.example.json` in this skill's directory shows the
schema.

Per server it holds: `ip`, `ssh_alias`, `user`, optional `default_dests` (named shortcut
paths), and free-text `notes`.

If the registry file does not exist, say so and offer to create it from
`servers.example.json` rather than guessing addresses. If Hunter names a server or IP
that is not in the registry, ask him for the SSH alias rather than guessing one.

## Process

### Verb: transfer `<path>` `<server>`

Push a local file or directory to a server with `rsync` over the SSH alias. This is judgment-heavy (picking the destination), so there's no script — reason through it and confirm with Hunter before running anything destructive.

1. Resolve `<server>` to its `ssh_alias` and `user` from the registry.
2. Pick the destination directory by what's being transferred, using that server's `default_dests` as a first guess:
   - Content under `~/Desktop/School/...` -> `<dest.school>/<course-name>/`
   - Content under `~/Code/...` -> `<dest.code>/`
   - Content under `~/Desktop/BrewMint/...` -> `<dest.brewmint>/`
   - Anything else, or a server with no matching default -> ask Hunter for the destination path instead of guessing.
3. Build the command:
   ```bash
   rsync -avz "<local-path>" "<user>@<ssh_alias>:<dest-path>"
   ```
   Add a trailing `/` on the source when copying a directory's *contents* rather than the directory itself — pick deliberately, don't default blindly.
4. **Echo the exact command before running it.** This is a real write to a remote disk; Hunter should see precisely what will run.
5. Report the rsync summary (files transferred, sizes) when it finishes. A non-zero exit means something's wrong (bad path, dead host, permissions) — surface rsync's own error rather than retrying blind.

### Verb: serve `<file-or-dir>`

Run `scripts/serve.sh <file-or-dir>`. It handles everything deterministic:

```bash
bash scripts/serve.sh ~/Desktop/some-notes.pdf
```

What it does:
- Gets this Mac's tailscale IP (`tailscale ip -4`); falls back to `127.0.0.1` and prints a note if tailscale is unreachable.
- If given a directory, serves that directory. If given a file, serves its parent directory and points the URL at the file, so `serve.sh ~/notes.pdf` yields `http://<ip>:<port>/notes.pdf`, not a listing.
- Picks the first free port starting at 8080, starts `python3 -m http.server` bound to that IP:port in the background, and confirms it's actually alive before reporting success.
- Records `{pid, port, path, started, url}` in `state/served.json` (created on first use) so `stop` can find it later. Multiple `serve` calls stack up as separate entries — nothing here auto-stops a prior server.
- Prints the full URL.

Relay the printed URL to Hunter as-is — that's what he opens on his phone/iPad. If the fallback note appears, say plainly that it only works from this Mac, not from other devices, and ask if he wants to fix tailscale first.

### Verb: stop

Run `scripts/stop.sh` with no arguments:

```bash
bash scripts/stop.sh
```

What it does:
- Reads `state/served.json`, kills every PID still alive, and reports each as stopped or already-dead.
- Clears `state/served.json` to `[]` regardless of what it found, so state never drifts from reality.
- Separately scans for orphaned HTTP-serving processes this skill didn't start (bare `python3 -m http.server`, `npx serve`, etc. launched by hand) and lists them with a `kill <pid>` hint. It does not kill these automatically — they might not be this skill's to kill.

Relay the output directly. If orphans show up, ask Hunter whether to kill them rather than doing it silently.

### Verb: send `<file>` `<device>`

One-shot file push via Tailscale's Taildrop — not a Tailnet skill script, just a CLI passthrough:

```bash
tailscale file cp <file> <device>:
```

`<device>` is a tailnet device name (e.g. `brews-iphone`), not an IP — Taildrop resolves by device name. If Hunter isn't sure of the exact name, run `tailscale status` first and match against the device list (e.g. `brews-iphone`, `brews-ipad`) rather than guessing. The trailing colon after the device name is required syntax for `file cp`.

This is different from `serve`: `send` pushes the file directly into the target device's Taildrop inbox (no browser step, no port, no cleanup needed); `serve` is for browsing something in place from a phone's browser.

## Output

- `transfer`: the exact rsync command run, then its summary output or error.
- `serve`: the URL (plus a note if it fell back to `127.0.0.1`).
- `stop`: per-PID stopped/already-dead lines, plus any orphan warnings.
- `send`: confirm the Taildrop push succeeded (or relay `tailscale`'s error, e.g. an unrecognized device name).
