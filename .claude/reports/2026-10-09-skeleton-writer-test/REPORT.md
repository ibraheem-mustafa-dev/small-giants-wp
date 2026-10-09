# Skeleton writer and route-accuracy tests, 9 October 2026

**Who this is for:** Bean. Plain English first; technical names in brackets.

## 1. The short version

- **The draft's own code can tell us exactly which part of the design each block copies.** The design tool stamps every
  element with a permanent ID (`data-dc-tpl`). We never used it. Tested on the footer: 33 of 33 blocks linked to exactly
  the right draft element.
- **A skeleton can be written from the draft's code**, and the existing fill-in step (Fill) fills it end to end. Every
  word came through; style settings scored lower than a hand-written skeleton, because of three fixable Fill gaps.
- **Trying a setting in the browser before saving it works.** It reproduced the real rebuild of the home cards to the
  pixel, in under a second, on about 78 of 98 blocks.
- **Block choice is the remaining judgement.** The automatic step (generator) matched your recorded choices on 8 of 13
  uncertain rows; with the AI finaliser, 10 of 13. Most of the rest are your preferences, which a saved decision record
  teaches once.

## 2. What was tested, and the evidence

| Test | Result | Proof |
|---|---|---|
| Answer sheet: a fixed set of known rows to score every change against | 100 rows: 47 false alarms, 29 wrong writes, 24 real problems that must stay open | Every row found in the run data; 9 spot-checked by hand |
| Footer element list (inventory) | 51 elements, each with its ID, code, sizes at three widths and a screenshot | My own recount: 52 elements, 51 stamped (the 52nd is the inserted phone number) |
| Try before write, home cards | Simulated padding narrowed the card 291 to 247px at 375, 271.5 to 211.5 at 768, 273.25 to 213.25 at 1440: identical to the real rebuild; removing it restored every width | Re-run by me |
| Skeleton generator, footer | 33 blocks; all links exact; passes the skeleton rules | Links re-checked by me: 33 of 33 |
| Block choice vs your recorded decisions (13 uncertain rows) | Generator 8, generator + finaliser 10 | Scored against the fix register and ledger |
| Fill on the generated skeleton | Ran clean in 47s. Of 105 settings on the 14 shared blocks: 49% exact, about 78% look the same. 17 of 17 words. 0 of 10 page links, because every draft link is `#` | Fill's own report, re-read |

**How it compared with the first footer (24 September, written by an AI from the draft):** the same structure. The first
one chose better blocks for headings and the footer wrappers; the generator avoided the banned list block and is the only
one with exact links. With the finaliser, the generator is ahead.

## 3. What the tests found that needs fixing

| Item | Where it goes |
|---|---|
| Fill puts the social icons' border, background and size on each icon instead of the row's shared settings | Fill fix, next build |
| Fill reads an icon's 40px box as its 18px icon size | Fill fix, next build |
| Fill drops five business-info settings without reporting them (map link, short hours layout and others) | Fill fix, next build |
| The generator misses the footer's own wrapper blocks, a run of links as one link list, and a typed brand name as the logo | Generator rules, next build |
| The local copy's home page still carries this morning's wrong card padding | Rebuild home on the local copy before the next measuring run |
| 36 PHPUnit failures on main in the post grid and Google Reviews tests, not caused by today's work (likely the call-to-action block removal, unproven) | Needs an owner |

## 4. Your decisions today

- The footer and header use the real logo image, never typed text (register N47). The draft now shows the image too.
- The "Glasses — arriving soon" line leaves the footer's Shop list (N48).
- "Visit or call" becomes one link list that reads Site Info (N49). Built and committed (`58ccb5621`).
- Rule for every client: a typed brand name in a draft becomes the logo block; anything that exists only because of the
  designer's brief (coming-soon lines) is flagged for removal.

## 5. Recommended build order

1. **The answer sheet becomes a permanent test** that every route change is scored against.
2. **The skeleton writer** (generator, finaliser, review table, saved decisions), with Fill reading the exact IDs.
3. **Exact ID matching in the comparison step**, so the tool stops comparing different elements.
4. **The "does this even show?" check** (change a value in the browser; if nothing moves, it is not a real difference).
5. **Try before write**, replacing today's guess-rebuild-undo rounds where a block supports it.

Each step replaces an existing rule of thumb rather than adding to it, and each is scored against the answer sheet.

## 6. Where the evidence lives

`evidence/` in this folder: the answer sheet (`fixtures.json`), the generator, inventory and review scripts, the
generated skeleton and its comparison, the finaliser picks, Fill's report and scorer, the trial and draft-swap scripts. The council record: `.claude/reports/2026-10-09-route-accuracy-council/COUNCIL.md`.
