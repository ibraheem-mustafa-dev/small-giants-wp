"""identity_markup -- the tags, ARIA roles and ARIA attributes each SGS block can print, followed through every source
(the reading half of `block_identity_facts.py`, plan `.claude/plans/2026-10-30-clone-recognition-fixes.md` F1 step A1).

Where a block's output comes from (every source is read; `identity_sources.py` traces them):
  - its render.php and partials, and every repo function, method or callback they reach (helpers, SGS_Container_Wrapper,
    WP_HTML_Tag_Processor rewriters), with each dynamic tag or role resolved where an allowlist, a block.json enum or the
    caller's literal settles it;
  - its save.js, and its view script with every repo module it imports;
  - every `render_block` filter in sgs-blocks, the theme and the other SGS plugins, applied by the key or name it checks
    (`Extractor.applies`: proven, possible or not at all);
  - the motion effect modules it qualifies for (`generated-fx-qualifying-blocks.json`);
  - every block it renders inside itself (`'blockName' => 'sgs/x'`, `<!-- wp:sgs/x`), whose facts it holds too.
`Markup.yes` holds what a proven source prints, `possible` what a source that may apply prints, `unknown_all` the reasons
a fact cannot be closed (an untraced dynamic site, WooCommerce or core markup, an npm module, an unread filter).
"""
from __future__ import annotations

import json
from functools import lru_cache
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import identity_scan as S  # noqa: E402
import identity_sources as I  # noqa: E402
import identity_pinned as P  # noqa: E402
from identity_values import MARKUP, ValueReader, _code_text, _js_code, _norm, _resolve_js, _valid_for  # noqa: E402,F401
from block_source_files import edit_files, render_files  # noqa: E402

PLUGIN = HERE.parents[1]
REPO = PLUGIN.parents[1]
BLOCKS = PLUGIN / "src" / "blocks"


@dataclass
class Paths:
    repo: Path = REPO
    blocks: Path = BLOCKS
    php_roots: list = field(default_factory=lambda: [
        PLUGIN / "includes", PLUGIN / "src", PLUGIN / "sgs-blocks.php", REPO / "theme" / "sgs-theme",
        *[p for p in sorted((REPO / "plugins").iterdir()) if p.is_dir() and p.name != "sgs-blocks"],
    ])
    roster: Path = BLOCKS / "extensions" / "extension-roster.json"
    qualifying: Path = BLOCKS / "extensions" / "generated-fx-qualifying-blocks.json"
    brands: Path = PLUGIN / "includes" / "data" / "brand-registry.json"
    decisions: Path = REPO / "scripts" / "computed-route" / "data" / "skeleton-decisions.json"
    live: Path = REPO / "scripts" / "computed-route" / "data" / "block-live-facts.json"
    core: Path = PLUGIN / "scripts" / "data" / "core-markup-facts.json"
    plugin: Path = PLUGIN


@dataclass
class DbInputs:
    """What the facts read from the framework DB (each table seeded from code earlier in the same run)."""
    icon_kinds: list            # roles named icon-<kind>
    icon_fields: dict           # slug -> [(field label, role)]
    source_enums: dict          # slug -> [(attr, [values])]: enum-mode attributes
    fx: dict                    # effect -> {requires, triggers, plugin_set}
    allowed: dict = field(default_factory=dict)  # slug -> [allowed inner block names] (block_composition), None = any


def load_db_inputs(conn: sqlite3.Connection) -> DbInputs:
    kinds = sorted(r[0][len("icon-"):] for r in conn.execute("SELECT role_name FROM roles WHERE role_name LIKE 'icon-%'")
                   if r[0] != "icon-slug")
    fields: dict = {}
    for slug, attr, role in conn.execute("SELECT block_slug, attr_name, role FROM block_attributes WHERE role = 'icon' "
                                         "OR role = 'icon-slug' OR role LIKE 'icon-%' ORDER BY 1, 2"):
        fields.setdefault(slug, []).append((attr, role))
    for slug, arr, key, role in conn.execute("SELECT block_slug, array_attr, field_key, role FROM array_item_schema "
                                             "WHERE role LIKE 'icon%' ORDER BY 1, 2, 3"):
        fields.setdefault(slug, []).append((f"{arr}.{key}", role))
    enums: dict = {}
    for slug, attr, vals in conn.execute("SELECT block_slug, attr_name, enum_values FROM block_attributes "
                                         "WHERE role = 'enum-mode' AND enum_values IS NOT NULL ORDER BY 1, 2"):
        try:
            enums.setdefault(slug, []).append((attr, json.loads(vals)))
        except ValueError:
            continue
    fx = {}
    for effect, requires, triggers, plugin_set in conn.execute("SELECT effect, requires, triggers, plugin_set FROM fx_effects"):
        fx[effect] = {"requires": requires or "", "triggers": [t for t in (triggers or "").split(",") if t],
                      "plugin_set": json.loads(plugin_set or "[]")}
    allowed = {}
    for slug, raw in conn.execute("SELECT block_slug, accepts_allowed_blocks FROM block_composition"):
        try:
            allowed[slug] = json.loads(raw) if raw else None
        except ValueError:
            allowed[slug] = None
    return DbInputs(kinds, fields, enums, fx, allowed)


