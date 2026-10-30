"""identity_sources -- which code can print into a block's output, followed from the block's own files.

The tracing half of the block identification facts (`block_identity_facts.py`; the lexical reader is
`identity_scan.py`). `RepoIndex` reads every SGS PHP file (sgs-blocks, the theme, the other SGS plugins) once and
answers four questions:

- `functions` / `methods`: where each repo function and class method is defined, so a call is followed to the body
  that runs (`closure()` follows calls, string callbacks and `Class::method` transitively);
- `filters`: every `render_block` / `render_block_<name>` filter, its callback's body and the blocks it applies to,
  read from the key or name its callback (or a function it calls) checks: a block name it compares, a
  `supports['sgs'][...]` / `enabledExtensions` key, or a `$block['attrs'][...]` key it reads. A filter whose gate cannot
  be read may apply to any block (its writes are possible everywhere, proven nowhere);
- `modules`: the script modules a view script can import (`@sgs/<id>` read from the PHP module registry, mapped from
  `build/` back to `src/`); an npm or vendor module is outside the repo;
- `externals`: calls to code outside the repo that print markup of their own: WooCommerce (see `WOO_CALL`,
  `WOO_METHOD` and its `woocommerce_*` action hooks), and the WordPress core functions in `CORE_MARKUP_CALLS`.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import identity_scan as S

PHP_KEYWORDS = frozenset(
    "if elseif else for foreach while do switch case match return echo print isset empty unset list array function fn "
    "new clone catch try finally throw include include_once require require_once die exit eval declare use namespace "
    "class interface trait extends implements static self parent global const and or xor instanceof insteadof yield "
    "default break continue goto int float string bool object callable iterable void mixed never null true false".split()
)

# WordPress core functions whose return or output is markup of their own (WordPress reference). What each prints is read
# from pinned core source into scripts/data/core-markup-facts.json (identity_pinned.py --refresh-core); a call to one
# missing from that snapshot, or recorded there as unknown, makes the caller's tags, roles and ARIA attributes `unknown`.
CORE_MARKUP_CALLS = frozenset(
    "wp_get_attachment_image get_the_post_thumbnail the_post_thumbnail get_avatar get_search_form wp_nav_menu "
    "paginate_links the_posts_pagination get_the_posts_pagination get_the_password_form wp_login_form comment_form "
    "get_custom_logo the_custom_logo get_the_tag_list get_the_category_list get_the_term_list wp_get_attachment_link "
    "get_image_tag wp_video_shortcode wp_audio_shortcode do_shortcode wp_list_pages wp_list_categories "
    "wp_dropdown_categories wp_dropdown_pages wp_get_archives get_the_author_link get_comment_reply_link "
    "wp_loginout get_the_privacy_policy_link block_template_part get_the_block_template_html wp_get_loading_attr_default "
    "get_block_wrapper_attributes".split()
)
# Core's block-supports wrapper attributes (`get_block_wrapper_attributes()`) print class, style, id and, with
# `supports.ariaLabel`, aria-label. Its output is read live (A2b); here it makes only aria-label unknown.
CORE_WRAPPER = "get_block_wrapper_attributes"
# Core block-support renderers a repo filter hands a block to, with the block.json support that switches each on. A
# block declaring that support has its tags, roles and ARIA attributes `unknown` (read live in A2b); any other block is
# untouched by it.
CORE_SUPPORT_CALLS = {"WP_Duotone::render_duotone_support": ("filter", "duotone")}
# WooCommerce's markup: its template functions (`woocommerce_*`, `wc_get_template*`, `wc_print_*`, `wc_display_*`), any
# `wc_*_html` / `wc_price`, a product's `get_*_html()` / `get_image()`, and a `do_action( 'woocommerce_*' )` hook. Its
# data calls (`wc_get_product`, `WC()->cart`) print nothing.
WOO_CALL = re.compile(r"^(?:WC_\w+::\w+|woocommerce_\w+|wc_get_template\w*|wc_print_\w+|wc_display_\w+|wc_\w+_html|wc_price)$")
WOO_METHOD = re.compile(r"->\s*(get_price_html|get_rating_html|get_image|get_stock_html|get_categories|get_tags)\s*\(")

# Functions that report a developer or settings error (a notice, an error page), never block output: not followed.
DIAGNOSTIC_FUNCS = re.compile(r"^(?:_doing_it_wrong|_deprecated_\w+|wp_trigger_error|add_settings_error|wp_die|_default_wp_die_handler)$")
# A static method of a class outside the repo whose name says it prints or returns markup.
OUTSIDE_MARKUP_METHOD = re.compile(r"^(?:output|render\w*|display\w*|\w*_html)$")
_FUNC_DEF = re.compile(r"\bfunction\s+&?\s*([A-Za-z_]\w*)\s*\(")
_CLASS_DEF = re.compile(r"\b(?:class|trait|interface|enum)\s+([A-Za-z_]\w*)")
_CALL = re.compile(r"(?<![\w$>:\\])\\?(?:[A-Za-z_]\w*\\)*([A-Za-z_]\w*)\s*\(")
_STATIC_CALL = re.compile(r"\\?(?:[A-Za-z_]\w*\\)*([A-Za-z_]\w*)\s*::\s*([A-Za-z_]\w*)\s*\(")
_THIS_CALL = re.compile(r"\$this\s*\??->\s*([A-Za-z_]\w*)\s*\(")
_ADD_FILTER = re.compile(r"\badd_filter\s*\(\s*$")
BLOCK_NAME = re.compile(r"^[a-z][a-z0-9-]*/[a-z][a-z0-9-]*$")


@dataclass
class Unit:
    """A body of code: a function, a method, a closure or a whole file's top level."""
    key: str           # file::symbol, the evidence label
    file: Path
    start: int
    end: int
    cls: str = ""


