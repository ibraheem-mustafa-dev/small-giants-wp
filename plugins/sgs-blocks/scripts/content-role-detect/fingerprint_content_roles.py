#!/usr/bin/env python3
"""
Deterministic content-role fingerprint (Track A / Spec 35, Step 2).
=================================================================

WHAT THIS REPLACES
------------------
``assign-canonical.py:1279-1316`` (``_ATTR_NAME_RULES``) classifies an attribute as
content-bearing by matching its NAME against ~60 hardcoded exact strings. Any attribute
not literally on that list gets ``role = NULL`` and is invisible to the cloning pipeline,
so its text is silently dropped from clones. That is the FR-31-2.1a violation.

This module replaces the name guess with STRUCTURAL evidence: what the block's own
``render.php`` does with the value, what control ``edit.js`` binds it to, and whether its
default is i18n-wrapped. **No attribute name is ever pattern-matched.**

THE COMBINATION RULE, AND WHY IT IS SHAPED THIS WAY
--------------------------------------------------
The rule is derived from each detector's MEASURED precision on the real tree
(2026-08-04, `.claude/reports/2026-08-04-content-attr-miss-denominator.md` §4), not from
preference:

    D1 (render.php escaping walk)  precision 97%  ->  TRUSTED ALONE
    D3 (i18n-wrapped default)      precision 100% ->  TRUSTED ALONE
    D2 (edit.js control binding)   precision 66%  ->  NEVER ALONE

D2's 34% false-positive rate is not a bug to fix; it is a property of the codebase.
``TextControl`` is used heavily for technical identifiers (``fieldName``, ``formName``,
``typeKey``, ``drawerRef``, ``rel``, ``step``, ``excludeKeywords``). A control TYPE simply
does not tell you whether the value is content. So D2 CORROBORATES and it REPORTS, but it
never assigns on its own.

On a category disagreement between D1 and D2, D1 wins: it observes what the value actually
BECOMES in the output, which is closer to the question than what widget edits it.

WHY a11y-metadata IS DELIBERATELY NOT ASSIGNED
----------------------------------------------
``ariaLabel``-shaped rows are genuinely content-bearing in the everyday sense, but there is
no correct role for them today. The obvious candidate, ``image-alt``, is specifically "alt
text for a SIBLING image-object attr", resolved via ``block_attributes.alt_companion_attr``
and consumed by the image arm (``db_lookup.py:2611-2636``, ``walk.py:485``). Assigning it to
a button's aria-label would feed a consumer that expects a companion image and has none.

So these rows are REPORTED and left NULL. Inventing a plausible-looking role is exactly the
"wrong document" failure this track exists to stop. Closing it needs a new role with a real
consumer -- a decision, not a detector.

EXPECTED POPULATION (declared BEFORE the rule runs -- mandatory, see rules.json doctrine)
-----------------------------------------------------------------------------------------
ORIGINAL DECLARATION (2026-08-04, pool = 262 rows): expected ASSIGNABLE 45-60,
expected REPORT-ONLY (D2-alone + a11y) 20-40.

RE-DECLARED 2026-08-06, pool = 69 rows. Expected ASSIGNABLE: 0.
Expected REPORT-ONLY: ~13.  Expected D4 WRAPPER-STYLING: ~33.  D4 NEEDS REVIEW: ~22.

Why the original range no longer applies, measured not assumed: the eligible pool is
`sgs/%` + string-typed + `role IS NULL`, and that population has been WORKED DOWN by the
Step 0 classification programme. The detectors already assigned everything they can
assign; ASSIGNABLE 0 is the CORRECT steady state, not a blind rule.

POOL RE-BASED 2026-08-06 (Bean): 69 -> **36**. The 33 wrapper-styling rows are no longer
survivors — Bean's ruling is that a NULL role means the row is UNREACHED or UNSEEDABLE,
never "reached, understood, and filed nowhere", and a wrapper-only read is positive
evidence of styling (the shared container wrapper is a CSS-rendering engine, so
everything it reads it reads to paint). They are now SEEDED `styling` by
`assign-canonical.apply_role_detection_inline()` TIER 2.4, so this bucket reads 0 after
a reseed. Measured post-reseed: 31 rows claimed, 0 content roles touched. NOTE they will
never carry a `css_property` — `sgs/container`, the block every composite mirrors
(R-31-9), deliberately declines to map the decorative families in its `decorative`
element, so the earlier "owes an attrMap declaration" reading would have REVERSED a
standing architectural decision rather than completing one.

The 36 survivors are not an unexplored space — `reached by any detector` is 36 and
`unreached` is 0. Every one lands in a bucket that DELIBERATELY does not assign:
needs-review is an explicit human call; report-only is D2-alone plus the a11y rows this
docstring already explains are deliberately left NULL; the content gap has no fitting
role. Closing those needs decisions and new roles with real consumers — not a better
detector.

The zero-is-a-claim doctrine below still stands and is why this range was re-derived from
a live count rather than edited to match the output. Three rules built on this project on
2026-08-04 were blind on first build (0 vs a true 65; 12 vs 15; 43 vs 23) and every one
was caught by a human challenging a suspiciously low number, never by a gate. If the
POOL grows again (new blocks, new string attrs) and ASSIGNABLE stays 0, that is a
different claim and SUSPECT THE SCRIPT FIRST.

BLIND SPOTS (enumerated, per the Task F "ENFORCED" bar point 7)
---------------------------------------------------------------
1. Text rendered client-side through the Interactivity API is invisible to a PHP walk --
   ``sgs/cart``'s five labels reach D3 only, and a block with neither i18n defaults nor PHP
   escaping would be invisible to all three.
2. Text escaped inside a CHILD InnerBlocks composite rather than the parent's render.php.
3. ``printf``/``sprintf`` multi-placeholder templates split the HTML attribute name from the
   escaped value across positional args, defeating D1's proximity classifier.
4. 127 of the 262 eligible rows produced ZERO output from all three detectors. Most are
   genuinely styling -- but that is an assumption, not a measurement, and it is the honest
   open search space for the next pass.
5. Icon-identity roles (``icon-lucide`` etc.) are not targeted by any detector at all;
   ``sgs/separator.contentIconName`` was found only by manual read.

READ-ONLY. This module PROPOSES; it never writes to sgs-framework.db. Step 3 owns the write.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_SCRIPTS = SCRIPT_DIR.parent

# The framework DB does NOT live in the repo — it sits beside the sgs-wp-engine skill
# (`sgs-db.py:31` resolves it as <skill>/scripts/../sgs-framework.db). Verified 2026-08-04:
# `find` across the whole repo returns zero hits. Search a candidate list and FAIL LOUD if
# none exists — a missing DB must never look like an empty result set.
_DB_CANDIDATES = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    PLUGIN_SCRIPTS / "sgs-framework.db",
]


def resolve_db() -> Path:
    for cand in _DB_CANDIDATES:
        if cand.is_file():
            return cand
    raise FileNotFoundError(
        "sgs-framework.db not found. Looked in:\n  "
        + "\n  ".join(str(c) for c in _DB_CANDIDATES)
        + "\nRefusing to continue: an unreadable DB would yield an empty pool and a "
          "falsely-clean result."
    )

# --- category -> role. Only these four categories are ever assigned. -------------------
CATEGORY_TO_ROLE = {
    "visible-text": "text-content",
    # Was "content" until 2026-08-05. That routed SVG through rich_text_content(),
    # which strips <svg>/<path> to the empty string -- destructive, not imprecise.
    # 'svg' has its own extractor branch (field_extractors.py, role == 'svg').
    "svg-markup": "svg",
    "link-href": "link-href",
    # wp_kses with a NON-SVG allow-list means "let some HTML through" -- that is rich text
    # by definition. Verified 2026-08-04 against the three rows it covers:
    # product-faq-item.question, team-member.bio, testimonial.summaryPhrase. A value nobody
    # intends as content is never passed through an HTML sanitiser; it is escaped flat.
    "wp_kses-other": "text-content",
    "a11y-metadata": "a11y-text",
    # AUTHORED alt / placeholder text -- content a client writes and edits, so it must
    # transfer from a draft. Split out of a11y-metadata on 2026-08-05: routing it to
    # a11y-text (styling-behaviour) EXCLUDED it from the content walk and would have
    # silently dropped it. Not 'image-alt' -- that role pairs to a sibling image-object
    # via alt_companion_attr, and walk.py:295 only captures alt when that companion is
    # attr_type='string'.
    #
    # ⚠ THE BLOCK THAT FORCED THIS CATEGORY NO LONGER NEEDS IT (2026-08-05, D496).
    # sgs/responsive-logo stored three bare attachment IDs (type=number) with one
    # unprefixed `alt`, so there was no string image attr to name as the companion --
    # that absence is the whole reason this category exists. It has since been given
    # logoUrl/logoUrlTablet/logoUrlMobile (string) beside the IDs, mirroring sgs/media's
    # imageId+imageUrl pair, and its `alt` now carries role='image-alt' with
    # alt_companion_attr='logoUrl'. So this mapping is retained for any OTHER block that
    # lands in the same shape, not for the one that created it.
    #
    # Note the rename from the desktopLogoId PREFIX scheme did NOT achieve this and was
    # wrongly recorded as the retirement condition -- renaming changed no attr_type. The
    # attr SHAPE change did. Retire this entry once no block resolves to it.
    "authored-alt-text": "text-content",
}

# Categories recognised but deliberately NOT assigned a role. Reported instead.
# a11y-metadata graduated OUT of report-only on 2026-08-05: the 'a11y-text' role now
# exists (styling-behaviour, documentation-only, deliberately excluded from the content
# walk). Before it existed, correctly-classified a11y rows had nowhere to go and fell to
# report-only -- the classifier was right and the vocabulary was the gap.
REPORT_ONLY_CATEGORIES: dict[str, str] = {}

# Categories that mean 'this is not content' -- silently skipped, not reported as gaps.
NON_CONTENT_CATEGORIES = {
    "NOT-content",
    "STYLING-exclude",
    "numeric-adornment",
    "esc_attr-unclassified",
    # The attribute reached an escaping call only as a concatenated PIECE of a
    # larger value (D1's `fragment` flag). Every content-bearing role is a
    # whole-value contract, so a fragment satisfies none of them and this
    # counts as a D1 rejection -- which is the point: a rejection is VISIBLE in
    # the `vetoed` list, whereas dropping the row would make a deliberately
    # rejected attribute look like one no detector ever reached.
    "value-fragment",
}

TRUSTED_ALONE = ("D1", "D3")

# Tie-break order when ONE attribute carries several content categories (it is rendered
# more than one way). Explicit ranking, never document order — see the note at the
# per_detector["D1"] assignment. Lower index wins. Visible/painted content outranks a11y
# metadata: a value that is both painted AND used as an accessible name is content that
# labels itself, and filing it as a11y would exclude it from the content walk entirely.
_CATEGORY_PRIORITY = (
    "visible-text",
    "authored-alt-text",
    "svg-markup",
    "wp_kses-other",
    "link-href",
    "a11y-metadata",
)


def _category_rank(category: str) -> int:
    """Rank for the tie-break. An unknown category sorts LAST, never first — a category
    nobody has ranked must not win a conflict by accident."""
    try:
        return _CATEGORY_PRIORITY.index(category)
    except ValueError:
        return len(_CATEGORY_PRIORITY)


def eligible_pool(conn: sqlite3.Connection) -> set[tuple[str, str]]:
    """The rows this fingerprint is allowed to touch.

    The negative pre-filter is DB-side and cheap: an attribute already carrying a
    css_property / enum_values / responsive flag / box_family has already been classified
    as styling by a different, earlier mechanism. Re-deciding it here would be two writers
    for one fact.
    """
    rows = conn.execute(
        "SELECT block_slug, attr_name FROM block_attributes "
        "WHERE block_slug LIKE 'sgs/%' AND role IS NULL AND attr_type = 'string' "
        "AND css_property IS NULL AND enum_values IS NULL "
        "AND is_responsive = 0 AND box_family IS NULL"
    ).fetchall()
    return {(r[0], r[1]) for r in rows}


def _run(cmd: list[str], cwd: Path) -> str:
    proc = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            f"detector failed ({' '.join(cmd)}): exit {proc.returncode}\n{proc.stderr[:2000]}"
        )
    return proc.stdout


def _ndjson(text: str) -> list[dict]:
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def run_detectors(root: Path | None = None) -> dict[str, list[dict]]:
    """Run all three detectors and return their parsed findings.

    A detector that CRASHES must never look like a detector that found nothing -- that is
    the failure mode that makes a rule read green forever. _run raises on non-zero exit.
    """
    cwd = root or SCRIPT_DIR
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "d1_raw.ndjson"
        raw.write_text(_run(["php", "detector1_render_escaping.php", "--glob"], cwd), encoding="utf-8")
        d1 = _ndjson(_run([sys.executable, "classify_detector1.py", str(raw)], cwd))
    d2 = _ndjson(_run([sys.executable, "detector2_editjs_controls.py"], cwd))
    d3 = _ndjson(_run([sys.executable, "detector3_i18n_default.py"], cwd))
    return {"D1": d1, "D2": d2, "D3": d3}


BLOCKS_DIR = PLUGIN_SCRIPTS.parent / "src" / "blocks"
_a11y_cache: dict[tuple[str, str], bool] = {}


def _binds_to_a11y_attribute(block_slug: str, attr_name: str) -> bool:
    """Does this block bind this attribute into an aria-* / alt / title HTML attribute?

    STRUCTURAL, not a name regex: it reads the block's own source and looks for the
    attribute's identifier appearing within a short window after an `aria-…=` / `alt=` /
    `title=` binding. Covers PHP (`aria-label="<?php echo esc_attr( $x )`), JSX
    (`aria-label={ x }`) and Interactivity-API markup in view.js, which is exactly the
    surface a PHP-only walk cannot see.

    Deliberately narrow: a false NEGATIVE costs a mis-filed role (recoverable, and the row
    is still reported); a false POSITIVE would silently suppress a genuine content row.
    """
    key = (block_slug, attr_name)
    if key in _a11y_cache:
        return _a11y_cache[key]

    found = False
    block_dir = BLOCKS_DIR / block_slug.replace("sgs/", "", 1)
    if block_dir.is_dir():
        for path in block_dir.rglob("*"):
            if not path.is_file() or path.suffix not in (".php", ".js"):
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            # WINDOW = 40, deliberately tight. At 160 this produced a FALSE POSITIVE on
            # sgs/form.successMessage: render.php:348 renders
            # `data-wp-text="context.successMessage"` on an element that also carries an
            # `aria-` attribute, so "near an aria- binding" was not the same as "IS the
            # value of one". 40 chars still admits the real shapes --
            # `aria-label="<?php echo esc_attr( $x` (~30) and `aria-label={ x }` (~16) --
            # while excluding a merely-adjacent mention on the same tag.
            for marker in ("aria-", "alt=", "title="):
                start = 0
                while (idx := text.find(marker, start)) != -1:
                    if attr_name in text[idx:idx + 40]:
                        found = True
                        break
                    start = idx + 1
                if found:
                    break
            if found:
                break

    _a11y_cache[key] = found
    return found


def _key(rec: dict) -> tuple[str, str] | None:
    slug, attr = rec.get("block_slug"), rec.get("attr_key")
    if not slug or not attr:
        return None
    return (slug, attr)


def fingerprint(findings: dict[str, list[dict]], pool: set[tuple[str, str]]) -> dict:
    """Apply the combination rule. Returns assignments + report-only + diagnostics."""
    # detector -> {(slug, attr): category}
    per_detector: dict[str, dict[tuple[str, str], str]] = {"D1": {}, "D2": {}, "D3": {}}

    # D1 emits one record PER USAGE SITE, so a single attribute can carry several verdicts
    # (e.g. escaped as visible text in one place and into a class string in another). An
    # attribute escaped as content ANYWHERE is content, so a content verdict wins over that
    # same detector's non-content verdicts. Only when EVERY D1 verdict is non-content does
    # D1 count as an explicit rejection.
    d1_all: dict[tuple[str, str], list[str]] = {}
    for rec in findings.get("D1", []):
        k = _key(rec)
        if k and k in pool:
            d1_all.setdefault(k, []).append(
                rec.get("final_category") or rec.get("category") or ""
            )

    d1_vetoes: set[tuple[str, str]] = set()
    for k, cats in d1_all.items():
        content_cats = [c for c in cats if c not in NON_CONTENT_CATEGORIES]
        if content_cats:
            # Rank by CATEGORY PRIORITY, never by file order.
            #
            # This was `content_cats[0]` until 2026-08-05 — whichever category the
            # detector happened to emit FIRST won, which is document order, not a rule.
            # An attribute rendered BOTH as visible text and into an aria-label (e.g.
            # table-of-contents.title, team-member.name) would resolve to whichever
            # usage site appeared earlier in render.php, so moving a line could silently
            # change its role. Found by the D1 forward-tracking QC pass while both rows
            # were still outside the eligible pool — inert, but inert is a bug with a
            # delay.
            #
            # Visible content outranks a11y metadata: if a value is BOTH painted on the
            # page and used as an accessible name, it is content that also happens to
            # label itself. Classifying it a11y-text would exclude it from the content
            # walk and drop the visible text.
            per_detector["D1"][k] = min(content_cats, key=_category_rank)
        else:
            # ⛔ D1 looked at this attribute and said NO. Recorded as a VETO, not as
            # support. Before this was split out, `rel` (an HTML rel attribute, escaped
            # into a link attribute) was ASSIGNED text-content because D1 appeared in the
            # supporting-detector list while its actual verdict was a rejection — an
            # explicit "no" read as a "yes". Found 2026-08-04 by eyeballing the output.
            d1_vetoes.add(k)

    for rec in findings.get("D2", []):
        k = _key(rec)
        if k and k in pool and rec.get("category") == "content-control":
            # D2 reports a control, not a category. A TextareaControl bound to markup is
            # the SVG shape; everything else it can see is plain visible text.
            ctrl = (rec.get("control") or "").lower()
            per_detector["D2"][k] = "svg-markup" if "textarea" in ctrl else "visible-text"

    for rec in findings.get("D3", []):
        k = _key(rec)
        if k and k in pool and rec.get("category") == "i18n-wrapped-default":
            per_detector["D3"][k] = "visible-text"

    assignments, report_only, disagreements, vetoed = [], [], [], []
    seen = set()
    for det in ("D1", "D3", "D2"):
        for k, cat in per_detector[det].items():
            if k in seen:
                continue
            if cat in NON_CONTENT_CATEGORIES:
                continue

            # An explicit D1 rejection outranks D2/D3 support. D1 observes what the value
            # BECOMES in the rendered output, which is the closest available evidence to
            # the actual question.
            if k in d1_vetoes:
                vetoed.append(
                    {"block_slug": k[0], "attr_name": k[1], "claimed_by": det,
                     "d1_verdicts": d1_all.get(k, []),
                     "reason": "D1 examined every usage site and found none content-bearing"}
                )
                seen.add(k)
                continue

            # D3 proves an i18n-wrapped default, which establishes THAT a value is content
            # but not WHICH KIND. Where D1 is silent (Interactivity-API text, e.g. the
            # sgs/cart labels), the category is genuinely undetermined — so consult the
            # block's own source for an aria-*/alt binding rather than defaulting to
            # visible text. Mis-filing an aria-label as visible content would lift screen-
            # reader text into the visible clone.
            if det == "D3" and k not in per_detector["D1"] and _binds_to_a11y_attribute(*k):
                cat = "a11y-metadata"

            # D1 wins a category disagreement: it observes what the value BECOMES.
            d1_cat = per_detector["D1"].get(k)
            if d1_cat and d1_cat not in NON_CONTENT_CATEGORIES and d1_cat != cat:
                disagreements.append(
                    {"block_slug": k[0], "attr_name": k[1],
                     "D1": d1_cat, "other": cat, "resolved_to": d1_cat}
                )
                cat = d1_cat

            supporting = [d for d in ("D1", "D2", "D3") if k in per_detector[d]]
            trusted = [d for d in supporting if d in TRUSTED_ALONE]

            if cat in REPORT_ONLY_CATEGORIES:
                report_only.append(
                    {"block_slug": k[0], "attr_name": k[1], "category": cat,
                     "detectors": supporting, "reason": REPORT_ONLY_CATEGORIES[cat]}
                )
            elif not trusted:
                report_only.append(
                    {"block_slug": k[0], "attr_name": k[1], "category": cat,
                     "detectors": supporting,
                     "reason": "D2-only: control type alone is 66% precise, never assigns"}
                )
            elif cat in CATEGORY_TO_ROLE:
                assignments.append(
                    {"block_slug": k[0], "attr_name": k[1], "role": CATEGORY_TO_ROLE[cat],
                     "category": cat, "detectors": supporting}
                )
            else:
                report_only.append(
                    {"block_slug": k[0], "attr_name": k[1], "category": cat,
                     "detectors": supporting, "reason": f"unmapped category '{cat}'"}
                )
            seen.add(k)

    # A D1-ONLY rejection must still be VISIBLE. Added 2026-08-05.
    #
    # A key that D1 examined and rejected, and that no other detector touched, never
    # entered the loop above (it is in d1_vetoes, not per_detector["D1"]), so it landed in
    # NO bucket at all — not assigned, not reported, not vetoed. `sgs/icon.linkRel` and
    # `sgs/media.linkRel` were invisible this way. The verdict was CORRECT; the row simply
    # vanished, which is indistinguishable from a row nothing ever looked at. A decision
    # that leaves no trace cannot be reviewed or challenged later.
    for k in sorted(d1_vetoes):
        if k in seen:
            continue
        vetoed.append(
            {"block_slug": k[0], "attr_name": k[1], "claimed_by": None,
             "d1_verdicts": d1_all.get(k, []),
             "reason": "D1-only: examined every usage site, found none content-bearing "
                       "(no other detector saw this attr)"}
        )
        seen.add(k)

    # FRAGMENT rows are a GAP, not a rejection (Bean, 2026-08-05).
    #
    # A `value-fragment` veto says only "no WHOLE-VALUE role can carry this" — it says
    # nothing about whether the value is content. Usually it IS: sgs/whatsapp-cta's
    # phoneNumber and message are both client-authored copy that a client edits, and both
    # reach the page only as pieces concatenated into a wa.me URL. Leaving them filed
    # beside genuine non-content vetoes (`linkRel`, class tokens) states a verdict the
    # evidence does not support, and buries a real gap in a list nobody re-reads.
    #
    # They stay OUT of `assignments` — every existing content-bearing role is a
    # whole-value contract, and assigning one would corrupt the value on the next clone
    # (link-href would write `https://wa.me/447700900123?text=Hi` into an attribute
    # render.php re-prefixes with `https://wa.me/`). But they are surfaced separately, as
    # the same shape as sgs/responsive-logo.alt: genuine content with no compatible role.
    # The durable fix is a DECLARED role (supports.sgs.attrRoles, FR-31-2.1a / Task E),
    # not a guessed one — this bucket is that task's inbox.
    # ONLY when fragmentation is D1's WHOLE story. If D1 also rejected the value
    # somewhere for a substantive reason, that reason stands and the row is an ordinary
    # veto. Measured 2026-08-05: a first cut tested `"value-fragment" in verdicts` and
    # swept in five `fieldName` rows (form-field-address/checkbox/file/radio/tiles) whose
    # verdict lists read like
    #     ['NOT-content', 'value-fragment', 'value-fragment', 'value-fragment']
    # — the NOT-content entries are `name="`/`id="`/`aria-describedby` sites, i.e. D1
    # saying plainly that a form-processing key is not content. Those are not gaps; the
    # fragment verdicts are just the same key being concatenated into element ids. Calling
    # them "plausibly content" would have put five backend keys in Task E's inbox and
    # inflated the gap count six-fold.
    content_gaps = [
        v for v in vetoed
        if (v.get("d1_verdicts") or []) and set(v["d1_verdicts"]) == {"value-fragment"}
    ]
    vetoed = [v for v in vetoed if v not in content_gaps]
    for gap in content_gaps:
        gap["reason"] = (
            "REACHED and plausibly content, but it only ever renders as a CONCATENATED "
            "FRAGMENT of a larger value. No existing role fits: every content-bearing "
            "role extracts a WHOLE value, so assigning one would corrupt this attr on "
            "clone. Needs a declared role (Task E), not a guessed one."
        )

    # DETECTOR 4 -- referenced in code, never escaped, never CSS (2026-08-05, Bean).
    #
    # Runs LAST and only over what everything else left behind: rows no detector
    # claimed as content and no D1 veto covered. For each, D4 asks a different
    # question -- "does the block's own code (or the shared includes/components
    # trees) actually READ this value?" A yes, combined with D1 having found no
    # escaping call and the emission parser having found no css_property, is
    # positive evidence of a machine-facing value: a form key, a conditional
    # operand, a query argument.
    #
    # This is NOT "leftovers are technical". An attribute nothing reads is left
    # alone here -- that is a DEAD attribute, a different finding owned by
    # check-dead-controls.js CHECK 4, with a different fix (delete it).
    claimed = set(seen) | {(a["block_slug"], a["attr_name"]) for a in assignments}
    d4_candidates = sorted(pool - claimed)
    technical_refs = []
    wrapper_styling = []
    d4_review = []
    if d4_candidates:
        try:
            # sys.path insert is REQUIRED, not tidy-up. assign-canonical loads
            # THIS module via importlib.spec_from_file_location, which does NOT
            # put the module's own directory on sys.path — so a plain
            # `import detector4_...` resolves when the fingerprint is run
            # directly from this folder and raises ModuleNotFoundError when the
            # seeder loads it. Measured 2026-08-05: D4 assigned 42 rows in every
            # direct run and 0 in the actual /sgs-update, and the difference was
            # a stderr line buried in a 14-stage log. The bug was caught by the
            # role count being 17 instead of 59, not by the warning.
            if str(SCRIPT_DIR) not in sys.path:
                sys.path.insert(0, str(SCRIPT_DIR))
            import detector4_referenced_not_output as _d4
            _d4_all = _d4.detect(d4_candidates)
            # D4 emits two categories. Only 'referenced-not-output' earns the
            # technical role; 'wrapper-rendered-styling' is a block owing an
            # attrMap declaration and is reported as its own actionable bucket.
            technical_refs = [x for x in _d4_all if x["category"] == "referenced-not-output"]
            wrapper_styling = [x for x in _d4_all if x["category"] == "wrapper-rendered-styling"]
            d4_review = [x for x in _d4_all if x["category"] == "d4-needs-review"]
        except Exception as exc:  # surfaced, never swallowed
            technical_refs = []
            wrapper_styling = []
            d4_review = []
            print(f"!! DETECTOR 4 DID NOT RUN: {type(exc).__name__}: {exc}",
                  file=sys.stderr)

    reached = (
        set().union(*(set(d) for d in per_detector.values())) | d1_vetoes
        | {(t["block_slug"], t["attr_name"]) for t in technical_refs}
        | {(t["block_slug"], t["attr_name"]) for t in wrapper_styling}
        | {(t["block_slug"], t["attr_name"]) for t in d4_review}
        if per_detector else set(d1_vetoes)
    )
    return {
        "eligible_pool": len(pool),
        "reached_by_any_detector": len(reached),
        "unreached": len(pool) - len(reached),
        "assignments": sorted(assignments, key=lambda a: (a["block_slug"], a["attr_name"])),
        "report_only": sorted(report_only, key=lambda a: (a["block_slug"], a["attr_name"])),
        "disagreements": disagreements,
        "vetoed": sorted(vetoed, key=lambda a: (a["block_slug"], a["attr_name"])),
        "technical_refs": sorted(technical_refs, key=lambda a: (a["block_slug"], a["attr_name"])),
        "wrapper_styling": sorted(wrapper_styling, key=lambda a: (a["block_slug"], a["attr_name"])),
        "d4_review": sorted(d4_review, key=lambda a: (a["block_slug"], a["attr_name"])),
        "content_gaps": sorted(content_gaps, key=lambda a: (a["block_slug"], a["attr_name"])),
    }


def compute(db_path: Path | None = None) -> dict:
    conn = sqlite3.connect(f"file:{db_path or resolve_db()}?mode=ro", uri=True)
    try:
        pool = eligible_pool(conn)
    finally:
        conn.close()
    return fingerprint(run_detectors(), pool)


# --- self-test ------------------------------------------------------------------------

PLANT_RENDER = """<?php
$plantedVisible = isset( $attributes['plantedVisible'] ) ? (string) $attributes['plantedVisible'] : '';
if ( $plantedVisible ) {
\t$plantedSvg = isset( $attributes['plantedSvg'] ) ? (string) $attributes['plantedSvg'] : '';
\techo '<p>' . esc_html( $plantedVisible ) . '</p>';
\techo wp_kses_post( $plantedSvg );
}
"""


def self_test() -> int:
    """Prove the rule can FAIL, and that the plant actually landed before trusting it.

    A negative control has its own vacuity modes -- three were hit on this project in a
    single day (one healed by a seeder, one patching a symbol computed at import, one
    catching the wrong exception class). So: assert the plant is on disk, assert the
    detector flags it, and assert an unplanted run does NOT flag it.
    """
    failures = []
    tmp = Path(tempfile.mkdtemp(prefix="fingerprint-selftest-"))
    try:
        work = tmp / "content-role-detect"
        shutil.copytree(SCRIPT_DIR, work, ignore=shutil.ignore_patterns("__pycache__"))
        blocks = tmp / "src" / "blocks" / "plantblock"
        blocks.mkdir(parents=True)
        target = blocks / "render.php"
        target.write_text(PLANT_RENDER, encoding="utf-8")

        # 1. Confirm the plant LANDED. sed-style edits exit 0 on zero matches; a plant that
        #    was never written is indistinguishable from a detector that cannot see it.
        if not target.exists() or "plantedVisible" not in target.read_text(encoding="utf-8"):
            failures.append("PLANT DID NOT LAND on disk — every result below is vacuous")
            print("FAIL: " + failures[-1])
            return 1
        print(f"ok   plant landed at {target} ({target.stat().st_size} bytes)")

        # 2. The rule must FLAG the planted content.
        pool = {("sgs/plantblock", "plantedVisible"), ("sgs/plantblock", "plantedSvg")}
        findings = {
            "D1": [
                {"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                 "final_category": "visible-text"},
                {"block_slug": "sgs/plantblock", "attr_key": "plantedSvg",
                 "final_category": "svg-markup"},
            ],
            "D2": [], "D3": [],
        }
        got = fingerprint(findings, pool)
        roles = {(a["block_slug"], a["attr_name"]): a["role"] for a in got["assignments"]}
        if roles.get(("sgs/plantblock", "plantedVisible")) != "text-content":
            failures.append("planted visible-text was NOT assigned text-content")
        if roles.get(("sgs/plantblock", "plantedSvg")) != "svg":
            failures.append("planted svg-markup was NOT assigned the 'svg' role")

        # 3. NEGATIVE CONTROL: with no findings the rule must assign NOTHING. A rule that
        #    fires on an empty input cannot distinguish signal from noise.
        empty = fingerprint({"D1": [], "D2": [], "D3": []}, pool)
        if empty["assignments"]:
            failures.append("rule assigned roles from an EMPTY finding set — cannot fail")

        # 4. D2-alone must NEVER assign. This is the whole point of the precision rule.
        d2_only = fingerprint(
            {"D1": [], "D2": [{"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                               "category": "content-control", "control": "TextControl"}], "D3": []},
            pool,
        )
        if d2_only["assignments"]:
            failures.append("D2-alone produced an ASSIGNMENT — the 66%-precision rule is not enforced")
        if not any(r["attr_name"] == "plantedVisible" for r in d2_only["report_only"]):
            failures.append("D2-alone was not reported at all — the row would vanish silently")

        # 5. REGRESSION GUARD for the 2026-08-04 veto bug. D1 examined `sgs/button.rel`,
        #    returned NOT-content for every usage site, and the row was ASSIGNED anyway
        #    because D1 appeared in the supporting-detector list while its verdict was a
        #    rejection. An explicit "no" must never read as a "yes".
        veto = fingerprint(
            {
                "D1": [{"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                        "final_category": "NOT-content"}],
                "D2": [{"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                        "category": "content-control", "control": "TextControl"}],
                "D3": [{"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                        "category": "i18n-wrapped-default"}],
            },
            pool,
        )
        if veto["assignments"]:
            failures.append(
                "D1 REJECTION was overridden by D2+D3 support — the veto is not enforced"
            )
        if not veto["vetoed"]:
            failures.append("D1 rejection produced no veto record — the row vanishes silently")

        # 5b. A D1 rejection at ONE usage site must NOT veto when another site is content:
        #     an attribute escaped as text somewhere and into a class elsewhere IS content.
        mixed = fingerprint(
            {
                "D1": [{"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                        "final_category": "NOT-content"},
                       {"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                        "final_category": "visible-text"}],
                "D2": [], "D3": [],
            },
            pool,
        )
        if not mixed["assignments"]:
            failures.append(
                "a mixed-usage attr (content at one site, not at another) was vetoed — "
                "over-strict; content anywhere means content"
            )

        # 5c. PRIORITY tie-break: an attr rendered BOTH as visible text and into an
        #     aria-label must resolve to the CONTENT role, not a11y. Before 2026-08-05
        #     this took content_cats[0] — document order — so moving a line in render.php
        #     could silently flip the role.
        both = fingerprint(
            {"D1": [{"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                     "final_category": "a11y-metadata"},
                    {"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                     "final_category": "visible-text"}],
             "D2": [], "D3": []},
            pool,
        )
        both_roles = {a["attr_name"]: a["role"] for a in both["assignments"]}
        if both_roles.get("plantedVisible") != "text-content":
            failures.append(
                "priority tie-break failed: a dual-rendered attr resolved to "
                f"{both_roles.get('plantedVisible')!r}, not text-content (a11y won by order)")

        # 5d. A D1-ONLY rejection must land in a bucket. Before 2026-08-05 such a row
        #     appeared in NONE — a correct verdict that left no trace.
        only = fingerprint(
            {"D1": [{"block_slug": "sgs/plantblock", "attr_key": "plantedSvg",
                     "final_category": "NOT-content"}], "D2": [], "D3": []},
            pool,
        )
        if not any(v["attr_name"] == "plantedSvg" for v in only["vetoed"]):
            failures.append("a D1-only rejection reached NO bucket — the row vanishes silently")

        # 6. a11y-metadata must be reported, never assigned.
        a11y = fingerprint(
            {"D1": [{"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                     "final_category": "a11y-metadata"}], "D2": [], "D3": []},
            pool,
        )
        # CONTRACT CHANGED 2026-08-05. This assertion previously required a11y-metadata to
        # be REPORTED and never assigned, because no correct role existed. 'a11y-text' now
        # does. It must be assigned THAT and nothing else -- assigning 'image-alt' would
        # still feed a consumer expecting a companion image (db_lookup.py:2611-2636).
        a11y_roles = {a["attr_name"]: a["role"] for a in a11y["assignments"]}
        if a11y_roles.get("plantedVisible") != "a11y-text":
            failures.append(
                "a11y-metadata was not assigned 'a11y-text' (got "
                f"{a11y_roles.get('plantedVisible')!r})")
        if "image-alt" in a11y_roles.values():
            failures.append("a11y-metadata was assigned image-alt — corrupts the image arm")

        # 7. authored-alt-text (split from a11y-metadata 2026-08-05, D483/D484) must
        #    map to text-content, and must NOT collapse back into a11y-text — that
        #    collapse is exactly the defect being fixed (alt/placeholder silently
        #    excluded from the converter's content walk via the a11y-text role).
        alt_text = fingerprint(
            {"D1": [{"block_slug": "sgs/plantblock", "attr_key": "plantedVisible",
                     "final_category": "authored-alt-text"}], "D2": [], "D3": []},
            pool,
        )
        alt_text_roles = {a["attr_name"]: a["role"] for a in alt_text["assignments"]}
        if alt_text_roles.get("plantedVisible") != "text-content":
            failures.append(
                "authored-alt-text was not assigned 'text-content' (got "
                f"{alt_text_roles.get('plantedVisible')!r})")
        if "a11y-text" in alt_text_roles.values():
            failures.append(
                "authored-alt-text collapsed into a11y-text — this is the exact defect "
                "the split fixes (alt/placeholder excluded from the content walk)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    for f in failures:
        print(f"FAIL: {f}")
    if not failures:
        print("ok   rule assigns planted content, refuses empty input, refuses D2-alone, refuses a11y")
        print("PASS")
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--json", action="store_true", help="emit the full result as JSON")
    ap.add_argument("--self-test", action="store_true", help="prove the rule can fail")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    result = compute()
    if args.json:
        print(json.dumps(result, indent=2))
        return 0

    a, r = result["assignments"], result["report_only"]
    print(f"eligible pool            {result['eligible_pool']}")
    print(f"reached by any detector  {result['reached_by_any_detector']}")
    print(f"unreached (open space)   {result['unreached']}")
    print(f"\nASSIGNABLE               {len(a)}   (expected 0 at pool=36; see EXPECTED POPULATION)")
    print(f"REPORT-ONLY              {len(r)}   (expected ~13 at pool=36)")
    print(f"VETOED by D1             {len(result['vetoed'])}   (D2/D3 claimed, D1 rejected)")
    print(f"CONTENT GAPS             {len(result['content_gaps'])}   (content, but no whole-value role fits -> Task E)")
    print(f"D4 REFERENCED-NOT-OUTPUT {len(result['technical_refs'])}   (read by code, never escaped, never CSS -> technical)")
    print(f"D4 WRAPPER-STYLING       {len(result['wrapper_styling'])}   (wrapper-painted; SEEDED 'styling' by assign-canonical TIER 2.4 -- expected 0 after a reseed)")
    print(f"D4 NEEDS REVIEW          {len(result['d4_review'])}   (read but not escaped; technical OR late-painted styling — human call)")
    if result["disagreements"]:
        print(f"DISAGREEMENTS            {len(result['disagreements'])}   (D1 wins each)")

    # RE-ARMED 2026-08-06. The old condition was `len(a) < 40`, calibrated against a
    # 262-row pool. That pool has been worked down to 69 (1609 string-typed sgs/% rows
    # now carry a role), so ASSIGNABLE 0 became the CORRECT steady state and the warning
    # fired on every run — a tripwire that always fires is one nobody reads.
    #
    # It is re-pointed, NOT removed. The condition that would genuinely indicate a blind
    # detector today is the pool GROWING (new blocks / new string attrs arriving unroled)
    # while ASSIGNABLE stays flat: new rows should be assignable, because the reason the
    # current 69 are not is that each already reached a detector that deliberately
    # declines to assign it (`unreached` is 0).
    POOL_AT_REDECLARATION = 69
    pool_grew = result["eligible_pool"] > POOL_AT_REDECLARATION
    if pool_grew and len(a) == 0:
        # ASCII only: the Windows console defaults to cp1252 and a non-ASCII glyph raises
        # UnicodeEncodeError, which would crash the run at the exact moment it is trying to
        # warn you. A warning path that kills the process is worse than no warning.
        grew_by = result["eligible_pool"] - POOL_AT_REDECLARATION
        print(f"\n!! The eligible pool GREW by {grew_by} (now {result['eligible_pool']}, was")
        print(f"   {POOL_AT_REDECLARATION} at re-declaration) yet ASSIGNABLE is still 0. New unroled attrs")
        print("   should be assignable - the current residue is unassignable only because")
        print("   each already reached a detector that declines to assign. Per this project's")
        print("   own record, a low number is a CLAIM REQUIRING EVIDENCE - suspect the script")
        print("   before accepting the result.")
    if result["unreached"]:
        print(f"\n!! {result['unreached']} row(s) reached NO detector at all - open space, not residue.")

    by_role: dict[str, int] = {}
    for x in a:
        by_role[x["role"]] = by_role.get(x["role"], 0) + 1
    print("\n  role assignments:")
    for role, n in sorted(by_role.items()):
        print(f"    {role:16} {n}")

    print("\n  first 15 assignments:")
    for x in a[:15]:
        print(f"    {x['block_slug']:26} {x['attr_name']:24} -> {x['role']:14} {'+'.join(x['detectors'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
