"""Draft VOCABULARY lint — names vs the live framework DB (sibling of bem-lint.py).

bem-lint.py checks the SHAPE of every class token (Spec 00 §3 regex). This lint
checks the WORDING: whether each token's segments are names the cloning pipeline
actually recognises, against the same sgs-framework.db the converter reads
(db_lookup.py resolves the identical path) — no hardcoded vocab lists (R-31-1).

Checks per sgs-* class token:
  ERROR  — one node carries >= 2 DISTINCT block-root classes (FR-31-15: recognition
           ambiguity goes loud and the node falls back — always a draft bug).
  WARN   — element token not in slots.slot_name or slots.aliases on a content LEAF
           (no sgs-classed descendants): the element will never promote to its block
           — fidelity silently degrades. Suggests the closest known name.
  INFO   — same unknown element token on a WRAPPER (has sgs-classed descendants):
           legitimate per Spec 31 §2.4 (a slug-None wrapper folds or becomes its own
           container — e.g. a `__cards` grid wrapper), so informational only.
  WARN   — block segment is a NEAR-MISS of a real slug (edit distance <= 2, e.g.
           sgs-heros). A near-miss falls to sgs/container instead of the composite.
  INFO   — block segment matches no slug and no near-miss (legitimate: the section
           becomes sgs/container per FR-31-4 — the common case).
  INFO   — modifier is neither a variant value of the resolved block nor the
           `--active` state grammar (Spec 00 §3.4). Pattern-legal, but the pipeline's
           variant/state machinery will not read it.

Modes (matching bem-lint.py): strict (WARN+ fails, exit 1) | draft (report only).
"""

from __future__ import annotations

import argparse
import html.parser
import json
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Same canonical DB the converter reads (converter/db/db_lookup.py:35).
SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

_BEM_RE = re.compile(
    r"^sgs-(?P<block>[a-z][a-z0-9-]*?)"
    r"(?:__(?P<element>[a-z][a-z0-9-]*?))?"
    r"(?:--(?P<modifier>[a-z][a-z0-9-]*))?$"
)

# The documented draft-side state modifier (Spec 00 §3.4) — grammar, not DB data.
STATE_MODIFIERS = {"active"}


@dataclass
class Finding:
    severity: str  # ERROR | WARN | INFO
    line: int
    token: str
    message: str

    def as_dict(self):
        return self.__dict__


@dataclass
class Vocab:
    block_slugs: set = field(default_factory=set)        # bare slugs, no sgs/ prefix
    element_names: set = field(default_factory=set)      # slot_name + every alias
    variant_values: dict = field(default_factory=dict)   # bare slug -> {values}

    @classmethod
    def load(cls, db_path: Path) -> "Vocab":
        con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        try:
            v = cls()
            for (slug,) in con.execute("SELECT slug FROM blocks WHERE source='sgs'"):
                v.block_slugs.add(slug.removeprefix("sgs/"))
            for slot, aliases in con.execute("SELECT slot_name, aliases FROM slots"):
                v.element_names.add(slot.lower())
                if aliases:
                    try:
                        parsed = json.loads(aliases)
                    except (json.JSONDecodeError, TypeError):
                        parsed = [a.strip() for a in str(aliases).split(",")]
                    for a in parsed:
                        v.element_names.add(str(a).lower())
            for slug, value in con.execute(
                "SELECT block_slug, variant_value FROM variant_slots"
            ):
                v.variant_values.setdefault(slug.removeprefix("sgs/"), set()).add(value)
            return v
        finally:
            con.close()


def _edit_distance(a: str, b: str, cap: int = 3) -> int:
    """Small bounded Levenshtein — enough for near-miss detection."""
    if abs(len(a) - len(b)) > cap:
        return cap + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        if min(cur) > cap:
            return cap + 1
        prev = cur
    return prev[-1]


def _closest(token: str, candidates: set, max_dist: int = 2):
    best, best_d = None, max_dist + 1
    for c in candidates:
        d = _edit_distance(token, c, cap=max_dist)
        if d < best_d:
            best, best_d = c, d
    return (best, best_d) if best_d <= max_dist else (None, None)


_VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input",
              "link", "meta", "source", "track", "wbr"}


class _ClassCollector(html.parser.HTMLParser):
    """Collect (line, [sgs-* tokens], is_wrapper) per element.

    is_wrapper = the node has at least one sgs-classed DESCENDANT — the Spec 31
    §2.4 signal that an unknown element token is a structural wrapper (folds /
    becomes its own container) rather than a content leaf that fails to promote.
    """

    def __init__(self):
        super().__init__()
        self.nodes = []          # [line, tokens, has_sgs_descendant]
        self._stack = []         # indexes into self.nodes for open sgs-classed nodes

    def handle_starttag(self, tag, attrs):
        tokens = []
        for name, value in attrs:
            if name == "class" and value:
                tokens = [t for t in value.split() if t.startswith("sgs-")]
        if tokens:
            for idx in self._stack:
                if idx is not None:
                    self.nodes[idx][2] = True
            self.nodes.append([self.getpos()[0], tokens, False])
            if tag not in _VOID_TAGS:
                self._stack.append(len(self.nodes) - 1)
        elif tag not in _VOID_TAGS:
            self._stack.append(None)  # placeholder to keep depth alignment

    def handle_endtag(self, tag):
        if tag not in _VOID_TAGS and self._stack:
            self._stack.pop()


def lint_tokens(nodes, vocab: Vocab) -> list:
    findings = []
    for line, tokens, is_wrapper in nodes:
        roots_on_node = set()
        for token in tokens:
            m = _BEM_RE.match(token)
            if not m:
                continue  # shape violations are bem-lint.py's job, not ours
            block, element, modifier = m.group("block"), m.group("element"), m.group("modifier")
            block_known = block in vocab.block_slugs

            if element is None:
                roots_on_node.add(block)

            if not block_known:
                near, dist = _closest(block, vocab.block_slugs)
                if near and block != near:
                    findings.append(Finding(
                        "WARN", line, token,
                        f"block segment 'sgs-{block}' is a near-miss of the real slug "
                        f"'sgs-{near}' (edit distance {dist}) — it would fall to "
                        f"sgs/container instead of the composite. Use the exact slug "
                        f"or a clearly-different section name.",
                    ))
                elif element is None and modifier is None:
                    findings.append(Finding(
                        "INFO", line, token,
                        f"'sgs-{block}' matches no block slug — the section becomes "
                        f"sgs/container with children recursed (FR-31-4: legitimate "
                        f"and common; confirm it wasn't meant to be a composite).",
                    ))

            if element is not None and element.lower() not in vocab.element_names:
                near, _ = _closest(element.lower(), vocab.element_names)
                hint = f" Did you mean '__{near}'?" if near else ""
                if is_wrapper:
                    findings.append(Finding(
                        "INFO", line, token,
                        f"element '__{element}' is not a recognised slot, but the node "
                        f"wraps sgs-classed children — a structural wrapper folds or "
                        f"becomes its own container (Spec 31 §2.4), so this is fine.",
                    ))
                else:
                    findings.append(Finding(
                        "WARN", line, token,
                        f"element '__{element}' is not a recognised slot or alias — the "
                        f"content leaf will NOT promote to its block (styling-only).{hint} "
                        f"Vocabulary: slots table / sgs-draft-vocabulary.md §2.",
                    ))

            if modifier is not None and modifier not in STATE_MODIFIERS:
                block_variants = vocab.variant_values.get(block, set())
                if modifier not in block_variants:
                    known = ", ".join(sorted(block_variants)) if block_variants else "none"
                    findings.append(Finding(
                        "INFO", line, token,
                        f"modifier '--{modifier}' is neither a variant value of "
                        f"'sgs-{block}' (known: {known}) nor '--active' — pattern-legal "
                        f"styling, but the variant/state machinery won't read it.",
                    ))

        if len(roots_on_node) >= 2:
            findings.append(Finding(
                "ERROR", line, " ".join(sorted(roots_on_node)),
                f"node carries {len(roots_on_node)} DISTINCT block-root classes "
                f"({', '.join(sorted(roots_on_node))}) — recognition ambiguity goes "
                f"LOUD and the node falls back (FR-31-15). One block root per node.",
            ))
    return findings


