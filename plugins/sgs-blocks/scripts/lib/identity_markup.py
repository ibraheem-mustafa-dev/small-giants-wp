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
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import identity_scan as S  # noqa: E402
import identity_sources as I  # noqa: E402
from block_source_files import render_files  # noqa: E402

PLUGIN = HERE.parents[1]
REPO = PLUGIN.parents[1]
BLOCKS = PLUGIN / "src" / "blocks"
MARKUP = ("renders-tag", "renders-role", "renders-aria")


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


@dataclass
class DbInputs:
    """What the facts read from the framework DB (each table seeded from code earlier in the same run)."""
    icon_kinds: list            # roles named icon-<kind>
    icon_fields: dict           # slug -> [(field label, role)]
    source_enums: dict          # slug -> [(attr, [values])]: enum-mode attributes
    fx: dict                    # effect -> {requires, triggers, plugin_set}


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
    return DbInputs(kinds, fields, enums, fx)


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


class Extractor:
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
                    target[fact].setdefault(value, f"{label}{u.key} \"{self._snippet(u.file, pos)}\"")
            for d in sc.dyn:
                values = self.resolve(d, u, units, slug)
                where = f"{label}{u.key} \"{self._snippet(u.file, d.pos)}\""
                if values is None:
                    m.unknown_all[d.fact].append(f"untraced dynamic {d.fact[8:]} ({d.note}{': ' + d.expr if d.expr else ''}) at {where}")
                else:
                    for v in values:
                        target[d.fact].setdefault(v, f"{where} (resolved: {', '.join(sorted(values))})")
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
            for fact in MARKUP:
                m.unknown_all[fact].append(f"{origin} markup ({name}) at {label}{ukey}; read live in A2b")

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
            fs, out = I.js_closure(entry, self.index.modules, self.p.blocks.parent)
            files += fs
            outside += out
        self._absorb_js(m, files, outside, "yes", "")
        m.js_code += "\n".join(_code_text(S.js_tokens(f.read_text(encoding="utf-8", errors="replace"))) for f in files)
        m.js_outside += outside
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
            fs, out = I.js_closure(mod, self.index.modules, self.p.blocks.parent)
            self._absorb_js(m, fs, out, "yes", f"motion effect {effect}: ")
        m.sources.append(f"motion effects ({len(self.qualifying.get(slug, []))})")
        return m

    def _absorb_scan(self, m: Markup, sc: S.Scan, label: str, f: Path, bucket: str = "yes") -> None:
        target = m.yes if bucket == "yes" else m.possible
        text = f.read_text(encoding="utf-8", errors="replace")
        for fact, found in (("renders-tag", sc.tags), ("renders-role", sc.roles), ("renders-aria", sc.arias)):
            for value, pos in found.items():
                target[fact].setdefault(value, f"{label} \"{_line(text, pos)}\"")
        for d in sc.dyn:
            m.unknown_all[d.fact].append(f"untraced dynamic {d.fact[8:]} ({d.note}{': ' + d.expr if d.expr else ''}) at {label} \"{_line(text, d.pos)}\"")
        for name, pos in sc.nested.items():
            self._nested(m, "", name, f"{label} \"{_line(text, pos)}\"")

    def _absorb_js(self, m: Markup, files: list, outside: list, bucket: str, label: str) -> None:
        for f in files:
            sc = S.scan(S.js_tokens(f.read_text(encoding="utf-8", errors="replace")))
            self._absorb_scan(m, sc, f"{label}{self.index.rel(f)}", f, bucket)
        for spec in outside:
            for fact in MARKUP:
                m.unknown_all[fact].append(f"{label}imports {spec} (outside the repo)")

    # -- dynamic value resolution --------------------------------------------------------------------------------------
    def resolve(self, d: S.Dyn, unit: I.Unit, closure: list, slug: str, depth: int = 0) -> set | None:
        valid = _valid_for(d.fact)
        if valid is None:
            return None
        var = re.search(r"\$([A-Za-z_]\w*)", d.expr or "")
        if not var:
            return None
        return self._resolve_var(var.group(1), unit, closure, slug, valid, depth)

    def _resolve_var(self, var: str, unit: I.Unit, closure: list, slug: str, valid, depth: int) -> set | None:
        if depth > 4:
            return None
        toks = self.index.unit_tokens(unit)
        values: set = set()
        resolved = True
        found = False
        allow: set | None = None
        for k, t in enumerate(toks):
            if t.kind != "code":
                continue
            for am in re.finditer(r"in_array\s*\(\s*\$" + re.escape(var) + r"\s*,\s*(\$\w+|array\s*\(|\[)?", t.text):
                allow = (allow or set()) | self._allowlist(toks, k, am, unit, valid)
            for am in re.finditer(r"\$" + re.escape(var) + r"\s*(?:\?\?)?=(?![=>])", t.text):
                found = True
                rhs = _rhs(toks, k, am.end())
                got = self._rhs_values(rhs, unit, closure, slug, valid, depth, var)
                if got is None:
                    resolved = False
                else:
                    values |= got
        if not found and allow is None:
            return None  # a parameter or a value set elsewhere: not settled here
        if allow is not None:
            return values & allow if resolved else allow
        return values if resolved else None

    def _allowlist(self, toks, k, am, unit, valid) -> set:
        out: set = set()
        if am.group(1) and am.group(1).startswith("$"):
            name = am.group(1)[1:]
            for j, t in enumerate(toks):
                if t.kind == "code" and re.search(r"\$" + re.escape(name) + r"\s*=(?![=>])", t.text):
                    for x in _rhs(toks, j, re.search(r"\$" + re.escape(name) + r"\s*=(?![=>])", t.text).end()):
                        if x.kind == "lit" and valid(x.text):
                            out.add(_norm(x.text))
            return out
        for x in _rhs(toks, k, am.end(), stop=")"):
            if x.kind == "lit" and valid(x.text):
                out.add(_norm(x.text))
        return out

    def _rhs_values(self, rhs: list, unit: I.Unit, closure: list, slug: str, valid, depth: int, var: str) -> set | None:
        """The values an assignment's right-hand side can give, or None when any part of it is not settled: a call to
        code outside the repo that is not a sanitiser, a property, an array read by a computed key, or a variable that
        cannot be resolved. A sanitiser passes its argument through (`esc_attr( $tag )`); a repo function gives what it
        returns; a ternary's condition gives nothing. A capture of a regular-expression match inside a rewriter
        (`$m[1]` under preg_replace_callback) re-prints a tag the content already holds and adds no value."""
        full = " ".join(t.text if t.kind == "code" else "'" + t.text.replace("'", "") + "'" for t in rhs)
        code = " ".join(t.text if t.kind == "code" else "'" + t.text.replace("'", "") + "'" for t in _branches(rhs))
        out: set = set()
        for cm in list(re.finditer(r"(?<![\w$>:])([A-Za-z_]\w*)\s*\(", code)):
            name = cm.group(1)
            if name in I.PHP_KEYWORDS or name in _PASS:
                continue
            if name in self.index.functions:
                got = self._returns(name, closure, slug, valid, depth)
                if got is None:
                    return None
                out |= got
            elif name not in _PURE:
                return None
        code = _drop_call_args(code)
        if re.search(r"->\s*\w+", code):
            return None
        for lm in re.finditer(r"'([^']*)'(\s*\.)?", code):
            if valid(lm.group(1)):
                out.add(_norm(lm.group(1)))
            elif lm.group(1) == "h" and lm.group(2):
                out |= {f"h{n}" for n in range(1, 7)}
        for am in re.finditer(r"\$attributes\s*\[\s*'([^']+)'", code):
            enum = ((self.block_json[slug].get("attributes") or {}).get(am.group(1)) or {}).get("enum")
            if enum and all(valid(str(e)) or e == "" for e in enum):
                out |= {_norm(str(e)) for e in enum if e}
            elif "in_array" not in full:
                return None
        rewriter = re.search(r"preg_replace_callback|preg_match", self.index.masked(unit.file)[unit.start:unit.end])
        for am in re.finditer(r"\$(?!attributes\b|this\b)([A-Za-z_]\w*)\s*\[\s*([^\]]*)\]", code):
            key = am.group(2).strip()
            if re.fullmatch(r"\d+", key) and rewriter:
                continue
            if not re.fullmatch(r"'[^']+'", key):
                return None
            got = self._caller_key(key.strip("'"), closure, slug, valid, depth)
            if got is None:
                return None
            out |= got
        for am in re.finditer(r"\$([A-Za-z_]\w*)\b(?!\s*\[)", code):
            name = am.group(1)
            if name in (var, "attributes", "this", "block", "content"):
                continue
            got = self._resolve_var(name, unit, closure, slug, valid, depth + 1)
            if got is None:
                return None
            out |= got
        return out

    def _returns(self, name: str, closure: list, slug: str, valid, depth: int) -> set | None:
        """The values a repo function returns (each `return` read as an assignment's right-hand side)."""
        if depth > 4:
            return None
        out: set = set()
        for fu in self.index.functions[name]:
            toks = self.index.unit_tokens(fu)
            for k, t in enumerate(toks):
                if t.kind != "code":
                    continue
                for rm in re.finditer(r"\breturn\b", t.text):
                    got = self._rhs_values(_rhs(toks, k, rm.end()), fu, closure, slug, valid, depth + 1, "")
                    if got is None:
                        return None
                    out |= got
        return out or None

    def _caller_key(self, key: str, closure: list, slug: str, valid, depth: int) -> set | None:
        """Values the block's own code passes for an options key (`'tag' => 'details'`)."""
        out: set = set()
        hit = False
        for u in closure:
            toks = self.index.unit_tokens(u)
            for k, t in enumerate(toks):
                if t.kind == "lit" and t.text == key and k + 1 < len(toks) and toks[k + 1].kind == "code" \
                        and re.match(r"\s*=>\s*$", toks[k + 1].text):
                    hit = True
                    nxt = toks[k + 2] if k + 2 < len(toks) else None
                    if nxt is not None and nxt.kind == "lit" and valid(nxt.text):
                        out.add(_norm(nxt.text))
                    else:
                        expr = re.match(r"\s*=>\s*(\$[A-Za-z_]\w*)", toks[k + 1].text + (nxt.text if nxt and nxt.kind == "code" else ""))
                        got = self._resolve_var(expr.group(1)[1:], u, closure, slug, valid, depth + 1) if expr else None
                        if got is None:
                            return None
                        out |= got
        return out if hit else None


