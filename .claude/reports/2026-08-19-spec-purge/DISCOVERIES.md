# Discovered during apply — not in any register, handled after the residual gate

Agents were told to finish approved rows and REPORT anything new rather than fix it silently.
This is that list, plus what the dispatcher found by independent check.

## D1 — Spec 02:33 — surviving `deprecated.js` shim claim  [FIXED by dispatcher]
`"...converted to dynamic — save returns null, render.php drives 100% of frontend output,
each with `deprecated.js` shim for backward compat on existing posts."`
The same false claim as E2's six sites, in a wording no pattern caught, inside a dated
"Previous architecture update (2026-05-19)" blockquote. **Never registered at all** — it
slipped both the branch sweep and the coverage gate. The conversion-to-dynamic statement is
still true; only the shim clause was dead. Removed the clause at byte level (line endings
untouched), leaving the sentence intact. This miss is why `residual-check.py` exists.

## D2 — Spec 37:~1736-1737 — reported contradiction  [FALSE ALARM, verified 2026-08-20]
Reported by apply-37-36. "See the ownership + direction note immediately below; that label is
currently ownerless…" now disagrees with the condensed K1 block at ~1739, which states Part 2
is NOT ownerless. This is a SIDE-EFFECT of that row's own edit — the condensed replacement
changed the fact the lead-in was pointing at. Not in the register, correctly left alone.
**NOT a contradiction — I logged the agent's claim without checking it.** Verified by reading
both: the lead-in says Part 2 is "currently ownerless"; the note beneath says "Assigning Part 2
a single named owner is a prerequisite before any Part 2 work starts." Those agree — an owner
still needs assigning, so it is still ownerless. No edit needed, and an edit made on the
agent's report alone would have introduced an error into correct text.

**Lesson: a subagent's claim of a defect needs verifying exactly like its claim of a fix.**
I verified every fix the agents reported and took this defect report at face value.

## D3 — stale `_comment_*` doc-strings in two block.json files  [OPEN, out of scope]
Reported during the Phase-1 audit: `brand-strip/block.json` and `feature-grid/block.json` carry
`_comment_*` strings describing `deprecated.js` migrations that no longer exist as code. Outside
`.claude/specs/`, so outside this task's scope, but the same class of rot and worth a sweep.

## D4 — Spec 31:467 — D256 orphaned by its own collapse  [FIXED by dispatcher]
Reported by apply-31, correctly left alone as out-of-row. Collapsing the five self-superseded
STATUS blocks (D250/D252/D254/D258/D274) into one pointer left a SIXTH block, D256 (2026-07-02),
standing in full — inside the very range the new pointer declares "entirely superseded", and
inside the D243-D274 range that D276 says it supersedes. The pointer contradicted the block
sitting two lines beneath it.

Before removing it I checked its one unique payload — a "remaining desktop-grid gap" for
`min-width:X` cross-device tier drops, recorded nowhere else in parking.md or LEDGER.md. It is
subsumed: the mechanism is specified in-spec under "BOUND — a residual is confined to the DEVICE
TIER its threshold falls inside" (F-ii / `serialise_residual_bands`). Folded D256 into the
pointer by name and added a cross-reference to that section, so a reader looking for the gap
still lands on its answer. Byte-level edit; line endings untouched.

**Lesson for the remaining collapses:** a K5 tombstone-collapse defined by a D-number RANGE must
check every member of that range, not just the ones the register happened to enumerate. The
register listed five; the range contained six.

## D5 — the `deprecation path` cluster  [FIXED]
Found by `residual-check.py`, not by reading. The same dead mechanism as `deprecated.js` in
wording none of the four vocabulary passes targeted: "refactored ... with deprecation paths
preserving existing post content" (02:125), "retained for deprecation back-compat" (02:261),
"InnerBlocks composition + deprecation paths" (11:5, 11:203). E1/E2 removed every
`deprecated.js` mention and left the mechanism described under a different name.

## D6 — `palestine-lives` documented as a live deploy target  [FIXED]
`build-deploy.py` `TARGETS` holds only `sandybrown`. Specs 00-OVERVIEW and 19 documented a
second target — including a copy-pasteable command that would fail and a guard describing a
removed code path. **UNANNOTATED staleness**: nobody bolted a note onto it, so no pattern in
this sweep was aimed at it. It surfaced only because the residual gate flags every surviving
marker no register row explains. This is the class the whole audit was blind to by design.
