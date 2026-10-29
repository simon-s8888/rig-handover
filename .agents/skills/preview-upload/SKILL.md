---
name: preview-upload
description: Put one rig page up as a public HTML preview on Vercel, upload over it, and take it down again (ADR 0003). Use for a plan's "Preview for review" and "Clean up" steps.
---

# preview-upload

One HTML file, one public HTTPS link, uploaded over in place and removable with one command.
Needs `bunx` (or a global `vercel` ≥ 47.2.2; older CLIs are refused by Vercel's API) and a
signed-in Vercel account (`bunx vercel@latest whoami`). Ask the human before every upload and
every removal: it is public.

## Save the page

Outside the repo (previews are never committed, ADR 0003), in a folder named after the project:

```sh
pnpm start &                                   # with LANE_MARKER set, or unset for the clean copy
mkdir -p <dir>/rig-<plan>-preview
curl -sf localhost:8787/<path> -o <dir>/rig-<plan>-preview/index.html
grep -c '<script' <dir>/rig-<plan>-preview/index.html   # 0: self-contained (ADR 0001)
```

## Put it up / upload over it

```sh
cd <dir>/rig-<plan>-preview && bunx vercel@latest deploy --prod --yes
```

The first run creates and links the project (`.vercel/`). The public link is the production
alias `https://rig-<plan>-preview.vercel.app`; the per-deploy `…-<hash>-<team>.vercel.app` URL
the CLI prints is behind Vercel's deployment protection. Running the same command again
uploads over the alias. Check it: `curl -s https://rig-<plan>-preview.vercel.app | grep marker`.

## Remove old copies

Every deploy stays on its own URL. After uploading over the link, remove the older ones so no
copy keeps the marker:

```sh
bunx vercel@latest ls rig-<plan>-preview          # newest first
bunx vercel@latest remove <old-deploy-url> --yes
```

## Take it down

```sh
bunx vercel@latest remove rig-<plan>-preview --yes   # the project and every deploy in it
```
