# Spec staleness purge — audit contract (Phase 1: REGISTER ONLY)

You are auditing canonical spec docs in `c:\Users\Bean\Projects\small-giants-wp\.claude\specs\`.

## The problem you are looking for

When a past agent found a statement in a spec that had been overruled, it usually did NOT
delete the statement. It left the wrong text in place and bolted a note onto it — a
strikethrough, a `⚠ CORRECTED 2026-08-17`, a `*(Superseded, kept for the record only — do
not act on it: "…")*`. Your job is to find every such site and propose the clean replacement.

## PHASE 1 IS READ-ONLY ON SPECS

**You MUST NOT edit, rewrite, or touch any file in `.claude/specs/`.** You write exactly ONE
file: your own register (path given in your dispatch). Nothing else. No git commands that
change state. No cleanup of other agents' files.

## Detection vocabulary — run all four passes

1. **Supersession:** `superseded`, `deprecated`, `no longer`, `~~`, `OUTDATED`, `STALE`, `was WRONG`, `corrected 20xx`, `RETIRED`, `historical`, `obsolete`, `replaced by`, `amended`, `kept for the record`, `do not act on`
2. **Correction/rejection:** `correction`, `corrects`, `rejected`, `overruled`, `rescinded`, `revoked`, `reverted`, `withdrawn`, `invalidated`, `misleading`, `false as written`, `mis-stated`, `mis-cited`, `phantom`, `fossil`, `left in place`, `re-litigate`, `walked back`, `backed out`
3. **Abandonment (low precision, expect many false hits):** `cancelled`, `abandoned`, `dropped`, `scrapped`, `shelved`, `MOOT`, `defunct`, `nullified`, `voided`, `purged`, `struck from`, `no longer stands`, `expired`
4. **Design gates / option menus:** `Option A`-`Option D`, `chosen over`, `picked over`, `in favour of`, `considered and rejected`, `rejected alternative`, `(B, rejected)`, `Options:`, `Verdict:`, `Selected:`, `design gate`

Use word boundaries (`\b`). A substring is not a word match — a naive `moot` pattern matches
`smooth`, and `void` matches `avoid`.

Files are large. Use `grep -n -C 6`, not full reads. Never read a spec >1000 lines in full.

## THE DISCRIMINATOR — apply to every hit before anything else

The vocabulary alone CANNOT decide. It catches the rot *and* it catches guard rails that are
already stated correctly. Deleting the latter is the exact damage this work exists to prevent.

> **A site is IN SCOPE only if the overruled text is still physically present next to the
> note.** A note that states a rule *without* dragging the dead text along with it is a
> guard rail — mark it EXCLUDE, no matter how many trigger words it contains.

Two-part test per hit:
1. Is there dead text here (struck, quoted-to-refute, or a stale present-tense claim)? If no → **EXCLUDE**.
2. Does the note carry a rule that would be lost if the dead text went? Yes → **CONDENSE** (K-rule). No → **CUT** (C-rule).

**Extra clause for design gates / option menus (K6):** here the test is LENGTH, because the
dead text is a losing option, not a false statement. A one-line rejection is already a guard
rail → EXCLUDE. A retained multi-paragraph weighing of A/B/C where one won is rot → condense
to the resolution plus one line per rejected option. The REASON for rejection always
survives; the deliberation does not.

## CUT rules — delete, no replacement needed

- **C1** Cosmetic `~~` on a COMPLETED (not wrong) item — `~~P1 shipped~~ **SHIPPED** (D210)`. Remove the `~~`, keep the text.
- **C2** Struck old value immediately followed by the new one — `~~9~~ **39**`. Keep the new value only.
- **C3** Struck TODO/gap + `RESOLVED (date)`. Rewrite as one present-tense statement of what is true.
- **C4** Ghost `#` comment for a deleted directory inside an ASCII file tree. Delete the line.
- **C5** Agent self-historiography — "this line previously said…", "the citation was stale for six days", "corrected 2026-08-17 by the completion audit". Keep the forward rule, delete the narration of the edit.
- **C6** Measurement correction trail — `65 (measured 2026-08-19, survey-control-mounts.py; superseded — was quoted as 64)`. Keep the number AND the measuring command; drop "superseded — was quoted as N".

## CONDENSE rules — one live line survives, rest deleted

- **K1** Rejected approach + why. One imperative line naming the rule AND its failure mode.
- **K2** Meta-lesson about method bolted to the end of a correction. Keep as one line — these are the highest-value sentences in the corpus and the easiest to lose, because they sit at the END of a long correction whose factual head is now redundant.
- **K3** Retraction with an off-file mirror (CC memory, decisions.md). One line + KEEP the mirror pointer.
- **K4** Same fact restated N times in one file. Keep one canonical statement, delete the rest.
- **K5** Tombstone section — a whole `### N. Block (RETIRED)` section kept as a redirect. Collapse to one row in a single per-spec tombstone table.
- **K6** Design gate / option menu with losing options retained at full length. Keep the resolution + one line per rejected option.

## ESCALATE — do NOT propose an edit

If resolving the site needs the CODE rather than the prose — a correction that was itself
corrected, two present-tense statements that contradict each other, a claim whose own
addendum refutes it — mark it `ESCALATE`. Give both candidate truths and the command that
would settle it. Do NOT guess which layer is current. An agent that condenses these picks
the wrong layer; that is why they are quarantined.

## EXCLUDE — never propose touching these

- `README.md`'s `## DEAD — never cite` roster, its archived/DELETED index rows, and its status-tag enum. That is the roster doing its job.
- Literal live uses of the words *stale* / *deprecated* — `deprecated.js` as a real filename, FR-33-12's fail-closed-on-stale-snapshot rule, "stale cache = double bookings", the `sgs-theme/` deprecated-namespace naming rule.
- Frontmatter provenance metadata (`absorbs:`, `supersedes_notes:`).
- External legal citations ("Price Marking Order 2004 (amended 2025)").
- Correctly-stated guard rails per the discriminator — including Bean's own recorded design decisions and any "do not regress" rule.

## Register format — one block per site, and nothing else in the file

```
### <file>:<line>
RULE: C1|C2|C3|C4|C5|C6|K1|K2|K3|K4|K5|K6|ESCALATE|EXCLUDE
BEFORE: <verbatim quoted text — enough to locate it unambiguously>
AFTER:  <exact replacement text, or DELETE, or N/A for EXCLUDE/ESCALATE>
NOTE:   <one line. Required for ESCALATE and for any CONDENSE where a load-bearing rule is being compressed. Omit otherwise.>
```

End your register with:

```
## Counts
IN SCOPE: <n>   (CUT: <n>, CONDENSE: <n>)
ESCALATE: <n>
EXCLUDE:  <n>
```

The EXCLUDE count matters — a suspiciously low one means you skipped the discriminator.
Expect EXCLUDE to be a large share of hits. That is the correct outcome, not under-delivery.

## Return to the dispatcher

A short summary: per-file counts, your 3 most important ESCALATE sites, and anything that
did not fit a rule. Do not paste the whole register back — it is on disk.
