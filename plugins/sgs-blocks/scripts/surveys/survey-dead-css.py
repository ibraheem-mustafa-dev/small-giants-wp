#!/usr/bin/env python3
"""survey-dead-css.py — the DEAD-CSS census: a selector whose precondition the
emitter provably never produces.

WHY THIS EXISTS
----------------
Twice in one day (2026-08-10) a CSS selector was found dead — matchable by no
DOM the emitter can ever produce — and both times it was found by a human
reading code by hand, or by checking a live page. Bean asked whether this is
really impossible to catch statically. It is not; both instances were the SAME
shape and it IS decidable from source + build files alone:

  `assets/css/extensions.css` had `.sgs-has-image-controls[style*="--sgs-
  object-fit"]` and `.sgs-has-hover[style*="--sgs-hover-bg"]`, but
  `includes/image-controls.php` and `includes/hover-effects.php` emit those
  custom properties ONLY inside a scoped `<style>` tag (via
  `sgs_append_scoped_var_style()`, Spec 32 / FR-32-11) — never as a literal
  `style="…"` HTML attribute. The attribute-selector precondition
  (`[style*="…"]`) can therefore never be true on any rendered DOM node. Both
  are now fixed (`8b07cdb9`, `7908a22f`) — this script is the detector so the
  third one is caught before it ships.

THREE DETECTIONS (priority order — see class docstrings below for each):
  1. `[style*="--sgs-…"]` attribute gates with no literal `style="…"` writer
     for that custom property anywhere in the emitter corpus (the proven
     killer — distinguishes a `style="…"` ATTRIBUTE write from a scoped
     `<style>` TAG write; that distinction IS the bug).
  2. `.sgs-…` classes a CSS rule requires but nothing emits (word-boundary
     safe; a dynamically CONCATENATED class is `dynamic_unresolvable`, not
     dead — dynamic construction is not evidence of absence).
  3. Custom properties consumed via `var(--sgs-foo)` with no writer anywhere
     (a real defect — the property can never resolve), and the inverse,
     written but never consumed (informational — dead weight, not breakage).

⛔ THIS IS A CENSUS, NOT A GATE. No `--check` mode; do NOT add it to
`prebuild`. A non-gating script in a gate chain is enforcement theatre
(D545). Model + heritage: `survey-responsive-shape.py`.

COMMENTS ARE THE TRAP FOR DETECTIONS 1 + 2. The very comments explaining these
two historical bugs contain the literal string `style="` in prose ("NEVER a
style=\"\" attribute") right next to the dead selector's own property name —
a naive live-code scan of the CURRENT (fixed) tree would misread its own
post-mortem comment as evidence the selector is alive. Every corpus is
comment-stripped (CSS `/* */`, PHP/JS `/* */` + `//` not preceded by `:`, so
`https://` survives) before any marker search. This is not a nicety; without
it the self-test's own historical-validation leg cannot pass (see USAGE).

USAGE
  python scripts/surveys/survey-dead-css.py                # human census
  python scripts/surveys/survey-dead-css.py --json          # machine-readable
  python scripts/surveys/survey-dead-css.py --self-test     # prove it can FAIL
  python scripts/surveys/survey-dead-css.py --root <path>   # scan an
      arbitrary tree shaped like plugins/sgs-blocks — used to validate against
      a pre-fix snapshot: `git archive 629971c7 -- plugins/sgs-blocks | tar -x
      -C <tmpdir>` then `--root <tmpdir>/plugins/sgs-blocks`.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN_ROOT = Path(__file__).resolve().parents[2]

CSS_SCAN_DIRS = ("assets/css", "src/blocks")
EMITTER_SCAN_DIRS = ("includes", "src/blocks")

# --------------------------------------------------------------------------
# File discovery + comment stripping
# --------------------------------------------------------------------------


def find_files(root: Path, subdirs: tuple[str, ...], suffixes: tuple[str, ...]) -> list[Path]:
    out: list[Path] = []
    seen: set[Path] = set()
    for sub in subdirs:
        base = root / sub
        if not base.exists():
            continue
        for suffix in suffixes:
            for p in sorted(base.rglob(f"*{suffix}")):
                if p.is_file() and p not in seen:
                    seen.add(p)
                    out.append(p)
    return out


def strip_css_comments(text: str) -> str:
    """Remove /* ... */ CSS comments. Non-greedy, DOTALL — a CSS comment
    cannot itself contain `*/`, so this is exact (not a heuristic)."""
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def strip_code_comments(text: str) -> str:
    """Remove PHP/JS `/* */` block comments and `//` line comments.

    ⚠ Load-bearing for this survey's own correctness: the two historical bugs'
    fix commits left docblock PROSE containing the literal string `style="`
    right beside the dead property's name (e.g. "NEVER a style=\"\"
    attribute"). Without stripping, that prose reads as attribute-write
    EVIDENCE and the survey would silently clear the very selectors it exists
    to catch. `//` is not stripped when immediately preceded by `:` so a
    `https://` URL literal survives (disclosed heuristic, not a full
    tokenizer — a `//` inside a string literal not preceded by `:` is still
    a known false-strip risk, same class of limitation `survey-box-
    controls.py` discloses for its own heuristics).
    """
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    lines = text.split("\n")
    out = []
    for line in lines:
        out.append(re.sub(r"(?<!:)//.*$", "", line))
    return "\n".join(out)


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""


def load_corpus(files: list[Path], stripper) -> dict[Path, str]:
    return {f: stripper(read(f)) for f in files}


# --------------------------------------------------------------------------
# Detection 1 — [style*="--sgs-…"] attribute gates
# --------------------------------------------------------------------------

STYLE_ATTR_GATE_RE = re.compile(r"""\[\s*style\s*\*=\s*(["'])(--[A-Za-z0-9-]+)\1\s*\]""")

# A literal HTML `style="…"` / `style='…'` ATTRIBUTE open — the ONLY thing
# that can satisfy `[style*="…"]`. Deliberately requires the `=` so it never
# matches a `<style>` TAG (which has no `=` right after the word "style").
STYLE_ATTR_WRITE_RE = re.compile(r"""\bstyle\s*=\s*["']""")
# JS DOM inline-style writes also land in the `style="…"` HTML attribute at
# runtime (CSSOM reflects `.style.setProperty`/`.style.cssText` to the
# attribute), so they count as attribute-write evidence too.
JS_STYLE_PROP_WRITE_RE = re.compile(r"""\.style\s*\.\s*(setProperty|cssText)\b""")

PROXIMITY_CHARS = 400  # generous window for PHP concatenation soup


def classify_style_attr_gate(prop: str, emitter_corpus: dict[Path, str]) -> dict:
    """Is there real `style="…"` (or JS `.style.setProperty`) ATTRIBUTE-write
    evidence for this exact custom property, within plausible proximity of
    the property's own literal name, in the SAME FILE? If not, it is DEAD —
    the selector can never match any DOM the emitter produces.

    ⚠ Proximity is deliberately checked PER-FILE, never across the
    concatenated corpus: two small unrelated files (e.g. one block's real
    attribute-writer and another block's scoped-`<style>`-only writer) can
    land within any fixed character window purely by being adjacent in the
    corpus, which would manufacture a false ALIVE for the second file's
    property. Caught by this script's own self-test before it ran on the
    tree — the fix IS the per-file scoping, not a bigger window.
    """
    prop_re = re.compile(re.escape(prop))
    seen_prop_anywhere = False
    seen_attr_marker_anywhere = False
    for text in emitter_corpus.values():
        prop_hits = list(prop_re.finditer(text))
        if not prop_hits:
            continue
        seen_prop_anywhere = True
        attr_hits = list(STYLE_ATTR_WRITE_RE.finditer(text)) + list(JS_STYLE_PROP_WRITE_RE.finditer(text))
        if attr_hits:
            seen_attr_marker_anywhere = True
        for ph in prop_hits:
            for ah in attr_hits:
                if abs(ph.start() - ah.start()) <= PROXIMITY_CHARS:
                    return {"status": "alive", "reason": "found a style=\"…\" attribute write within "
                                                           f"{PROXIMITY_CHARS} chars of the property name, "
                                                           "in the same file"}

    if not seen_prop_anywhere:
        return {"status": "dead", "reason": "property never appears in the emitter corpus at all"}
    if not seen_attr_marker_anywhere:
        return {"status": "dead", "reason": "property is written, but never inside a literal style=\"…\" "
                                              "attribute or .style.setProperty() in any file that mentions it"}
    return {"status": "dead", "reason": "property and a style=\"…\" attribute write both exist somewhere "
                                         "in the corpus but never within proximity in the same file"}


def scan_style_attr_gates(css_corpus: dict[Path, str], emitter_corpus: dict[Path, str]) -> list[dict]:
    """Only DEAD gates are reported — an alive gate is not a finding, same
    convention as every other detection here (a census reports anomalies,
    not confirmations)."""
    findings = []
    for path, text in css_corpus.items():
        for m in STYLE_ATTR_GATE_RE.finditer(text):
            prop = m.group(2)
            line_no = text.count("\n", 0, m.start()) + 1
            verdict = classify_style_attr_gate(prop, emitter_corpus)
            if verdict["status"] != "dead":
                continue
            findings.append({
                "detection": "style_attr_gate",
                "file": str(path),
                "line": line_no,
                "selector_fragment": m.group(0),
                "property": prop,
                **verdict,
            })
    return findings


# --------------------------------------------------------------------------
# Detection 2 — .sgs-… class gates with no emitter
# --------------------------------------------------------------------------

# A CSS rule's selector prelude, split from its declaration block, one match
# per `selector-list { ... }` occurrence.
CSS_RULE_RE = re.compile(r"([^{}]+)\{[^{}]*\}", re.S)
SGS_CLASS_TOKEN_RE = re.compile(r"\.(sgs-[A-Za-z0-9_-]+)")


def exact_token_regex(token: str) -> re.Pattern:
    """Word-boundary-safe match for a hyphenated CSS class TOKEN. Plain
    `\\b` is unsafe here — a hyphen is a non-word char, so `\\bcolumns\\b`
    still matches inside `list-columns` (this repo's own recorded failure:
    `a-substring-match-is-not-a-word-match`). Require the token be flanked
    by characters that cannot extend a class name (`[A-Za-z0-9_-]`)."""
    return re.compile(r"(?<![A-Za-z0-9_-])" + re.escape(token) + r"(?![A-Za-z0-9_-])")


def is_dynamically_built(token: str, corpus_text: str) -> bool:
    """A class built by concatenation/interpolation is NOT evidence of
    absence — classify separately rather than calling it dead. Checks every
    hyphen-truncated PREFIX of the token for a quoted-prefix-then-
    concatenation pattern (`'sgs-cols-tablet-' . $cols`) or a template-
    literal interpolation (`` `sgs-cols-tablet-${cols}` ``)."""
    parts = token.split("-")
    for i in range(1, len(parts)):
        prefix = "-".join(parts[:i]) + "-"
        concat_re = re.compile(r"""['"]""" + re.escape(prefix) + r"""['"]\s*(?:\.\s*\$|\+\s*[\w$])""")
        template_re = re.compile(r"`[^`\n]*" + re.escape(prefix) + r"\$\{")
        if concat_re.search(corpus_text) or template_re.search(corpus_text):
            return True
    return False


def extract_required_classes(css_corpus: dict[Path, str]) -> dict[str, list[dict]]:
    """Every `.sgs-…` class token required by some CSS rule, mapped to every
    file:line it appears at (a class can be required in several places)."""
    required: dict[str, list[dict]] = {}
    for path, text in css_corpus.items():
        for rule_m in CSS_RULE_RE.finditer(text):
            prelude = rule_m.group(1)
            prelude_start = rule_m.start(1)
            for tok_m in SGS_CLASS_TOKEN_RE.finditer(prelude):
                token = tok_m.group(1)
                abs_pos = prelude_start + tok_m.start()
                line_no = text.count("\n", 0, abs_pos) + 1
                required.setdefault(token, []).append({"file": str(path), "line": line_no})
    return required


def scan_class_gates(css_corpus: dict[Path, str], emitter_text: str) -> list[dict]:
    findings = []
    required = extract_required_classes(css_corpus)
    for token, refs in sorted(required.items()):
        if exact_token_regex(token).search(emitter_text):
            continue  # emitted literally somewhere — alive
        status = "dynamic_unresolvable" if is_dynamically_built(token, emitter_text) else "dead"
        findings.append({
            "detection": "class_gate",
            "class": token,
            "status": status,
            "required_at": refs,
            "reason": ("class token appears only as a dynamically-built fragment — not evidence "
                       "of absence, needs a human/agent to confirm" if status == "dynamic_unresolvable"
                       else "no literal emitter found for this exact class token anywhere in the corpus"),
        })
    return findings


# --------------------------------------------------------------------------
# Detection 3 — custom properties: consumed-never-written / written-never-consumed
# --------------------------------------------------------------------------

VAR_USAGE_RE = re.compile(r"var\(\s*(--sgs-[A-Za-z0-9-]+)")
# A DECLARATION of a custom property: `--sgs-foo:` in CSS/PHP-built CSS
# strings, or a JS `.setProperty('--sgs-foo', ...)` call, or the property
# name as a standalone quoted literal (broad net for PHP array-key builders
# like `$css_vars[] = '--sgs-foo:' . $x`).
WRITER_RE = re.compile(r"""(--sgs-[A-Za-z0-9-]+)\s*:|setProperty\(\s*["'](--sgs-[A-Za-z0-9-]+)["']""")


def extract_var_usages(css_text: str) -> dict[str, list[int]]:
    out: dict[str, list[int]] = {}
    for m in VAR_USAGE_RE.finditer(css_text):
        name = m.group(1)
        line_no = css_text.count("\n", 0, m.start()) + 1
        out.setdefault(name, []).append(line_no)
    return out


def extract_writers(combined_text: str) -> set[str]:
    out: set[str] = set()
    for m in WRITER_RE.finditer(combined_text):
        name = m.group(1) or m.group(2)
        if name:
            out.add(name)
    return out


def scan_custom_props(css_corpus: dict[Path, str], emitter_corpus: dict[Path, str]) -> list[dict]:
    combined_css = "\n".join(css_corpus.values())
    combined_emitter = "\n".join(emitter_corpus.values())
    combined_all = combined_css + "\n" + combined_emitter

    consumed = extract_var_usages(combined_css)
    written = extract_writers(combined_all)

    findings = []
    for name, lines in sorted(consumed.items()):
        if name not in written:
            findings.append({
                "detection": "custom_prop",
                "property": name,
                "status": "consumed_never_written",
                "consumed_at_lines": lines,
                "reason": "used via var() in CSS but no writer (CSS declaration, PHP css_vars[] build, "
                          "or JS setProperty) found anywhere — can never resolve to anything but its fallback",
            })
    for name in sorted(written):
        if name not in consumed:
            findings.append({
                "detection": "custom_prop",
                "property": name,
                "status": "written_never_consumed",
                "reason": "written somewhere but no var() consumer found in any CSS file — dead weight, "
                          "not breakage; informational only",
            })
    return findings


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------


def survey(root: Path) -> dict:
    css_files = find_files(root, CSS_SCAN_DIRS, (".css",))
    emitter_files = find_files(root, EMITTER_SCAN_DIRS, (".php", ".js"))

    css_corpus = load_corpus(css_files, strip_css_comments)
    emitter_corpus = load_corpus(emitter_files, strip_code_comments)
    emitter_text = "\n".join(emitter_corpus.values())

    findings = []
    findings += scan_style_attr_gates(css_corpus, emitter_corpus)
    findings += scan_class_gates(css_corpus, emitter_text)
    findings += scan_custom_props(css_corpus, emitter_corpus)

    return {
        "root": str(root),
        "css_files_scanned": len(css_files),
        "emitter_files_scanned": len(emitter_files),
        "findings": findings,
    }


# --------------------------------------------------------------------------
# Self-test
# --------------------------------------------------------------------------


def _write(base: Path, rel: str, content: str) -> None:
    p = base / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def _build_fixture_tree(base: Path) -> None:
    """Plant BOTH real historical bugs (as fixtures, not the live tree) plus
    matched negative controls for every detection, in a fixture shaped like
    plugins/sgs-blocks."""

    # --- Detection 1: style-attr gate ---------------------------------
    _write(base, "assets/css/extensions.css", """
/*
 * hover-effects.php emits --sgs-hover-bg inside a scoped <style> rule — it
 * NEVER writes a style="" attribute. The [style*="--sgs-hover-bg"] gate
 * below could never match.
 */
.sgs-has-hover[style*="--sgs-hover-bg"]:hover {
    background-color: var(--sgs-hover-bg);
}

/* Alive control: a real style="" attribute writer exists for this one. */
.sgs-alive-widget[style*="--sgs-alive-var"] {
    color: var(--sgs-alive-var);
}

/* Detection 2 fixtures */
.sgs-never-emitted-class { color: red; }
.sgs-emitted-class { color: blue; }
.sgs-cols-tablet-3 { grid-template-columns: repeat(3, 1fr); }

/* Detection 3 fixtures */
.sgs-ghost-consumer { color: var(--sgs-ghost-var); }
""")

    # PHP that builds --sgs-hover-bg into a css_vars array then hands it to
    # the shared scoped-<style> helper — mirrors the real pre-fix shape.
    # Comments here deliberately restate the "NEVER style=\"\"" prose to
    # prove comment-stripping works, exactly like the real historical files.
    _write(base, "includes/hover-effects.php", """<?php
// no-inline contract, FR-32-11 -- NEVER a style="" attribute. Same pattern
// as image-controls.php.
function sgs_hover_render( $block_content ) {
    $css_vars = array();
    $css_vars[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_bg );
    if ( $css_vars ) {
        $block_content = sgs_append_scoped_var_style( $block_content, $scope_class, $css_vars );
    }
    return $block_content;
}
""")

    # PHP that DOES write a literal style="" attribute for --sgs-alive-var.
    _write(base, "includes/alive-widget.php", """<?php
function sgs_alive_widget_render( $block_content ) {
    $style = 'style="--sgs-alive-var:' . esc_attr( $value ) . '"';
    return '<div ' . $style . '>' . $block_content . '</div>';
}
""")

    # Detection 2: emitted class, never-emitted class, dynamically-built class
    _write(base, "includes/class-emitter.php", """<?php
function sgs_add_classes( $content ) {
    $classes = array( 'sgs-emitted-class' );
    $classes[] = 'sgs-cols-tablet-' . $cols;
    return $content;
}
""")

    # Detection 3: --sgs-ghost-var consumed above has no writer anywhere.
    # --sgs-orphan-var is written but never consumed by any CSS file.
    _write(base, "includes/orphan-writer.php", """<?php
function sgs_orphan_render() {
    $css_vars = array();
    $css_vars[] = '--sgs-orphan-var:1';
    return $css_vars;
}
""")


def _build_clean_fixture_tree(base: Path) -> None:
    """A fully matched tree — every gate has a real writer. Must produce
    ZERO findings (negative control for the whole survey, not just one leg)."""
    _write(base, "assets/css/extensions.css", """
.sgs-clean-widget[style*="--sgs-clean-var"] {
    color: var(--sgs-clean-var);
}
.sgs-clean-class { color: green; }
""")
    _write(base, "includes/clean-widget.php", """<?php
function sgs_clean_render( $content ) {
    $style = 'style="--sgs-clean-var:' . esc_attr( $v ) . '"';
    $classes = array( 'sgs-clean-widget', 'sgs-clean-class' );
    return '<div class="' . implode( ' ', $classes ) . '" ' . $style . '>' . $content . '</div>';
}
""")


def self_test() -> int:
    import shutil
    import tempfile

    passed = failed = 0
    tmp = Path(tempfile.mkdtemp(prefix="survey-dead-css-selftest-"))
    try:
        fixture_root = tmp / "planted"
        _build_fixture_tree(fixture_root)
        result = survey(fixture_root)
        by_key = {}
        for f in result["findings"]:
            if f["detection"] == "style_attr_gate":
                by_key[("attr", f["property"])] = f
            elif f["detection"] == "class_gate":
                by_key[("class", f["class"])] = f
            elif f["detection"] == "custom_prop":
                by_key[("prop", f["property"], f["status"])] = f

        checks = [
            ("planted style-attr-gate DEAD (--sgs-hover-bg)",
             by_key.get(("attr", "--sgs-hover-bg"), {}).get("status") == "dead"),
            ("planted style-attr-gate ALIVE control (--sgs-alive-var not flagged)",
             ("attr", "--sgs-alive-var") not in by_key),
            ("planted class-gate DEAD (sgs-never-emitted-class)",
             by_key.get(("class", "sgs-never-emitted-class"), {}).get("status") == "dead"),
            ("planted class-gate ALIVE control (sgs-emitted-class not flagged)",
             ("class", "sgs-emitted-class") not in by_key),
            ("planted class-gate DYNAMIC (sgs-cols-tablet-3)",
             by_key.get(("class", "sgs-cols-tablet-3"), {}).get("status") == "dynamic_unresolvable"),
            ("planted custom-prop consumed-never-written (--sgs-ghost-var)",
             ("prop", "--sgs-ghost-var", "consumed_never_written") in by_key),
            ("planted custom-prop written-never-consumed (--sgs-orphan-var)",
             ("prop", "--sgs-orphan-var", "written_never_consumed") in by_key),
        ]
        for name, ok in checks:
            print(f"  {'PASS' if ok else 'FAIL'} {name}")
            passed += ok
            failed += not ok

        # Negative control — a fully matched tree must produce ZERO findings.
        clean_root = tmp / "clean"
        _build_clean_fixture_tree(clean_root)
        clean_result = survey(clean_root)
        if clean_result["findings"]:
            print(f"  FAIL negative control: fully matched tree produced "
                  f"{len(clean_result['findings'])} finding(s): {clean_result['findings']}")
            failed += 1
        else:
            print("  PASS negative control: fully matched tree -> zero findings")
            passed += 1

        print(f"\nSelf-test: {passed} passed, {failed} failed")
        return 1 if failed else 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--root", type=str, default=None,
                         help="Scan an arbitrary tree shaped like plugins/sgs-blocks "
                              "(e.g. a git-archive extraction of a pre-fix snapshot).")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    root = Path(args.root).resolve() if args.root else PLUGIN_ROOT
    result = survey(root)

    if args.json:
        print(json.dumps(result, indent=2))
        return 0

    fs = result["findings"]
    print(f"[survey-dead-css] root={result['root']}")
    print(f"  {result['css_files_scanned']} CSS file(s), "
          f"{result['emitter_files_scanned']} emitter file(s) scanned\n")

    attr_dead = [f for f in fs if f["detection"] == "style_attr_gate" and f["status"] == "dead"]
    class_dead = [f for f in fs if f["detection"] == "class_gate" and f["status"] == "dead"]
    class_dyn = [f for f in fs if f["detection"] == "class_gate" and f["status"] == "dynamic_unresolvable"]
    prop_ghost = [f for f in fs if f["detection"] == "custom_prop" and f["status"] == "consumed_never_written"]
    prop_orphan = [f for f in fs if f["detection"] == "custom_prop" and f["status"] == "written_never_consumed"]

    print("DETECTION 1 — [style*=\"--sgs-…\"] attribute gates with no attribute writer (the proven killer)")
    print(f"  DEAD: {len(attr_dead)}")
    for f in attr_dead:
        print(f"    {f['file']}:{f['line']}  {f['selector_fragment']}")
        print(f"      -> {f['reason']}")

    print("\nDETECTION 2 — .sgs-… classes required but never emitted")
    print(f"  DEAD: {len(class_dead)}   DYNAMIC (unresolvable, needs human triage): {len(class_dyn)}")
    for f in class_dead:
        where = "; ".join(f"{r['file']}:{r['line']}" for r in f["required_at"][:3])
        print(f"    .{f['class']}   required at {where}")
    if class_dyn:
        print("  Dynamic (triage hint, NOT a confirmed defect):")
        for f in class_dyn:
            where = "; ".join(f"{r['file']}:{r['line']}" for r in f["required_at"][:3])
            print(f"    .{f['class']}   required at {where}")

    print("\nDETECTION 3 — custom properties")
    print(f"  consumed via var() but never written: {len(prop_ghost)}  (real defect — can never resolve)")
    for f in prop_ghost:
        print(f"    {f['property']}  (lines {f['consumed_at_lines']})")
    print(f"  written but never consumed by any CSS: {len(prop_orphan)}  (informational — dead weight)")
    for f in prop_orphan:
        print(f"    {f['property']}")

    total = len(fs)
    print(f"\n{total} finding(s) total.")
    print("\n⛔ CENSUS ONLY — no --check, never in prebuild. `dynamic_unresolvable` is a TRIAGE HINT, "
          "not a defect; confirm with a human/agent before treating it as one.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