def lint_file(path: Path, vocab: Vocab) -> list:
    collector = _ClassCollector()
    collector.feed(path.read_text(encoding="utf-8"))
    return lint_tokens(collector.nodes, vocab)


def _self_test() -> int:
    vocab = Vocab(
        block_slugs={"hero", "card-grid", "container", "product-card"},
        element_names={"headline", "body", "cta", "card"},
        variant_values={"hero": {"split", "video"}, "product-card": {"featured", "trial"}},
    )
    cases = [
        # (html, expected (severity, count) pairs)
        ('<div class="sgs-hero__headline">', []),
        ('<div class="sgs-heros">', [("WARN", 1)]),                       # near-miss slug
        ('<div class="sgs-gift-section">', [("INFO", 1)]),                # container default
        ('<div class="sgs-hero__main-words">', [("WARN", 1)]),            # unknown element, leaf
        ('<div class="sgs-hero__cards"><div class="sgs-hero__card"></div></div>',
         [("INFO", 1)]),                                                  # unknown element, wrapper (Spec 31 §2.4)
        ('<div class="sgs-hero sgs-card-grid">', [("ERROR", 1)]),         # two roots
        ('<div class="sgs-hero sgs-hero--split">', []),                   # root + own variant
        ('<div class="sgs-product-card__pill--active">', [("WARN", 1)]),  # pill unknown elem, --active OK
        ('<div class="sgs-hero--huge">', [("INFO", 1)]),                  # unknown modifier
    ]
    failures = 0
    for html_src, expected in cases:
        collector = _ClassCollector()
        collector.feed(html_src)
        found = lint_tokens(collector.nodes, vocab)
        got = sorted((f.severity for f in found))
        want = sorted(sev for sev, n in expected for _ in range(n))
        status = "PASS" if got == want else "FAIL"
        if status == "FAIL":
            failures += 1
        print(f"  [{status}] {html_src}  -> {got or 'clean'} (expected {want or 'clean'})")
    print(f"\n{len(cases) - failures}/{len(cases)} self-tests passed")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="SGS draft vocabulary lint — names vs the live framework DB."
    )
    parser.add_argument("path", nargs="?", type=Path, help="HTML draft to lint.")
    parser.add_argument("--mode", choices=("strict", "draft"), default="strict",
                        help="strict (WARN+ fails, default) or draft (report only).")
    parser.add_argument("--db", type=Path, default=SGS_DB,
                        help="Path to sgs-framework.db (default: the converter's DB).")
    parser.add_argument("--json", action="store_true", dest="output_json")
    parser.add_argument("--self-test", action="store_true", dest="self_test")
    args = parser.parse_args()

    if args.self_test:
        print("Running draft-vocab-lint self-tests...\n")
        return _self_test()

    if args.path is None:
        parser.print_help()
        return 1
    if not args.path.exists():
        print(f"Error: file not found: {args.path}", file=sys.stderr)
        return 1
    if not args.db.exists() or args.db.stat().st_size == 0:
        print(f"Error: framework DB missing/empty: {args.db}", file=sys.stderr)
        return 2

    findings = lint_file(args.path, Vocab.load(args.db))
    counts = {s: sum(1 for f in findings if f.severity == s) for s in ("ERROR", "WARN", "INFO")}

    if args.output_json:
        print(json.dumps({"file": str(args.path), "counts": counts,
                          "findings": [f.as_dict() for f in findings]}, indent=2))
    else:
        for f in findings:
            print(f"{f.severity:5s} line {f.line:4d}  {f.token}\n      {f.message}")
        print(f"\n{counts['ERROR']} error(s), {counts['WARN']} warning(s), "
              f"{counts['INFO']} info — {args.path.name}")

    if counts["ERROR"]:
        return 1
    if args.mode == "strict" and counts["WARN"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