# ---------------------------------------------------------------------------------------------------------------------
# Per-block markup reading
# ---------------------------------------------------------------------------------------------------------------------

@dataclass
class Markup:
    yes: dict = field(default_factory=lambda: {f: {} for f in MARKUP})        # fact -> value -> evidence
    possible: dict = field(default_factory=lambda: {f: {} for f in MARKUP})   # printed by a source that may apply
    unknown_all: dict = field(default_factory=lambda: {f: [] for f in MARKUP})  # fact -> [reason]
    unknown_vals: dict = field(default_factory=lambda: {f: {} for f in MARKUP})
    sources: list = field(default_factory=list)
    js_code: str = ""          # the view scripts' code (literals quoted), for the behaviour facts
    js_outside: list = field(default_factory=list)
    render_lits: set = field(default_factory=set)


class Extractor(ValueReader):
    def __init__(self, paths: Paths | None = None, db: DbInputs | None = None):
        self.p = paths or Paths()
        self.db = db
        self.block_json: dict[str, dict] = {}
        self.block_dir: dict[str, Path] = {}
        for bj in sorted(self.p.blocks.glob("*/block.json")):
            data = I.load_json(bj)
            if data.get("name"):
                self.block_json[data["name"]] = data
                self.block_dir[data["name"]] = bj.parent
        self.qualifying = I.load_json(self.p.qualifying) if self.p.qualifying.is_file() else {}
        effects = frozenset(e for v in self.qualifying.values() for e in v)
        self.index = I.RepoIndex(self.p.repo, [r for r in self.p.php_roots if r.exists()], self.p.blocks, self.p.blocks.parent, effects)
        self.roster = (I.load_json(self.p.roster).get("extensions") or []) if self.p.roster.is_file() else []
        self._markup: dict[str, Markup] = {}
        self._scan_cache: dict[str, S.Scan] = {}
        self.core = P.load_core(self.p.core)
        self._js_callers = ""
        self._core_version = (self.core.get("_meta") or {}).get("wordpress", "")

    def _npm(self, spec: str):
        return P.npm_file(spec, self.p.plugin)

    # -- applicability -------------------------------------------------------------------------------------------------
    def _holds_attr(self, slug: str, attr: str) -> bool:
        bj = self.block_json[slug]
        if attr in (bj.get("attributes") or {}):
            return True
        supports = bj.get("supports") or {}
        if attr == "anchor" and supports.get("anchor"):
            return True
        return any(attr in (ext.get("attributes") or {}) and _extension_applies(ext.get("rule") or {}, bj) for ext in self.roster)

    def applies(self, flt: I.Filter, slug: str) -> str:
        """'proven', 'possible' or 'no' for a filter and a block. A gate read only from a function the callback calls
        gives at most 'possible'."""
        how = self._applies(flt, slug)
        return "possible" if how == "proven" and flt.via_callee else how

    def _applies(self, flt: I.Filter, slug: str) -> str:
        bj = self.block_json[slug]
        sup = bj.get("supports") or {}
        if flt.gate == "names":
            return "proven" if slug in flt.names else "no"
        if flt.gate == "supports":
            for path, value in flt.supports:
                node = sup
                for k in path:
                    node = node.get(k) if isinstance(node, dict) else None
                if (value is None and node) or (value is not None and isinstance(node, list) and value in node):
                    return "proven"
            return "no"
        if flt.gate == "effects":
            return "proven" if set(self.qualifying.get(slug, [])) & flt.attrs else "no"
        if flt.gate == "attrs":
            held = [a for a in flt.attrs if self._holds_attr(slug, a)]
            return "proven" if held and len(held) == len(flt.attrs) else "possible" if held else "no"
        if flt.gate == "all-sgs":
            return "proven" if slug.startswith("sgs/") else "no"
        return "possible"

    # -- scanning ------------------------------------------------------------------------------------------------------
    def _scan_unit(self, u: I.Unit, jsx: bool = False) -> S.Scan:
        key = f"{u.key}@{u.start}"
        if key not in self._scan_cache:
            self._scan_cache[key] = S.scan(self.index.unit_tokens(u), jsx=jsx)
        return self._scan_cache[key]

    def _snippet(self, f: Path, pos: int) -> str:
        text = self.index.text(f)
        line = text[text.rfind("\n", 0, pos) + 1: text.find("\n", pos) if text.find("\n", pos) != -1 else len(text)]
        return re.sub(r"\s+", " ", line.strip())[:90]

    def _absorb_units(self, m: Markup, units: list, exts: dict, slug: str, bucket: str, label: str) -> None:
        """Fold the writes of a set of PHP units into a block's markup record (`bucket` 'yes' or 'possible')."""
        target = m.yes if bucket == "yes" else m.possible
        for u in units:
            sc = self._scan_unit(u)
            for fact, found in (("renders-tag", sc.tags), ("renders-role", sc.roles), ("renders-aria", sc.arias)):
                for value, pos in found.items():
                    _put(target[fact], value, f"{label}{u.key} \"{self._snippet(u.file, pos)}\"")
            for d in sc.dyn:
                values = self.resolve(d, u, units, slug)
                where = f"{label}{u.key} \"{self._snippet(u.file, d.pos)}\""
                if values is None:
                    m.unknown_all[d.fact].append(f"untraced dynamic {d.fact[8:]} ({d.note}{': ' + d.expr if d.expr else ''}) at {where}")
                else:
                    for v in values:
                        _put(target[d.fact], v, f"{where} (resolved: {', '.join(sorted(values))})")
            for sink in sc.sinks:
                self._content(m, sink, u, units, slug, target, label)
            if bucket == "yes":
                for name, pos in sc.nested.items():
                    self._nested(m, slug, name, f"{u.key} \"{self._snippet(u.file, pos)}\"")
                for pos in sc.nested_dyn:
                    for fact in MARKUP:
                        m.unknown_all[fact].append(f"a block rendered from a variable name at {u.key} \"{self._snippet(u.file, pos)}\"")
        for name, (ukey, pos, f) in exts.items():
            if name in I.CORE_SUPPORT_CALLS:
                node = self.block_json[slug].get("supports") or {}
                for key in I.CORE_SUPPORT_CALLS[name]:
                    node = node.get(key) if isinstance(node, dict) else None
                if node:
                    for fact in MARKUP:
                        m.unknown_all[fact].append(f"WordPress core block support ({name}) at {label}{ukey}; read live in A2b")
                continue
            if name == I.CORE_WRAPPER:
                m.unknown_vals["renders-aria"].setdefault("aria-label", f"WordPress core block supports (get_block_wrapper_attributes) at {ukey}; read live in A2b")
                continue
            origin = "WooCommerce" if (I.WOO_CALL.match(name) or name.startswith(("->", "do_action"))) else "WordPress core"
            rec = (self.core.get("functions") or {}).get(name) if origin == "WordPress core" else None
            if rec and not rec.get("unknown"):
                for fact, key in (("renders-tag", "tags"), ("renders-role", "roles"), ("renders-aria", "aria")):
                    for v in rec.get(key, []):
                        _put(target[fact], v, f"{label}{ukey} calls {name}: {rec['evidence']} (scripts/data/core-markup-facts.json)")
                continue
            why = f": {rec['unknown']}" if rec else ""
            for fact in MARKUP:
                m.unknown_all[fact].append(f"{origin} markup ({name}{why}) at {label}{ukey}; read live in A2b")

    # -- inner blocks -------------------------------------------------------------------------------------------------
    def inner_blocks(self, slug: str) -> tuple[bool, list | None, list]:
        """Whether the block prints its inner blocks (its editor offers InnerBlocks or its save keeps them, and its render
        reads `$content` or `$block->inner_blocks`), the blocks it allows inside (block_composition.accepts_allowed_blocks, else block.json
        `allowedBlocks`; None = any block), and the blocks its editor template inserts."""
        bdir, bj = self.block_dir[slug], self.block_json[slug]
        code = "".join(t.text for f in render_files(bdir) for t in self.index.tokens(f) if t.kind == "code")
        save = bdir / "save.js"
        saved = save.is_file() and re.search(r"InnerBlocks\.Content|useInnerBlocksProps\.save", save.read_text(encoding="utf-8", errors="replace"))
        edit_text = "\n".join(f.read_text(encoding="utf-8", errors="replace") for f in edit_files(bdir))
        # Inner blocks exist only where the editor offers them; the render prints them when it reads them.
        offers = bool(saved) or bool(re.search(r"\bInnerBlocks\b|useInnerBlocksProps", edit_text))
        prints = offers and bool(re.search(r"\$content\b|->\s*inner_blocks\b", code))
        allowed = (self.db.allowed if self.db else {}).get(slug, None) if self.db and slug in self.db.allowed else bj.get("allowedBlocks")
        if allowed is None and isinstance(bj.get("allowedBlocks"), list):
            allowed = bj["allowedBlocks"]
        template = []
        for m in re.finditer(r"\btemplate\s*(?::|=\s*\{)\s*([A-Z_][A-Z0-9_]*|\[)", edit_text):
            start = m.end() - 1 if m.group(1) == "[" else None
            if start is None:
                d = re.search(r"\b" + re.escape(m.group(1)) + r"\s*=\s*\[", edit_text)
                start = d.end() - 1 if d else None
            if start is None:
                continue
            depth, j = 0, start
            while j < len(edit_text):
                depth += {"[": 1, "]": -1}.get(edit_text[j], 0)
                if depth == 0:
                    break
                j += 1
            template += re.findall(r"['\"]([a-z][a-z0-9-]*/[a-z][a-z0-9-]*)['\"]", edit_text[start:j])
        return prints, allowed, sorted(set(template))

    def fold_children(self) -> None:
        """Credit each block with what the blocks it may hold can print, followed through every level until nothing
        changes: a block that prints its inner blocks can show every fact its allowed children (or, when it accepts any
        block, its template's children) show, with the child named in the evidence; one that accepts any block leaves
        every value its own markup and children do not settle `unknown`."""
        if getattr(self, "_folded", False):
            return
        self._folded = True
        kids: dict = {}
        for slug in sorted(self.block_json):
            self.markup(slug)
            prints, allowed, template = self.inner_blocks(slug)
            if prints:
                kids[slug] = (allowed, template)
        for slug, (allowed, template) in kids.items():
            m = self._markup[slug]
            if allowed is None:
                why = f"inner blocks: {slug} prints its inner blocks and accepts any block"
                for fact in MARKUP:
                    m.unknown_all[fact].append(why)
            m.sources.append("inner blocks " + ("any block" if allowed is None else ", ".join(allowed) or "none")
                             + (f" (template {', '.join(template)})" if template else ""))
        changed = True
        while changed:
            changed = False
            for slug, (allowed, template) in kids.items():
                m = self._markup[slug]
                for child in (allowed if allowed is not None else template):
                    if child == slug:
                        continue
                    if child not in self.block_json:
                        why = f"inner block {child} (outside the repo); read live in A2b"
                        for fact in MARKUP:
                            if why not in m.unknown_all[fact]:
                                m.unknown_all[fact].append(why)
                                changed = True
                        continue
                    cm = self._markup[child]
                    for fact in MARKUP:
                        for v, ev in cm.yes[fact].items():
                            cur = m.yes[fact].get(v)
                            # A child's own structure is better evidence than content another child may carry.
                            if cur is None or ("content a setting holds" in cur and "content a setting holds" not in ev
                                               and cur.startswith("inner block")):
                                m.yes[fact][v] = f"inner block {child}: {_strip_inner(ev)}"[:600]
                                changed = True
                        for v, ev in cm.possible[fact].items():
                            if v not in m.possible[fact] and v not in m.yes[fact]:
                                m.possible[fact][v] = f"inner block {child}: {_strip_inner(ev)}"[:600]
                                changed = True
                        for v, ev in cm.unknown_vals[fact].items():
                            if v not in m.unknown_vals[fact]:
                                m.unknown_vals[fact][v] = f"inner block {child}: {_strip_inner(ev)}"[:600]
                                changed = True
                        have = {_strip_inner(r) for r in m.unknown_all[fact]}
                        for r in cm.unknown_all[fact]:
                            if _strip_inner(r) not in have:
                                m.unknown_all[fact].append(f"inner block {child}: {_strip_inner(r)}"[:600])
                                have.add(_strip_inner(r))
                                changed = True

    def _nested(self, m: Markup, slug: str, name: str, where: str) -> None:
        if name == slug:
            return
        if name in self.block_json:
            inner = self.markup(name)
            for fact in MARKUP:
                for v, ev in inner.yes[fact].items():
                    m.yes[fact].setdefault(v, f"nested {name}: {ev}")
                for v, ev in inner.possible[fact].items():
                    m.possible[fact].setdefault(v, f"nested {name}: {ev}")
                m.unknown_all[fact].extend(f"nested {name}: {r}" for r in inner.unknown_all[fact][:3])
                for v, ev in inner.unknown_vals[fact].items():
                    m.unknown_vals[fact].setdefault(v, f"nested {name}: {ev}")
            m.js_code += "\n" + inner.js_code
            m.js_outside.extend(inner.js_outside)
            m.sources.append(f"nested {name}")
        else:
            for fact in MARKUP:
                m.unknown_all[fact].append(f"nested {name} (outside the repo) at {where}; read live in A2b")

    def markup(self, slug: str) -> Markup:
        if slug in self._markup:
            return self._markup[slug]
        m = Markup()
        self._markup[slug] = m  # a nesting cycle reads the partial record, never recurses
        bdir, bj = self.block_dir[slug], self.block_json[slug]
        roots = [self.index.file_unit(f) for f in render_files(bdir)]
        units, exts = self.index.closure(roots)
        m.sources.append(f"render ({len(roots)} file(s), {len(units)} unit(s) reached)")
        for u in units:
            for t in self.index.unit_tokens(u):
                if t.kind == "lit":
                    m.render_lits.add(t.text)
        self._absorb_units(m, units, exts, slug, "yes", "")
        save = bdir / "save.js"
        if save.is_file():
            sc = S.scan(S.js_tokens(save.read_text(encoding="utf-8", errors="replace")), jsx=True)
            self._absorb_scan(m, sc, f"{self.index.rel(save)}", save)
        files, outside = [], []
        for entry in I.view_entries(bdir, bj):
            fs, out = I.js_closure(entry, self.index.modules, self.p.blocks.parent, self._npm)
            files += fs
            outside += out
        self._absorb_js(m, files, outside, "yes", "")
        own = [f for f in files if "node_modules" not in f.parts]
        m.js_code += "\n".join(_code_text(S.js_tokens(f.read_text(encoding="utf-8", errors="replace"))) for f in own)
        # A package moves things its own way: the behaviour facts never read it as absence.
        m.js_outside += outside + sorted({_package_of(f) for f in files if "node_modules" in f.parts})
        m.sources.append(f"view script ({len(files)} file(s))")
        for flt in self.index.filters:
            how = self.applies(flt, slug)
            if how == "no" or flt.unit is None and how == "possible":
                if flt.unit is None and how != "no":
                    for fact in MARKUP:
                        m.unknown_all[fact].append(f"a render_block filter whose callback is not read: {flt.evidence}")
                continue
            if flt.unit is None:
                continue
            f_units, f_exts = self.index.closure([flt.unit])
            self._absorb_units(m, f_units, f_exts, slug, "yes" if how == "proven" else "possible", f"filter {flt.hook} ({flt.gate}) ")
            m.sources.append(f"filter {flt.unit.key} ({how})")
        for effect in self.qualifying.get(slug, []):
            mod = self.index.modules.get(f"@sgs/fx-{effect}")
            if mod is None:
                if f"@sgs/fx-{effect}" in self.index.modules:
                    for fact in MARKUP:
                        m.unknown_all[fact].append(f"motion effect {effect}: module @sgs/fx-{effect} is vendor code")
                continue
            fs, out = I.js_closure(mod, self.index.modules, self.p.blocks.parent, self._npm)
            self._absorb_js(m, fs, out, "yes", f"motion effect {effect}: ")
        m.sources.append(f"motion effects ({len(self.qualifying.get(slug, []))})")
        return m

    def _absorb_scan(self, m: Markup, sc: S.Scan, label: str, f: Path, bucket: str = "yes") -> None:
        target = m.yes if bucket == "yes" else m.possible
        text = f.read_text(encoding="utf-8", errors="replace")
        for fact, found in (("renders-tag", sc.tags), ("renders-role", sc.roles), ("renders-aria", sc.arias)):
            for value, pos in found.items():
                _put(target[fact], value, f"{label} \"{_line(text, pos)}\"")
        for d in sc.dyn:
            if "node_modules" in f.parts and d.note.startswith("an attribute named by a variable"):
                # A package writes the attribute names its caller hands it (GSAP's attr tweens): the repo callers' own
                # literal keys, read as writes here.
                keys = set(re.findall(r"'(aria-[a-z]+)'\s*:", self._js_callers))
                for v in (keys & S.ARIA_ATTRS) if d.fact == "renders-aria" else set():
                    _put(target[d.fact], v, f"{label} \"{_line(text, d.pos)}\" (a name a repo caller passes)")
                if d.fact == "renders-role" and re.search(r"(?<![\w$.-])'?role'?\s*:", self._js_callers):
                    m.unknown_all[d.fact].append(f"{label}: a repo caller passes a role to it")
                continue
            values = _resolve_js(d, text, self._js_callers) if f.suffix in (".js", ".mjs") else None
            if values:
                for v in values:
                    _put(target[d.fact], v, f"{label} \"{_line(text, d.pos)}\" (resolved: {', '.join(sorted(values))})")
                continue
            m.unknown_all[d.fact].append(f"untraced dynamic {d.fact[8:]} ({d.note}{': ' + d.expr if d.expr else ''}) at {label} \"{_line(text, d.pos)}\"")
        for name, pos in sc.nested.items():
            self._nested(m, "", name, f"{label} \"{_line(text, pos)}\"")

    def _absorb_js(self, m: Markup, files: list, outside: list, bucket: str, label: str) -> None:
        # The repo files of this closure: where an option a package reads (`tag:`) is passed.
        self._js_callers = "\n".join(_js_code(f.read_text(encoding="utf-8", errors="replace"))
                                      for f in files if "node_modules" not in f.parts)
        for f in files:
            sc = _js_scan(f)
            self._absorb_scan(m, sc, f"{label}{self.index.rel(f)}", f, bucket)
        for spec in outside:
            for fact in MARKUP:
                m.unknown_all[fact].append(f"{label}imports {spec} (outside the repo)")