@dataclass
class Filter:
    hook: str
    unit: Unit | None
    gate: str                     # 'names' | 'supports' | 'effects' | 'attrs' | 'all-sgs' | 'none'
    names: set = field(default_factory=set)
    supports: list = field(default_factory=list)   # [(path tuple, value or None)]
    attrs: set = field(default_factory=set)       # attribute keys, or effect names for an 'effects' gate
    evidence: str = ""
    via_callee: bool = False      # the gate was read from a function the callback calls: applies at most "possible"


class RepoIndex:
    def __init__(self, repo: Path, php_roots: list[Path], blocks_dir: Path, src_dir: Path, effect_names: frozenset = frozenset()):
        self.repo = repo
        self.effect_names = effect_names
        self.blocks_dir = blocks_dir
        self.src_dir = src_dir
        self.files: dict[Path, str] = {}
        self.functions: dict[str, list[Unit]] = {}
        self.methods: dict[tuple[str, str], Unit] = {}
        self.consts: dict[str, str] = {}
        self._unit_toks: dict = {}
        for root in php_roots:
            for f in sorted(root.rglob("*.php")) if root.is_dir() else [root]:
                parts = set(f.relative_to(repo).parts)
                if parts & {"vendor", "node_modules", "build", "tests", "scripts", "languages"}:
                    continue
                self._index_file(f)
        self._classes = {c for c, _ in self.methods}
        self.filters = self._find_filters()
        self.modules = self._module_registry()

    # -- files and tokens ----------------------------------------------------------------------------------------------
    def text(self, f: Path) -> str:
        if f not in self.files:
            self.files[f] = f.read_text(encoding="utf-8", errors="replace")
        return self.files[f]

    @lru_cache(maxsize=None)
    def tokens(self, f: Path) -> list:
        return S.php_tokens(self.text(f)) if f.suffix == ".php" else S.js_tokens(self.text(f))

    @lru_cache(maxsize=None)
    def masked(self, f: Path) -> str:
        """The file with every literal and comment blanked (newlines kept), so braces and calls read from code only."""
        text = self.text(f)
        out = [" " if ch != "\n" else "\n" for ch in text]
        for t in self.tokens(f):
            if t.kind == "code":
                out[t.pos:t.pos + len(t.text)] = list(t.text)
        return "".join(out)

    def unit_tokens(self, u: Unit) -> list:
        """The unit's tokens; a code token that straddles either edge is clipped to the unit."""
        key = (u.file, u.start, u.end)
        if key in self._unit_toks:
            return self._unit_toks[key]
        out = []
        for t in self.tokens(u.file):
            end = t.pos + len(t.text)
            if end <= u.start or t.pos >= u.end:
                continue
            if t.kind == "code" and (t.pos < u.start or end > u.end):
                a, b = max(t.pos, u.start), min(end, u.end)
                out.append(S.Tok("code", t.text[a - t.pos:b - t.pos], a))
            elif t.pos >= u.start:
                out.append(t)
        self._unit_toks[key] = out
        return out

    def rel(self, f: Path) -> str:
        try:
            return f.relative_to(self.repo).as_posix()
        except ValueError:  # a pinned package read from another checkout's node_modules
            parts = f.parts
            return "/".join(parts[parts.index("node_modules"):]) if "node_modules" in parts else f.as_posix()

    # -- definitions ---------------------------------------------------------------------------------------------------
    def _index_file(self, f: Path) -> None:
        masked = self.masked(f)
        classes = []
        for m in _CLASS_DEF.finditer(masked):
            brace = masked.find("{", m.end())
            if brace != -1:
                classes.append((m.group(1), brace, _match_brace(masked, brace)))
        for m in _FUNC_DEF.finditer(masked):
            close = _paren_close(masked, m.end() - 1)
            brace = masked.find("{", close)
            semi = masked.find(";", close)
            if brace == -1 or (semi != -1 and semi < brace):
                continue  # an abstract or interface declaration
            end = _match_brace(masked, brace)
            name = m.group(1)
            cls = next((c for c, s, e in classes if s < m.start() < e), "")
            u = Unit(f"{self.rel(f)}::{cls + '::' if cls else ''}{name}", f, brace, end, cls)
            if cls:
                self.methods.setdefault((cls, name), u)
            else:
                self.functions.setdefault(name, []).append(u)
        toks = self.tokens(f)
        for k, t in enumerate(toks):
            if t.kind == "code" and k + 1 < len(toks) and toks[k + 1].kind == "lit":
                m = re.search(r"\bconst\s+([A-Z_][A-Z0-9_]*)\s*=\s*$", t.text)
                if m:
                    self.consts[m.group(1)] = toks[k + 1].text
                if re.search(r"\bdefine\s*\(\s*$", t.text) and k + 3 < len(toks) and toks[k + 3].kind == "lit":
                    self.consts[toks[k + 1].text] = toks[k + 3].text

    def file_unit(self, f: Path) -> Unit:
        return Unit(self.rel(f), f, 0, len(self.text(f)))

    # -- calls ---------------------------------------------------------------------------------------------------------
    def callees(self, u: Unit) -> tuple[list[Unit], dict[str, int]]:
        """Repo units this unit calls (named calls, static and `$this` calls, string callbacks), and the calls it makes
        to code outside the repo that print markup (name -> offset)."""
        masked = self.masked(u.file)[u.start:u.end]
        out: list[Unit] = []
        ext: dict[str, int] = {}
        for m in _STATIC_CALL.finditer(masked):
            cls = u.cls if m.group(1) in ("self", "static", "parent") else m.group(1)
            if (cls, m.group(2)) in self.methods:
                out.append(self.methods[(cls, m.group(2))])
            elif f"{cls}::{m.group(2)}" in CORE_SUPPORT_CALLS:
                ext.setdefault(f"{cls}::{m.group(2)}", u.start + m.start())
            elif cls not in self._classes and OUTSIDE_MARKUP_METHOD.match(m.group(2)):
                # A class outside the repo printing its own output (WC_Shortcode_My_Account::output).
                ext.setdefault(f"{cls}::{m.group(2)}", u.start + m.start())
        for m in _THIS_CALL.finditer(masked):
            if (u.cls, m.group(1)) in self.methods:
                out.append(self.methods[(u.cls, m.group(1))])
        for m in _CALL.finditer(masked):
            name = m.group(1)
            before = masked[max(0, m.start() - 2):m.start()]
            if name in PHP_KEYWORDS or before.endswith("::") or before.endswith("->") or re.search(r"\bfunction\s*$", masked[:m.start()][-20:]):
                continue
            if name in self.functions and not DIAGNOSTIC_FUNCS.match(name):
                out.extend(self.functions[name])
            elif name in CORE_MARKUP_CALLS or WOO_CALL.match(name):
                ext.setdefault(name, u.start + m.start())
        for m in WOO_METHOD.finditer(masked):
            ext.setdefault("->" + m.group(1), u.start + m.start())
        for t in self.unit_tokens(u):
            if t.kind != "lit" or S.HOLE in t.text:
                continue
            if t.text.startswith("woocommerce_") and re.search(r"\bdo_action\s*\(\s*$", self._code_before(u.file, t.pos)):
                ext.setdefault(f"do_action('{t.text}')", t.pos)
                continue
            name = t.text.rsplit("\\", 1)[-1]
            if re.fullmatch(r"[A-Za-z_]\w*", name) and name in self.functions and (name != t.text or "\\" in t.text or name.startswith("sgs_")):
                out.extend(self.functions[name])
            elif u.cls and (u.cls, t.text) in self.methods and re.search(r"(__CLASS__|self::class|static::class)\s*,\s*$", self._code_before(u.file, t.pos)):
                out.append(self.methods[(u.cls, t.text)])
        return out, ext

    def _code_before(self, f: Path, pos: int) -> str:
        return self.masked(f)[max(0, pos - 60):pos]

    def closure(self, roots: list[Unit], max_units: int = 4000) -> tuple[list[Unit], dict[str, tuple[str, int]]]:
        """Every unit reachable from `roots` by calls, and every outside-repo markup call met (name -> (unit key, pos))."""
        seen: dict[str, Unit] = {}
        ext: dict[str, tuple[str, int]] = {}
        stack = list(roots)
        while stack and len(seen) < max_units:
            u = stack.pop()
            if u.key in seen and seen[u.key].start == u.start:
                continue
            seen[u.key] = u
            kids, e = self.callees(u)
            for name, pos in e.items():
                ext.setdefault(name, (u.key, pos, u.file))
            stack.extend(k for k in kids if k.key not in seen)
        return list(seen.values()), ext

    # -- render_block filters ------------------------------------------------------------------------------------------
    def _find_filters(self) -> list[Filter]:
        out: list[Filter] = []
        for f in list(self.files):
            if f.suffix != ".php":
                continue
            toks = self.tokens(f)
            for k, t in enumerate(toks):
                if t.kind != "lit" or not (t.text == "render_block" or t.text.startswith("render_block_")):
                    continue
                if t.text in ("render_block_data", "render_block_context"):
                    continue
                prev = toks[k - 1].text if k and toks[k - 1].kind == "code" else ""
                if _ADD_FILTER.search(prev):
                    out.append(self._gate(t.text, self._callback_unit(f, toks, k), f, t.pos))
                elif t.text.startswith("render_block_") and re.search(r"[\[(,]\s*$", prev) and re.search(r"\badd_filter\s*\(\s*\$", self.masked(f)):
                    out.append(self._gate(t.text, None, f, t.pos))  # a hook name in a list a loop registers
        return out

    def _callback_unit(self, f: Path, toks: list, k: int) -> Unit | None:
        masked = self.masked(f)
        j = k + 1
        if j < len(toks) and toks[j].kind == "code":
            after = toks[j].text
            m = re.match(r"\s*,\s*(?:static\s+)?function\s*\(", after)
            if m:
                brace = masked.find("{", toks[j].pos + m.end())
                return Unit(f"{self.rel(f)}::closure@{S.line_of(self.text(f), toks[k].pos)}", f, brace, _match_brace(masked, brace))
            m = re.match(r"\s*,\s*array\s*\(\s*(__CLASS__|self::class|static::class|\\?([A-Za-z_][\w\\]*)::class)?\s*,?\s*$", after)
            lits = [x for x in toks[j + 1:j + 4] if x.kind == "lit"]
            if m and lits:
                cls = self._class_at(f, toks[k].pos) if (m.group(1) or "").startswith(("__", "self", "static")) else (m.group(2) or "").rsplit("\\", 1)[-1]
                if not m.group(1) and len(lits) >= 2:
                    cls, meth = lits[0].text.rsplit("\\", 1)[-1], lits[1].text
                else:
                    meth = lits[0].text
                return self.methods.get((cls, meth))
        lits = [x for x in toks[k + 1:k + 4] if x.kind == "lit"]
        if lits:
            name = lits[0].text.rsplit("\\", 1)[-1]
            if name in self.functions:
                same = [u for u in self.functions[name] if u.file == f]
                return (same or self.functions[name])[0]
        return None

    def _class_at(self, f: Path, pos: int) -> str:
        masked = self.masked(f)
        for m in _CLASS_DEF.finditer(masked):
            brace = masked.find("{", m.end())
            if brace != -1 and brace < pos < _match_brace(masked, brace):
                return m.group(1)
        return ""

    def _gate(self, hook: str, unit: Unit | None, f: Path, pos: int) -> Filter:
        where = f"{self.rel(f)}::add_filter('{hook}')@{S.line_of(self.text(f), pos)}"
        if hook.startswith("render_block_"):
            return Filter(hook, unit, "names", {hook[len("render_block_"):]}, evidence=where)
        if unit is None:
            return Filter(hook, None, "none", evidence=where + " (callback not read)")
        names, attrs, supports, all_sgs, effects = self._read_gates([unit])
        via = False
        if not (names or attrs or supports or all_sgs or effects):
            # The callback checks nothing itself: a gate read from a function it calls is only possible.
            names, attrs, supports, all_sgs, effects = self._read_gates(self.callees(unit)[0][:12])
            via = True
        if names:
            return Filter(hook, unit, "names", names, evidence=where, via_callee=via)
        if any(v is not None for _, v in supports) or supports:
            return Filter(hook, unit, "supports", supports=supports, evidence=where, via_callee=via)
        if effects:
            return Filter(hook, unit, "effects", attrs=effects, evidence=where, via_callee=via)
        if attrs:
            return Filter(hook, unit, "attrs", attrs=attrs, evidence=where, via_callee=via)
        if all_sgs:
            return Filter(hook, unit, "all-sgs", evidence=where, via_callee=via)
        return Filter(hook, unit, "none", evidence=where, via_callee=via)

    def _read_gates(self, bodies: list) -> tuple:
        """The block names, attribute keys, supports paths, effect names and sgs-prefix test the bodies check."""
        names, attrs, supports, all_sgs, effects = set(), set(), [], False, set()
        for b in bodies:
            toks = self.unit_tokens(b)
            code = self.masked(b.file)[b.start:b.end]
            lit_words = {t.text for t in toks if t.kind == "lit"}
            reads_name = re.search(r"\$block_name\b|->name\b", code) or "blockName" in lit_words
            for i, t in enumerate(toks):
                if t.kind == "lit":
                    if BLOCK_NAME.match(t.text) and reads_name:
                        names.add(t.text)
                    elif t.text in ("sgs/", "sgs") and re.search(r"str_starts_with|strpos|strncmp|0\s*===", self._code_before(b.file, t.pos) + (toks[i + 1].text if i + 1 < len(toks) and toks[i + 1].kind == "code" else "")):
                        all_sgs = True
                    prev = toks[i - 1].text if i and toks[i - 1].kind == "code" else ""
                    if re.search(r"\$(?:attrs|attributes)\s*\[\s*$", prev) or (
                        i >= 2 and toks[i - 2].kind == "lit" and toks[i - 2].text == "attrs" and re.fullmatch(r"\s*\]\s*\[\s*", prev)
                    ):
                        attrs.add(t.text)
                    for em in re.finditer(r"[a-z][a-z0-9-]*", t.text):
                        if em.group(0) in self.effect_names and (t.text == em.group(0) or "data-sgs-fx-" + em.group(0) in t.text):
                            effects.add(em.group(0))
                    if i >= 2 and toks[i - 2].kind == "lit" and toks[i - 2].text == "sgs" and re.fullmatch(r"\s*\]\s*\[\s*", prev) \
                            and re.search(r"supports", self._code_before(b.file, toks[i - 2].pos)[-40:]):
                        supports.append((("sgs", t.text), None))
                    if re.search(r"supports\s*\[\s*$", prev) and t.text != "sgs":
                        supports.append(((t.text,), None))
                    if re.search(r"block_has_support\s*\([^,]*,\s*(?:array\s*\(\s*)?$", prev):
                        supports.append(((t.text,), None))
                    if re.search(r"\bin_array\s*\(\s*$", prev) and re.search(r"enabledExtensions", code):
                        supports.append((("sgs", "enabledExtensions"), t.text))
            for cm in re.finditer(r"\b([A-Z][A-Z0-9_]{3,})\b", code):
                val = self.consts.get(cm.group(1), "")
                if BLOCK_NAME.match(val) and reads_name:
                    names.add(val)
        supports = [(p, v) for p, v in supports if not (p == ("sgs", "enabledExtensions") and v is None)] or supports
        return names, attrs, supports, all_sgs, effects


    # -- script modules ------------------------------------------------------------------------------------------------
    def _module_registry(self) -> dict[str, Path | None]:
        """`@sgs/<id>` -> its src file, or None when the module is vendor code (outside the repo)."""
        out: dict[str, Path | None] = {}
        plugin = self.blocks_dir.parent.parent
        for f in self.files:
            toks = self.tokens(f)
            for k, t in enumerate(toks):
                if t.kind != "lit" or not t.text.startswith("@sgs/"):
                    continue
                for x in toks[k + 1:k + 6]:
                    if x.kind == "lit" and x.text.startswith("build/") and x.text.endswith(".js"):
                        src = plugin / ("src/" + x.text[len("build/"):])
                        out.setdefault(t.text, src if src.is_file() else None)
                        break
        return out


