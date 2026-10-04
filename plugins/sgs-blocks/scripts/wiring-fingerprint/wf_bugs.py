"""Bug-class rules and the selector-shaped links.

  C1  child-conditional reader (Spec 32 FR-32-12, Bean 2026-10-04): every reader
      of the attribute's custom property, or the selector its PHP emits (directly or
      through a selector variable), reaches a cell only when the cell is one specific
      block (`… > .sgs-<block>`). Grid-cell defaults must style every direct cell
      whatever block it is. Exempt when the block's `allowedBlocks` admits only the
      blocks the readers name.
  B1  scope hash without context: a render.php derives its scoping uid from a hash
      of `$attributes` that omits `$block->context`, while a block-context value is
      written into the CSS it scopes with that uid (a declaration or custom property
      carries the value; a value that only decides whether a rule is emitted does
      not count), so two items with equal attributes under different parents share
      one uid and overwrite each other's rules.
  B2  root prefix orphaned: the block wires the shared typography helper for named
      prefixes, declares the root ('') family too, and the root family has no
      control or no front-end emission.
  B3  missing `__inner` depth: a PHP-emitted `> .sgs-<block>` selector has no twin
      at `> .sgs-<block>__inner > .sgs-<block>` depth although the block renders an
      `__inner` band, so the rule misses cells whenever the band is present.
  S1  editor.css shadowing: the front-end reader is a zero-specificity `:where()`
      rule and the block's editor stylesheet sets the same property on the cell,
      so the canvas never shows the setting.
"""
from __future__ import annotations

import re

from wf_css import CssIndex, specificity_zero
from wf_php import PhpText

ROOT_TYPO = ("fontSize", "fontWeight", "fontStyle", "lineHeight", "fontFamily", "letterSpacing", "textTransform", "textDecoration")
CONTEXT_READ_RE = re.compile(r"""\$block->context\[\s*['"]([^'"]+)['"]\s*\]""")
HASH_RE = re.compile(r"\$(\w+)\s*=\s*[^;]*?\b(?:md5|crc32|sha1|wp_hash|hash)\s*\(([^;]*);")


def child_conditional(cps: set[str], css: CssIndex, root_class_re: re.Pattern,
                      child_sel: set[str] = frozenset(), allowed: set[str] = frozenset()) -> bool:
    """True when every reader of every linked custom property (or a PHP-emitted
    `> .sgs-<block>` selector) reaches a cell only when the cell is one specific
    block. Exempt when the block's `allowedBlocks` admits only the blocks the
    readers name: then the reader reaches every possible cell."""
    subjects: set[str] = set(child_sel)
    if cps:
        for cp in cps:
            readers = css.cp_readers.get(cp, [])
            if not readers or cp in css.php_cp_readers or cp in css.js_cp_readers:
                return bool(child_sel) and not _all_cells(child_sel, allowed)
            for _f, sel in readers:
                for part in [s.strip() for s in sel.split(",") if s.strip()]:
                    p2 = re.sub(r":where\(\s*|\s*\)$", "", part).strip()
                    toks = [x for x in re.split(r"\s*[>+~]\s*|\s+", p2) if x]
                    m = root_class_re.search(toks[-1]) if len(toks) > 1 else None
                    if not m:
                        return bool(child_sel) and not _all_cells(child_sel, allowed)
                    subjects.add(m.group(1))
    return bool(subjects) and not _all_cells(subjects, allowed)


def _all_cells(subjects: set[str], allowed: set[str]) -> bool:
    """The block admits only children the reader names (`allowedBlocks` ⊆ subjects)."""
    return bool(allowed) and {a.split("/", 1)[-1] for a in allowed} <= set(subjects)


def scope_hash_bug(render_texts: list[PhpText], analyser) -> list[str]:
    """Context keys whose value reaches the scoped CSS of a render.php that hashes
    its uid from `$attributes` alone (empty when the rule does not apply)."""
    from wf_tokens import Channel

    hits: list[str] = []
    for t in render_texts:
        if "$block->context[" not in t.src:
            continue
        for m in HASH_RE.finditer(t.src):
            var, args = m.group(1), m.group(2)
            if "$attributes" not in args or "context" in args:
                continue
            if not re.search(r"""['"]\.['"]\s*\.\s*\$""" + var + r"""\b|\$""" + var + r"""\s*\.\s*['"]""", t.src):
                continue
            for cm in CONTEXT_READ_RE.finditer(t.src):
                ch = Channel()
                analyser.flow(t, [cm.start()], cm.group(1), ch)
                # The context value must change what the CSS says, not merely whether
                # a rule is emitted (a gate) or which helper runs.
                if ch.value_decl or ch.cps:
                    hits.append(cm.group(1))
    return sorted(set(hits))


def root_prefix_bug(declared: set[str], control: dict, root_emitted: bool, named_prefixes: set[str]) -> list[str]:
    """Root typography attributes left orphaned while named prefixes are wired."""
    roots = [a for a in ROOT_TYPO if a in declared]
    if len(roots) < 2 or not named_prefixes:
        return []
    return [a for a in roots if a not in control or not root_emitted]


def inner_depth_bug(child_sel: set[str], inner_sel: set[str], css: CssIndex) -> list[str]:
    return sorted(s for s in child_sel - inner_sel if css.has_class(f"sgs-{s}__inner"))


def editor_shadowing(cps: set[str], css: CssIndex) -> list[str]:
    """Properties whose zero-specificity front-end reader an editor rule overrides."""
    hits = set()
    for cp in cps:
        for f, sel in css.cp_readers.get(cp, []):
            if not specificity_zero(sel):
                continue
            body = next((b for ff, s, b in css.rules if ff == f and s == sel), "")
            props = {m.group(1) for m in re.finditer(r"([a-z-]+)\s*:\s*[^;]*var\(\s*" + re.escape(cp) + r"\b", body)}
            subjects = set()
            for part in sel.split(","):
                inner = re.sub(r":where\(\s*|\s*\)$", "", part.strip())
                last = re.split(r"\s*[>+~]\s*|\s+", inner)[-1]
                subjects |= set(re.findall(r"\.(sgs-[a-z0-9-]+)", last))
            for _ef, esel, ebody in css.editor_rules:
                if "where(" in esel:
                    continue
                elast = [re.split(r"\s*[>+~]\s*|\s+", p.strip())[-1] for p in esel.split(",") if p.strip()]
                if not any(set(re.findall(r"\.(sgs-[a-z0-9-]+)(?![\w-])", x)) & subjects for x in elast):
                    continue
                for p in props:
                    for ep in re.findall(r"(?:^|;)\s*([a-z-]+)\s*:", ebody.replace("\n", " ")):
                        if ep == p or ep.startswith(p + "-") or p.startswith(ep + "-"):
                            hits.add(p)
    return sorted(hits)