def _extension_applies(rule: dict, block_json: dict) -> bool:
    """The roster predicate of `sgs-update-v2.py::_extension_applies` (kept equal by `--self-test`)."""
    supports = block_json.get("supports") or {}
    sgs = supports.get("sgs") or {}
    class_ok = supports.get("className") is not False
    hidden = bool(rule.get("hideSlug")) and rule["hideSlug"] in (sgs.get("hideExtensions") or [])
    mode = rule.get("mode")
    if mode == "allowlist":
        return rule.get("enabledSlug") in (sgs.get("enabledExtensions") or []) and (class_ok or not rule.get("requiresClassName"))
    if mode == "universal":
        return not hidden and (class_ok or not rule.get("requiresClassName"))
    if mode == "denylist":
        return not hidden and str(block_json.get("name", "")).startswith("sgs/")
    if mode == "flag":
        return bool(sgs.get(rule.get("flag")))
    return False


def _put(bucket: dict, value: str, evidence: str) -> None:
    """Record a write; the block's own markup replaces a record that only content a setting holds gave."""
    if value not in bucket or bucket[value].startswith("content a setting holds"):
        bucket[value] = evidence


def _line(text: str, pos: int) -> str:
    a = text.rfind("\n", 0, pos) + 1
    b = text.find("\n", pos)
    return re.sub(r"\s+", " ", text[a: b if b != -1 else len(text)].strip())[:90]


@lru_cache(maxsize=None)
def _js_scan(f: Path) -> S.Scan:
    return S.scan(S.js_tokens(f.read_text(encoding="utf-8", errors="replace")))


def _strip_inner(text: str) -> str:
    """Evidence without its `inner block <name>: ` prefixes (a chain through several levels names the nearest child)."""
    return re.sub(r"^(?:inner block [a-z0-9-]+/[a-z0-9-]+: )+", "", text)


def _package_of(f: Path) -> str:
    parts = f.parts[f.parts.index("node_modules") + 1:]
    return "/".join(parts[:2]) if parts and parts[0].startswith("@") else (parts[0] if parts else "")