def _match_brace(text: str, brace: int) -> int:
    depth = 0
    for i in range(brace, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return i + 1
    return len(text)


def _paren_close(text: str, paren: int) -> int:
    depth = 0
    for i in range(paren, len(text)):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return i
    return len(text)


# ---------------------------------------------------------------------------------------------------------------------
# View scripts
# ---------------------------------------------------------------------------------------------------------------------

_JS_IMPORT = re.compile(r"""(?:\bimport\s*(?:[\w$*{}\s,]*?\s*from\s*)?|\bimport\s*\(\s*|\bexport\s+(?:\*|\{[^}]*\})\s+from\s+)['"]([^'"]+)['"]""", re.S)


def js_closure(entry: Path, modules: dict, src_dir: Path, npm=None) -> tuple[list[Path], list[str]]:
    """A view script and every file it imports: relative paths, `@sgs/*` modules, and the npm packages `npm( spec )`
    resolves to a pinned file (`identity_pinned.npm_file`, which returns (path, label) or (None, reason)); and the
    imports that stay outside (an npm package that is absent or unpinned, a vendor module), each with its reason.
    `@wordpress/*` packages print no markup of their own and are not listed."""
    files, outside, seen, stack = [], [], set(), [entry]
    while stack:
        f = stack.pop()
        if f in seen or not f.is_file():
            continue
        seen.add(f)
        files.append(f)
        for m in _JS_IMPORT.finditer(f.read_text(encoding="utf-8", errors="replace")):
            spec = m.group(1)
            if spec.startswith("."):
                base = (f.parent / spec).resolve()
                for cand in (base, base.with_suffix(".js"), base / "index.js"):
                    if cand.is_file():
                        stack.append(cand)
                        break
            elif spec.startswith("@sgs/"):
                target = modules.get(spec)
                if target is None and spec not in modules:
                    # Registered without a literal build path: the one src file of that name.
                    found = sorted(src_dir.rglob(spec[len("@sgs/"):] + ".js"))
                    target = found[0] if len(found) == 1 else None
                if target is not None:
                    stack.append(target)
                else:
                    outside.append(spec)
            elif not spec.startswith("@wordpress/"):
                target, why = npm(spec) if npm is not None else (None, "outside the repo")
                if target is not None:
                    stack.append(target)
                else:
                    outside.append(f"{spec} ({why})")
    return files, sorted(set(outside))


def view_entries(block_dir: Path, block_json: dict) -> list[Path]:
    out = []
    for key in ("viewScriptModule", "viewScript"):
        val = block_json.get(key)
        for v in (val if isinstance(val, list) else [val] if val else []):
            if isinstance(v, str) and v.startswith("file:"):
                p = (block_dir / v[5:]).resolve()
                if p.suffix == ".js" and p.is_file():
                    out.append(p)
    return out


def load_json(p: Path) -> dict:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
