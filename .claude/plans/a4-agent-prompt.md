You are checking a list of fix-register items against a measurement file. You only read. Do not edit, create or delete any file in the repository, and do not run the browser, the network or git.

## Your input

One JSON bundle file (path given with this prompt). It holds:
- `group`: the name of your slice of the register.
- `items`: each `{ id, section, covers, surfaces, cells }`. `cells` are the register row's text (what is wrong, the fix, the type, the status the register already records). `surfaces` are the measured pages the item sits on; `null` in that list means no page covers it. `covers` is only filled for site-wide items (S1 to S12): the register items they fix.
- `surfaces`: for each surface, `{ measured: true, report, issues, refs }` or `{ measured: false }`. `refs` are the blocks the walker measured on that page (each a `cr-ref-<page>-<n>` class).
- `rows`: the open differences the sweep found on those surfaces, each `{ surface, ref, path, block, property, widths, state, kind, class, reason, report }`.

## What to do

Give every item exactly one status. Read the item's text, decide which element and property it names, then look in `rows` for a row on that element (match `ref` or `block` + `path`) and that property.

## The five statuses (the decided rules, verbatim)

- **still open:** a `sweep.json` row on the item's surface touches the element and property the item names.
- **clean on the walker:** a paired ref covers the item's element and no row touches it. A site-wide item (S1 to S12) is clean only when every surface in its Covers column is clean; one unmeasured surface makes it **partly measured**.
- **not walker-measurable:** the item is behaviour, motion timing, keyboard, a11y, content or Site Info. The agent decides; the main thread checks 10% of them (at least 5), plus every item marked clean or closed earlier without a cited report path.
- **closed earlier:** the register already records it closed with evidence, and the sweep agrees. If the sweep disagrees, it is **still open** (a regression), flagged in the handoff.
- **partly measured:** only some of the surfaces the item touches have a sweep report.

"Not walker-measurable" is for behaviour (clicks, open and close), motion timing, keyboard, a11y, content and Site Info items. The walker only measures painted style on a page, so anything it cannot see is that status, not "clean".

## What to return

Only a JSON array, nothing around it, one entry per item, using the item's `id` exactly as written:

```
[ { "id": "126, 137", "status": "clean on the walker", "evidence": { "report": "<a surface's report path from the bundle>", "ref": "<the ref that covers the item>", "property": "<optional>" } },
  { "id": "N9", "status": "not walker-measurable", "evidence": { "reason": "<one plain sentence>" } } ]
```

Rules for the evidence:
- `clean on the walker` needs `report` (copied from the bundle's `surfaces`) and `ref`. The `ref` must be one of that surface's `refs` (the measured block holding the item's element), and no row in `rows` may have that `ref` (and that `property`, if you give one). If you cannot name such a ref, the item is not clean: use `not walker-measurable` or `partly measured` with a reason.
- Every other status needs a `reason` (one sentence), or the `report` and `ref` of the row you relied on.
- Never guess. If you cannot tell, say `partly measured` or `not walker-measurable` and say why.
- The main thread re-checks every clean claim against the sweep file and rejects a set that has a missing item, a duplicate, an unknown status or a clean claim a row contradicts.