# Calls whose argument is the value (a sanitiser or case change passes a tag through), and calls that give no tag or
# role of their own (a test, a count, a number).
_PASS = frozenset("esc_attr esc_html tag_escape sanitize_key sanitize_html_class sanitize_text_field strtolower trim "
                  "strval".split())
_PURE = frozenset("isset empty is_string is_array is_numeric in_array array_key_exists absint intval count strlen "
                  "max min".split())


def _drop_call_args(code: str) -> str:
    """The code with the arguments of every call that is not a pass-through removed (`absint( $level )` -> `absint()`)."""
    out, i = [], 0
    for m in re.finditer(r"(?<![\w$>:])([A-Za-z_]\w*)\s*\(", code):
        if m.start() < i or m.group(1) in _PASS or m.group(1) in I.PHP_KEYWORDS:
            continue
        depth, j = 0, m.end() - 1
        while j < len(code):
            depth += {"(": 1, ")": -1}.get(code[j], 0)
            if depth == 0:
                break
            j += 1
        out.append(code[i:m.end()])
        i = j
    out.append(code[i:])
    return "".join(out)


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


def _valid_for(fact: str):
    if fact == "renders-tag":
        return lambda v: S._tag_name(v.strip()) is not None and v.strip() == v
    if fact == "renders-role":
        return lambda v: v in S.ARIA_ROLES
    return None


