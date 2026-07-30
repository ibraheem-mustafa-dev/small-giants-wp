---
doc_type: report
project: small-giants-wp
created: 2026-07-31
spec: 38
wave: C
status: partial — server-side + network evidence banked; browser first-paint captures NOT run
---

# Motion Wave C — deploy verification (sandybrown canary)

**Deployed:** `88c2be1a` + uncommitted Wave C block work, via isolated worktree,
`build-deploy.py --target sandybrown --blocks-only --skip-build`. Fail-closed verify passed
(HTTP 200, markers `wp-block-sgs`, `sgs-`, `wp-content`).

> **What this report does NOT claim.** No browser first-paint capture was run. The
> pre-commit visual-diff gate therefore still legitimately blocks the block commits, and
> nothing here should be read as satisfying it. Everything below is server-render, compiled-asset
> or network evidence. Stated up front because a report that buries its own gap gets cited as
> if it had none.

## 1. Deploy isolation — the D336 hazard

The shared worktree carried a co-active track's uncommitted `includes/lucide-icons.php`. A plain
deploy from the dirty tree would have shipped it to a live site.

| Artefact | md5 |
|---|---|
| `lucide-icons.php` in the isolated worktree (committed) | `3dc287cc19f2d6ea5b3c94db3c3f7ff1` |
| `lucide-icons.php` in the dirty shared tree | `c699c3c20d55693adcd3d10bcc113ae1` |

Different → the co-active edit was **excluded**. Verified before shipping, not after.

**A false positive I recorded against myself.** My first contamination scan compared
`build/blocks/*/render.php` against `git show HEAD:<src>` and reported `button`,
`process-steps` and `quote` as foreign edits. They were not. `git show` emits LF while the
working files are CRLF on Windows, so the md5s differed on line endings alone. Comparing
build against the *current working file* showed byte-identical content for all three, and
`git status` showed them clean. **A checksum comparison across a git/worktree boundary on
Windows is not trustworthy without normalising line endings** — and had I acted on that first
reading I would have "restored" three files that were never wrong.

`node_modules` checked before and after worktree removal: 962 → 962 (the documented
`worktree remove --force` emptying hazard did not recur).

## 2. Block registration — no PHP fatal on registration

REST `/wp/v2/block-types/<block>`, authenticated:

| Block | Result |
|---|---|
| `sgs/before-after` (NET-NEW) | HTTP 200, real attribute payload |
| `sgs/image-sequence` (NET-NEW) | HTTP 200 |
| `sgs/gallery` | HTTP 200 |
| `sgs/responsive-logo` | HTTP 200 |
| `sgs/testimonial-slider` | HTTP 200 |

**Negative control:** `sgs/definitely-not-a-real-block` → **HTTP 404**
(`rest_block_type_invalid`). Without this the 200s would prove nothing — the endpoint could
have been returning 200 for any string. It is not.

**Not covered:** the per-render fatal class (a top-level `function` in a `render.php` fatals on
the SECOND instance on a page) is *not* exercised by registration or by a single-block render.
`sgs/before-after`'s image helper was deliberately written as a closure for exactly this reason,
but the two-instances-on-one-page case remains **unproven** and is owed.

## 3. Conditional loading (FR-38-3) — zero Tier G bytes when unused

Canary homepage, 162,267 bytes:

- `@sgs/gsap*` module references: **0**
- `@sgs/fx-*` module references: **0**
- `@sgs/smooth-scroll`: 2 — expected; that is Wave B's Lenis (Tier H) with the site setting on,
  not GSAP.

**Positive control:** the same HTML carries real SGS blocks (`wp-block-sgs-container`,
`-card-grid`, `-feature-grid`, `-button`, `-cart`, `-business-info`), so the zero is measured on
a genuine SGS page rather than on an error page or a redirect — where zero would have been
meaningless.

## 4. Externals — no effect module bundles its own GSAP

Post-build, per effect module, the bare specifiers actually emitted:

| Module | Imports |
|---|---|
| `fx-draggable` | `@sgs/gsap-draggable`, `@sgs/gsap-inertia`, `@sgs/motion-provider` |
| `fx-draw` | `@sgs/gsap-drawsvg`, `@sgs/gsap-scrolltrigger`, `@sgs/motion-provider` |
| `fx-morph` | `@sgs/gsap-morphsvg`, `@sgs/motion-provider` |
| `fx-motion-path` | `@sgs/gsap-motionpath`, `@sgs/gsap-scrolltrigger`, `@sgs/motion-provider` |
| `fx-scramble` | `@sgs/gsap-scramble`, `@sgs/gsap-scrolltrigger`, `@sgs/motion-provider` |
| `fx-image-sequence` | `@sgs/gsap-scrolltrigger`, `@sgs/motion-provider` |

**Negative control:** zero effect modules contain inlined GSAP core markers. Size corroborates —
`fx-draggable.js` is 553 bytes gzip against a 13,034-byte `gsap-draggable.js`.

This is also what caught **two real defects in the registry**: `fx-draw` and `fx-scramble` both
register ScrollTrigger, which I had not declared. Undeclared, the import map still resolves it,
so nothing breaks — WP simply emits no dependency and no modulepreload and the plugin arrives
late. Corrected against the built output rather than against intent.

## 5. `sgs/before-after` render contract

Server-rendered via `/wp/v2/block-renderer/sgs/before-after` (no page content created):

| Contract | Result |
|---|---|
| Before `<img>` present | YES |
| After `<img>` present | YES |
| Both alt texts carried | YES |
| Native `<input type="range">` (keyboard operable) | YES |
| `--sgs-before-after-position` emitted | YES |
| Reduced-motion rule present | YES |
| Spec 32: zero inline `style="…"` property declarations | **PASS** (0 found) |

**Zero-JS split — verified across two artefacts, because neither alone shows it.** The rendered
HTML contains no `clip-path`; it only sets `--sgs-before-after-position`. The compiled
stylesheet supplies the other half:
`clip-path:inset(0 calc(100% - var( --sgs-before-after-position )) 0 0)`. Server sets the
position, CSS performs the split, so a visitor with JS blocked sees a real comparison. Checking
only the HTML would have read as a failure.

**F3 fix confirmed in the compiled, deployed CSS** — every flagged literal now survives as the
`var()` fallback, so the default appearance is unchanged while client overrides flow through
custom properties:

```
var( --sgs-before-after-divider-colour,#fff )      var( --sgs-before-after-label-colour,#fff )
var( --sgs-before-after-divider-width,3px )        var( --sgs-before-after-label-bg-colour,rgba(0,0,0,.6) )
var( --sgs-before-after-handle-colour,#fff )       var( --sgs-before-after-label-line-height,1.4 )
var( --sgs-before-after-handle-icon-colour,#1e1e1e )
```

## 6. Owed — do not treat this wave as verified

1. **Browser first-paint captures** for `gallery`, `testimonial-slider`, `responsive-logo`,
   `before-after`, `image-sequence`. The pre-commit visual-diff gate requires these and is
   correctly still blocking. `--no-verify` is not the answer: it would also discard gitleaks,
   the wp-* pre-merge gate, cheat-gate, F5 and F6, all of which pass.
2. **Two instances of each new block on one page** — the per-render fatal class.
3. **Each effect's named observable signal** (drag transform follows pointer with momentum
   decay; `stroke-dashoffset` animates; scramble settles to the original string; canvas scrubs).
   None measured in a browser yet.
4. **Editor surface** — deploy-and-open-the-real-editor (D388: two editor-killing crashes have
   shipped past all-green gates here before).
5. **Bean's eye (R-31-13)** — co-authoritative, not yet given.
