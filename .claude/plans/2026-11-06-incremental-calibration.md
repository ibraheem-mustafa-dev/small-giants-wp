# Incremental calibration

**Goal:** a block that gains a few settings is calibrated in about a minute, without trusting stale measurements. Lower cost per framework wave, for every client.

**Approved by Bean, 2026-11-06:** incremental plus lean editor, a cap of 5 incremental runs in a row, and dead settings always re-measured.

## What the measurements showed

Measured on local-sandybrown with the stage timing line in `calibrate.mjs`:

| Block | Instances | Total | Editor | Page loads | Style reads | State reads |
|---|---|---|---|---|---|---|
| `sgs/button` | 346 | 228 s | 163 s | 6 s | 7 s | 54 s |
| `sgs/form` | 1,309 | 1,351 s | 560 s | 96 s | 554 s | 252 s |

- The bottleneck is how many instances are measured. A style read costs 2 to 3 ms per element on both blocks.
- Parallel reads give nothing: one page of 123 `sgs/form` instances (13,723 elements) took 43.4 s with one tab per width and 42.1 s with two; with four, a page load timed out at 30 s.
- Smaller pages save no read time and add editor work.
- Opening the editor on a full page costs 10.8 s against 8.8 s on an empty one, so the previous page's content is not the cost.

## Design

1. **Fingerprints.** Each setting's fingerprint hashes its database row, its planned instances (markers, preconditions, state target) and the lines of the block's PHP that name it. A full run stores them in the slot map, with a hash of the block's fixture.
2. **What an incremental run measures.** Each variant's default, the paint states, every new or changed setting, every setting that read dead, untested or rejected last time, and a canary sample of unchanged settings chosen from the build hash.
3. **Fallback.** A full measurement runs automatically, with the reason printed, when the block has no fingerprints, its fixture, read list or snapshot changed, this site has no default paint to compare with, the chain has reached 5 runs, any default paint moved, or a canary reads differently from the old map.
4. **Merge.** New rows replace old ones and a removed attribute leaves the map. The existing loss guard judges the merged map.
5. **Lean editor.** The calibration build validates and saves in one child. A block's first page keeps the reload, so a block the editor rejects or tidies is still caught; later pages skip it, because the front-end read is what calibration trusts. The editor still opens once per page.

**Accepted limit:** a change in shared code that repoints one setting, moves no default paint, and misses the canary leaves that row stale until the next full run. The cap of 5 bounds it.

## Result

Measured on local-sandybrown (local-indus was in use by the Indus stream), with 3 settings removed from each map to stand in for 3 gained:

| Block | Before | Full, lean | Incremental |
|---|---|---|---|
| `sgs/button` | 228 s | 115 s | 36 s |
| `sgs/container` | not timed | 354 s | 73 s |
| `sgs/form` | 1,351 s | 1,017 s | 270 s |

`sgs/form` misses the one-minute target: it measures 135 settings on such a run, 101 of them dead, and 64 of the dead are families whose elements its fixture never renders.

## Steps

- [x] Stage timing line in `calibrate.mjs` and `wp-build-page.js`.
- [x] `textAlign` refusal: two markers for a per-device keyword (df9762877).
- [x] Restore the paint-only build and the element budget the 2026-11-02 rewind removed.
- [x] `post-grid` `order`: override entry, private reseed, publish.
- [x] Split `calibrate.mjs` (`lib/calibrate-block.mjs`, `lib/calibrate-pages.mjs`).
- [x] `lib/calibrate-incremental.mjs` with negative-control tests: a changed default paint forces a full run; a removed attribute leaves the map.
- [x] Lean editor flag.
- [x] Prove on a mirror, before and after minutes.
- [x] Spec 48, `scripts/computed-route/README.md`, `.claude/dev-setup.md`; /qc-council.
- [ ] `sgs/form` fixture renders its step counter, review step, saved notice and optional tag, so a gained setting takes about a minute.
- [ ] /handoff.
