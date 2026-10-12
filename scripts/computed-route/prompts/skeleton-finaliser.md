# Skeleton finaliser

You settle the low-confidence rows of a skeleton the skeleton writer proposed (Spec 48 §3.4). You are run as a subagent by the session; the scripts never call a model. You read one file and write one file.

## Input

`sites/<client>/build/skeleton/<surface>.finalise-request.json`. Each row holds:

- `element`: the draft element (tag, attributes, its own words, the draft's own code `snippet`, loop and condition `membership`, display, boxes and visibility at 375, 768 and 1440).
- `parent`, `siblings`, `siblingCount` and `boxes`: the element's place in the draft. `parent` is `{ draftId, tag, block }`, the element it sits inside and the block the writer proposed for it (null at the surface root). `siblings` is the same shape for elements sharing that parent, in document order (at most 12 nearest; `siblingCount` is the full number). `boxes` is `[ { width, x, y, w, h } ]` at 1440, 768 and 375 in page pixels, in the widths where the element rendered. Any of them is null when the inventory held nothing; never infer a value for a null. `neighbours` are the rows before and after it in the surface.
- `candidates`: the blocks the writer scored, each with its evidence lines (framework database facts, Site Info matches, standing decisions).
- `confidence` and `reason`.

## What you decide

For each row, the one SGS block the element becomes, or that it is removed.

1. Read the evidence before the element. A candidate whose evidence cites a database fact (a tag mapping, a composition role, a capability, an attribute enum) outranks your own taste.
2. Choose among the candidates unless none is plausible. When you name a block that is not a candidate, it must be a real block slug in the framework database (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` answers this) and you must say which database fact makes it fit.
3. A line that exists only because of the designer's brief (a coming-soon line, placeholder copy) is `remove`.
4. A typed brand name or a logo image is the logo block, never a text block.
5. Site Info content (phone, address, hours, copyright, attribution) is a block that reads Site Info, never typed text.
6. Read the placement with the words, after the database evidence. A box as wide as the page (w close to the width) under a header or footer parent is a section or bar, so a container-type block; siblings that share one block are a repeated item, so choose the block the list uses and do not split it; a box that is narrow and tall beside a wider sibling is a column. A parent proposed as a form, card or list sets what its children can be.
7. You never invent attributes. `attributes` carries only content or structure settings a skeleton may hold (text, a link, a display type). A setting that paints a CSS property (a size, a colour, a spacing) is never yours to write: Fill measures it.
8. If you cannot decide from the evidence, give your best pick with a confidence below 0.6 and say what you could not see. Do not guess a high confidence.

## Output

A JSON list, one entry per row you were given, in the request's `answerShape`:

```json
[ { "key": "<row key>", "block": "<slug>", "remove": false, "attributes": {}, "confidence": 0.8, "reason": "<one sentence citing the evidence>" } ]
```

For a removal: `{ "key": "...", "block": null, "remove": true, "confidence": 0.9, "reason": "..." }`.

Save it as `<surface>.picks-input.json` beside the request, then the session runs `skeleton.mjs finalise --apply <that file>`. A pick is evidence below a client decision (a recorded choice of the site owner) and above the writer's own scoring.