def _norm(v: str) -> str:
    return S._tag_name(v) or v


def _rhs(toks: list, k: int, offset: int, stop: str = ";") -> list:
    """Tokens of an assignment's right-hand side: from `offset` in code token k to the statement's `;` (or the call's
    closing `)` when `stop` is ')'), at bracket depth 0."""
    out, depth = [], 0
    first = toks[k].text[offset:]
    seq = [S.Tok("code", first, toks[k].pos + offset)] + toks[k + 1:]
    for t in seq:
        if t.kind == "lit":
            out.append(t)
            continue
        buf = []
        for ch in t.text:
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
                if depth < 0 and stop == ")":
                    out.append(S.Tok("code", "".join(buf), t.pos))
                    return out
            if ch == ";" and depth <= 0:
                out.append(S.Tok("code", "".join(buf), t.pos))
                return out
            buf.append(ch)
        out.append(S.Tok("code", "".join(buf), t.pos))
    return out


def _branches(rhs: list) -> list:
    """A right-hand side without its leading ternary condition (`$a ? 'nav' : 'div'` -> `'nav' : 'div'`): the condition
    selects a branch and gives no value. A condition holding an in_array() allowlist is kept (it names the values)."""
    depth = 0
    for i, t in enumerate(rhs):
        if t.kind != "code":
            continue
        for j, ch in enumerate(t.text):
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
            elif ch == "?" and depth == 0 and t.text[j + 1:j + 2] not in ("?", "-", ">") and t.text[j - 1:j] != "?":
                cond = " ".join(x.text for x in rhs[:i]) + t.text[:j]
                if "in_array" in cond:
                    return rhs
                return [S.Tok("code", t.text[j + 1:], t.pos + j + 1)] + rhs[i + 1:]
    return rhs


def _code_text(toks: list) -> str:
    return "".join(t.text if t.kind == "code" else "'" + t.text.replace(S.HOLE, "") + "'" for t in toks)


def _line(text: str, pos: int) -> str:
    a = text.rfind("\n", 0, pos) + 1
    b = text.find("\n", pos)
    return re.sub(r"\s+", " ", text[a: b if b != -1 else len(text)].strip())[:90]
