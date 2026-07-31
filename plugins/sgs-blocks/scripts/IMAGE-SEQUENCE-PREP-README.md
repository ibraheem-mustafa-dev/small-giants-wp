# Image Sequence Prep — turning a video into a scroll effect

**Who this is for:** anyone setting up an `SGS Image Sequence` block on a client site —
no coding knowledge needed, just following the steps below in order.

## What this makes

The `SGS Image Sequence` block plays a short clip frame-by-frame as a visitor scrolls
down the page — the "product spins as you scroll" or "phone opens as you scroll"
effect you see on high-end product pages. It does this by showing individual images
(frames) very fast, not by playing a video file — so first you need to turn your video
into a folder of numbered pictures. That is what this tool does.

## Before you start — install ffmpeg (one-time, a few minutes)

This tool needs a free program called **ffmpeg** to read your video. It is not part of
the SGS framework — you install it once on your own computer, the same way you might
install any other program.

1. Open a terminal (Command Prompt / PowerShell on Windows, Terminal on Mac).
2. Type ONE of the following, depending on your computer:

   | Your computer | Command to run |
   |---|---|
   | Windows | `winget install ffmpeg` |
   | Mac | `brew install ffmpeg` (needs [Homebrew](https://brew.sh) first) |
   | Linux (Ubuntu/Debian) | `sudo apt install ffmpeg` |

3. Close and reopen your terminal.
4. Check it worked by typing `ffmpeg -version` — you should see a block of text, not
   an error.

If you skip this step, the tool will tell you clearly that ffmpeg is missing and show
you these same instructions again — it will not show you a confusing error message.

## Step 1 — pick your source video

- A short clip (5-15 seconds) works best. Longer clips mean more frames, which means a
  heavier page for your visitors.
- The video should already be roughly the shape you want on screen (widescreen,
  square, portrait, etc.) — this tool crops to fit, it does not add letterboxing.

## Step 2 — run the tool

Open a terminal, navigate to the SGS project folder, and run:

```
python plugins/sgs-blocks/scripts/image-sequence-prep.py ^
    --input my-video.mp4 ^
    --output-dir out/my-sequence ^
    --tier desktop=1920x1080 ^
    --tier tablet=1024x576 ^
    --tier mobile=640x360 ^
    --frames 90
```

(On Mac/Linux, replace the `^` line-continuations with `\`.)

What each part means, in plain English:

| Option | What it means |
|---|---|
| `--input` | Your video file. |
| `--output-dir` | Where the numbered picture frames get saved on your computer. |
| `--tier` | One resolution to export. You can list up to three: `desktop`, `tablet`, `mobile`. Each needs a size like `1920x1080` (width x height in pixels). You do NOT need all three — the block automatically reuses a bigger tier's frames on a smaller device if you skip one. |
| `--frames` | How many still pictures to produce, spread evenly across your whole video. 60-150 is a sensible range for a smooth scroll effect. More frames = smoother motion, but also a heavier page. |

Optional extras:

| Option | What it means | Default |
|---|---|---|
| `--format` | Picture file type: `webp` (smallest, recommended), `jpg`, or `png` | `webp` |
| `--quality` | Compression quality, 1 (smallest file, lowest quality) to 100 (largest file, best quality) | `82` |
| `--base-url` | If you already know the web address your frames will be uploaded to, this pre-fills the manifest for you | (blank) |

## Step 3 — check the output

The tool creates a folder per tier, each full of numbered pictures:

```
out/my-sequence/
  desktop/
    frame_0001.webp
    frame_0002.webp
    ...
  tablet/
    frame_0001.webp
    ...
  mobile/
    frame_0001.webp
    ...
  frames-manifest.json   <- a summary you can open in any text editor
```

It also prints a summary in the terminal telling you the frame count and average file
size per tier, and a ready-to-copy set of values for the next step.

**If a frame folder looks wrong (blurry, wrong crop, too few frames)** — delete the
`out/my-sequence` folder and re-run Step 2 with different `--tier` sizes or `--frames`.
Nothing else on your computer or the website is touched until you upload the frames in
Step 4, so it is completely safe to try again.

## Step 4 — upload the frames

1. In WordPress admin, go to **Media → Add New** (or however your hosting provider
   lets you upload a whole folder — some hosts support drag-and-drop of folders into
   the Media Library, others need you to upload via FTP/File Manager into
   `wp-content/uploads/`).
2. Upload the **whole tier folder** (e.g. everything inside `desktop/`) so all the
   numbered frames end up together in one web-reachable folder.
3. Note the web address (URL) of that folder — e.g.
   `https://yoursite.com/wp-content/uploads/2026/07/my-sequence-desktop/`.

## Step 5 — configure the block

1. In the WordPress block editor, add an **SGS Image Sequence** block.
2. Under **Poster frame**, upload a still image to show visitors before the sequence
   loads (your video's first frame is a good choice — it is also what people without
   JavaScript, or with "reduce motion" turned on, will always see).
3. Under **Frame source**, paste in:
   - **Frames folder URL** — the address from Step 4.
   - **Frame count** — the number shown in the terminal summary (or in
     `frames-manifest.json`).
   - **File type** — whatever you chose in `--format` (default `webp`).
   - **Zero-padding** — leave at `4` unless you changed it.
4. Repeat for **Tablet** and **Mobile** under "Responsive frame sources" if you
   exported those tiers too. If you leave them blank, phones and tablets will simply
   reuse the desktop frames.
5. Save and preview the page — scroll through the block on the live site (this effect
   does not play inside the editor; the editor always shows your poster image).

## A note on file weight

Every frame is a real image a visitor's browser has to download. A 90-frame sequence
at ~30 KB per frame is roughly 2.7 MB total — the block only starts downloading frames
once it is nearly on screen (never on page load), and loads them in small batches, but
it is still real weight. As a rule of thumb:

- Keep sequences to the sections where they genuinely add value (a hero, a product
  reveal) — not every scroll interaction on the page.
- Prefer `webp` over `jpg`/`png` — it is usually 25-35% smaller at the same visual
  quality.
- If the block's editor shows a "loads up to N images" warning and that number feels
  too high, re-run this tool with a lower `--frames` value.

## Troubleshooting

| Problem | What it means | Fix |
|---|---|---|
| "ffmpeg is not installed" | The install step above was skipped or ffmpeg isn't on your PATH | Re-do the install step, then close/reopen your terminal |
| "Input video not found" | The `--input` path is wrong or misspelled | Check the file exists at that exact path |
| "ffmpeg failed for tier '…'" | ffmpeg itself hit a problem (often a corrupted or unusual video file) | The tool prints ffmpeg's own error underneath — usually names the exact issue (unsupported codec, damaged file, etc.) |
| Frames look stretched or cropped oddly | The `--tier` size's aspect ratio is very different from your source video | Pick a `--tier` size closer to your video's own shape, or accept the crop (it centres and fills, like a "cover" background image) |
