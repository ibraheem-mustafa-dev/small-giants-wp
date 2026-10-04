"""CSS consumer index (link L6 and the editor.css shadowing rule S1).

Parses every front-end stylesheet the plugin and theme ship (`.css` and nested
`.scss`, `//` comments stripped, declarations before a nested rule kept, `&`
resolved against the parent selector), plus `var(--sgs-…)` readers built in PHP
and any `var(--sgs-…)` template a postbuild CSS injector writes. Editor-only
stylesheets are indexed separately: they never count as a front-end consumer,
and they feed S1.
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from wf_php import read

CP_READ_RE = re.compile(r"var\(\s*(--sgs-[a-z0-9-]+)")
CLASS_TOKEN_RE = re.compile(r"\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)")
DATA_ATTR_SEL_RE = re.compile(r"\[\s*(data-[a-z0-9-]+)")
DECL_PROP_RE = re.compile(r"(?:^|;)\s*([a-z-]+)\s*:")
EDITOR_SHEET_RE = re.compile(r"(^|/)editor[^/]*\.s?css$")
# Used only when package.json exists but its postbuild cannot be read (a loud warning names why).
FALLBACK_INJECTOR_GLOBS = ("scripts/shadow-lift/*.js", "scripts/shadow-fallback/*.js", "scripts/hover-guard/*.js")
POSTBUILD_NODE_RE = re.compile(r"\bnode\s+(\S+\.js)((?:\s+--?[\w-]+)*)")


def _strip_comments(src: str, scss: bool) -> str:
    src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
    if scss:
        # `//` to end of line, but never inside url(...) or a quoted string.
        src = re.sub(r"(?<![:\"'(])//[^\n]*", "", src)
    return src


def _combine(parent: str, child: str) -> str:
    if not parent:
        return child
    parents = [p.strip() for p in parent.split(",") if p.strip()]
    children = [c.strip() for c in child.split(",") if c.strip()]
    out = []
    for p in parents:
        for c in children:
            out.append(c.replace("&", p) if "&" in c else p + " " + c)
    return ", ".join(out)


def css_rules(src: str, scss: bool = False) -> list[tuple[str, str]]:
    """(selector, declarations) pairs, nested rules flattened, at-rules transparent."""
    src = _strip_comments(src, scss)
    out: list[tuple[str, str]] = []
    stack: list[tuple[str, list[str]]] = [("", [])]  # (resolved selector, decl chunks)
    buf: list[str] = []
    quote = None
    for c in src:
        if quote:
            buf.append(c)
            if c == quote:
                quote = None
            continue
        if c in ('"', "'"):
            quote = c
            buf.append(c)
            continue
        if c == "{":
            text = "".join(buf)
            cut = max(text.rfind(";"), text.rfind("}"))
            head = text[cut + 1 :].strip()
            if cut >= 0:
                stack[-1][1].append(text[: cut + 1])
            parent = stack[-1][0]
            if head.startswith("@"):
                stack.append((parent, []))  # at-rule: keep the parent selector
            else:
                stack.append((_combine(parent, head), []))
            buf = []
            continue
        if c == "}":
            stack[-1][1].append("".join(buf))
            sel, chunks = stack.pop() if len(stack) > 1 else stack[0]
            body = "".join(chunks)
            if sel and body.strip():
                out.append((sel, body))
            buf = []
            if not stack:
                stack = [("", [])]
            continue
        buf.append(c)
    return out


@dataclass
class CssIndex:
    cp_readers: dict[str, list[tuple[str, str]]] = field(default_factory=lambda: defaultdict(list))
    class_tokens: set[str] = field(default_factory=set)
    data_attrs: set[str] = field(default_factory=set)
    rules: list[tuple[str, str, str]] = field(default_factory=list)          # (file, selector, body)
    editor_rules: list[tuple[str, str, str]] = field(default_factory=list)   # editor-only sheets
    php_cp_readers: set[str] = field(default_factory=set)
    injector_cp_readers: set[str] = field(default_factory=set)
    js_cp_readers: set[str] = field(default_factory=set)                     # front-end scripts

    def has_class(self, token: str) -> bool:
        """Exact class, or a prefix built dynamically (ending in `-`/`_`, or marked
        `*` when the string concatenates a value onto it: `'…__title--w' . $v`)."""
        if token in self.class_tokens:
            return True
        if token.endswith(("-", "_", "*")):
            pre = token.rstrip("*")
            return any(t.startswith(pre) for t in self.class_tokens)
        return False

    def cp_read(self, cp: str) -> bool:
        others = self.php_cp_readers | self.injector_cp_readers | self.js_cp_readers
        if cp.endswith("-"):
            return any(k.startswith(cp) for k in self.cp_readers) or any(k.startswith(cp) for k in others)
        return bool(self.cp_readers.get(cp)) or cp in others


def injector_globs(plugin: Path) -> tuple[str, ...]:
    """Globs over the postbuild steps that rewrite built CSS: each `node <script>.js`
    in package.json::scripts.postbuild run with `--build`, or a `*transform*` script,
    contributes its folder's scripts (a script directly in scripts/ contributes
    itself). No package.json (a fixture tree) means no injectors; one whose postbuild
    cannot be read falls back to FALLBACK_INJECTOR_GLOBS with a warning on stderr."""
    pkg = plugin / "package.json"
    if not pkg.exists():
        return ()
    try:
        postbuild = json.loads(pkg.read_text(encoding="utf-8"))["scripts"]["postbuild"]
        if not isinstance(postbuild, str):
            raise TypeError("scripts.postbuild is not a string")
    except (OSError, ValueError, KeyError, TypeError) as e:
        print(f"[wiring-fingerprint] WARNING: cannot read {pkg} scripts.postbuild ({e!r}); "
              f"falling back to {', '.join(FALLBACK_INJECTOR_GLOBS)}", file=sys.stderr)
        return FALLBACK_INJECTOR_GLOBS
    out: list[str] = []
    for m in POSTBUILD_NODE_RE.finditer(postbuild):
        script, flags = m.group(1), m.group(2).split()
        if "--build" not in flags and "transform" not in Path(script).name:
            continue
        parent = Path(script).parent.as_posix()
        glob = f"{parent}/*.js" if parent not in ("scripts", ".") else script
        if glob not in out:
            out.append(glob)
    return tuple(out)


def stylesheet_files(plugin: Path, theme: Path) -> list[Path]:
    """Front-end and editor stylesheets; anything under a `build/` or `node_modules/`
    folder of the plugin or theme is skipped (tested on the path relative to its root,
    so a checkout that itself sits under a folder named `build` still scans)."""
    files: list[tuple[Path, Path]] = []
    for pat in ("src/**/*.css", "src/**/*.scss", "assets/**/*.css"):
        files += [(f, plugin) for f in plugin.glob(pat)]
    if theme.exists():
        files += [(f, theme) for f in theme.glob("**/*.css")]
    return sorted(f for f, root in files if not {"node_modules", "build"} & set(f.relative_to(root).parts))


def build_css_index(plugin: Path, theme: Path, php_texts) -> CssIndex:
    idx = CssIndex()
    for f in stylesheet_files(plugin, theme):
        posix = f.as_posix()
        rules = css_rules(read(f), scss=posix.endswith(".scss"))
        editor = bool(EDITOR_SHEET_RE.search(posix))
        for sel, body in rules:
            if editor:
                idx.editor_rules.append((posix, sel, body))
                continue
            idx.rules.append((posix, sel, body))
            idx.class_tokens.update(CLASS_TOKEN_RE.findall(sel))
            idx.data_attrs.update(DATA_ATTR_SEL_RE.findall(sel))
            for cp in set(CP_READ_RE.findall(body)):
                idx.cp_readers[cp].append((posix, sel))
            for cp in set(CP_READ_RE.findall(sel)):
                idx.cp_readers[cp].append((posix, sel))
    php_texts = list(php_texts)
    for t in php_texts:
        idx.php_cp_readers.update(CP_READ_RE.findall(t.src))
        # Selectors a PHP emitter writes (`'.sgs-x--y{'`, or concatenated:
        # `'.' . $uid . '.sgs-x__tag--trial'`) are class rules too.
        idx.class_tokens.update(m.group(1) for m in PHP_SELECTOR_CLASS_RE.finditer(t.src))
        idx.data_attrs.update(DATA_ATTR_SEL_RE.findall(t.src))
    idx.php_cp_readers |= dynamic_var_reads(php_texts)
    idx.class_tokens |= concat_selector_classes(php_texts)
    for pat in injector_globs(plugin):
        for f in sorted(plugin.glob(pat)):
            idx.injector_cp_readers.update(CP_READ_RE.findall(read(f)))
    return idx


PHP_SELECTOR_CLASS_RE = re.compile(r"""\.((?:sgs|is|has)-[a-z0-9_-]+)(?=\s*[{:,> .\['"])""")
# `var(--' . $name . ')` / `var(--' . $name . '-gradient)`: a reader whose name a parameter carries.
DYN_VAR_READ_RE = re.compile(r"""var\(\s*--['"]\s*\.\s*\$(\w+)(?:\s*\.\s*['"]([a-z0-9-]*))?""")
CLOSURE_HEAD_RE = re.compile(r"\$(\w+)\s*=\s*(?:static\s+)?function\s*\(([^)]*)\)")
NAMED_HEAD_RE = re.compile(r"\bfunction\s+&?\s*(\w+)\s*\(([^)]*)\)")
STR_ARG_RE = re.compile(r"""\s*['"](?:--)?(sgs-[a-z0-9-]*[a-z0-9])['"]\s*$""")


def dynamic_var_reads(php_texts) -> set[str]:
    """Custom properties read through `var(--' . $name . …)` where `$name` is a
    parameter of a function or closure: every call passing a literal
    `'sgs-…'` / `'--sgs-…'` at that parameter names a read custom property."""
    from wf_php import split_args

    out: set[str] = set()
    for t in php_texts:
        for m in DYN_VAR_READ_RE.finditer(t.src):
            name, tail = m.group(1), m.group(2) or ""
            heads = [(h.start(), "closure", h.group(1), h.group(2)) for h in CLOSURE_HEAD_RE.finditer(t.src, 0, m.start())]
            heads += [(h.start(), "named", h.group(1), h.group(2)) for h in NAMED_HEAD_RE.finditer(t.src, 0, m.start())]
            for _pos, kind, fname, params in sorted(heads, reverse=True):
                pnames = [(re.search(r"\$(\w+)", p) or [None, ""])[1] for p in params.split(",")]
                if name not in pnames:
                    continue
                idx = pnames.index(name)
                call_re = re.compile((r"\$" + fname if kind == "closure" else r"(?<![\w$>:])" + fname) + r"\s*\(")
                for tt in (php_texts if kind == "named" else [t]):
                    for cm in call_re.finditer(tt.src):
                        args = split_args(tt.src, cm.end() - 1)
                        lm = STR_ARG_RE.match(args[idx]) if idx < len(args) else None
                        if lm:
                            out.add("--" + lm.group(1) + tail)
                break
    return out


# `' .' . $bem_root . '__item--featured'`: a selector whose block root a variable carries.
CONCAT_SEL_RE = re.compile(r"""\.['"]\s*\.\s*\$(\w+)\s*\.\s*['"]((?:__|--)[a-z0-9][a-z0-9_-]*[a-z0-9])""")
LIT_ROOT_RE = re.compile(r"""\s*['"]((?:sgs|is|has)-[a-z0-9][a-z0-9-]*[a-z0-9])['"]\s*$""")
VAR_ARG_RE = re.compile(r"\s*\$(\w+)\s*$")


class RootLiterals:
    """Literal class roots a variable holds at a position: the latest `$name = 'sgs-x';`
    before it in the same text, or, when `$name` is a parameter of the enclosing
    function or closure, the literal each call passes at that parameter (followed
    through a caller that passes its own parameter on, up to four levels). Call
    sites, heads and assignments are indexed once per text or function."""

    def __init__(self, php_texts) -> None:
        self.texts = list(php_texts)
        self._heads: dict[int, list] = {}
        self._assigns: dict[tuple[int, str], list] = {}
        self._calls: dict[tuple, list] = {}
        self._param: dict[tuple, frozenset] = {}

    def heads(self, t) -> list:
        if id(t) not in self._heads:
            hs = [(h.start(), "closure", h.group(1), h.group(2)) for h in CLOSURE_HEAD_RE.finditer(t.src)]
            hs += [(h.start(), "named", h.group(1), h.group(2)) for h in NAMED_HEAD_RE.finditer(t.src)]
            self._heads[id(t)] = sorted(hs, reverse=True)
        return self._heads[id(t)]

    def assigns(self, t, name: str) -> list:
        key = (id(t), name)
        if key not in self._assigns:
            self._assigns[key] = [(m.start(), m.group(1)) for m in re.finditer(
                r"\$" + re.escape(name) + r"""\s*=\s*['"]((?:sgs|is|has)-[a-z0-9-]*[a-z0-9])['"]\s*;""", t.src)]
        return self._assigns[key]

    def calls(self, kind: str, fname: str, t) -> list:
        key = (kind, fname, id(t) if kind == "closure" else None)
        if key not in self._calls:
            call_re = re.compile((r"\$" + re.escape(fname) if kind == "closure" else r"(?<![\w$>:])" + re.escape(fname)) + r"\s*\(")
            pool = self.texts if kind == "named" else [t]
            self._calls[key] = [(tt, cm.start(), cm.end() - 1) for tt in pool if fname in tt.src for cm in call_re.finditer(tt.src)]
        return self._calls[key]

    def at(self, t, pos: int, name: str, depth: int = 0) -> set[str]:
        from wf_php import split_args

        if depth > 4:
            return set()
        before = [v for p, v in self.assigns(t, name) if p < pos]
        if before:
            return {before[-1]}
        for hpos, kind, fname, params in self.heads(t):
            if hpos >= pos:
                continue
            pnames = [(re.search(r"\$(\w+)", p) or [None, ""])[1] for p in params.split(",")]
            if name not in pnames:
                continue
            idx = pnames.index(name)
            memo = (kind, fname, idx, id(t) if kind == "closure" else None)
            if memo not in self._param:
                self._param[memo] = frozenset()   # recursion guard
                out: set[str] = set()
                for tt, cstart, paren in self.calls(kind, fname, t):
                    args = split_args(tt.src, paren)
                    if idx >= len(args):
                        continue
                    lm = LIT_ROOT_RE.match(args[idx])
                    vm = VAR_ARG_RE.match(args[idx])
                    if lm:
                        out.add(lm.group(1))
                    elif vm:
                        out |= self.at(tt, cstart, vm.group(1), depth + 1)
                self._param[memo] = frozenset(out)
            return set(self._param[memo])
        return set()


def concat_selector_classes(php_texts) -> set[str]:
    """Class tokens of selectors built from a variable block root and a BEM tail."""
    roots = RootLiterals(php_texts)
    out: set[str] = set()
    for t in roots.texts:
        for m in CONCAT_SEL_RE.finditer(t.src):
            out |= {root + m.group(2) for root in roots.at(t, m.start(), m.group(1))}
    return out


def specificity_zero(selector: str) -> bool:
    """True when every comma part of the selector is wrapped in `:where()`."""
    parts = [p.strip() for p in selector.split(",") if p.strip()]
    return bool(parts) and all(re.fullmatch(r":where\(.*\)", p, flags=re.S) for p in parts)


def decl_props(body: str) -> set[str]:
    return {m.group(1) for m in DECL_PROP_RE.finditer(body.replace("\n", " "))}


FRONTEND_JS_EXCLUDE = re.compile(r"(^|/)(edit|editor[^/]*|save|index|block|deprecated|transforms|variations)\.js$|/components/|/inspector/")


def frontend_js(plugin: Path) -> str:
    """Every front-end script's text (block view scripts and assets/js), for class
    and data-attribute consumers that are scripts rather than stylesheets."""
    parts = []
    for base in (plugin / "src", plugin / "assets" / "js"):
        for f in sorted(base.glob("**/*.js")):
            if not FRONTEND_JS_EXCLUDE.search(f.as_posix()):
                parts.append(read(f))
    return "\n".join(parts)


def data_consumed(data: set[str], css: CssIndex, js: str) -> bool:
    """A data attribute is consumed when an attribute selector or a front-end script
    reads it (by name or dataset key); an interactivity context is read by its store."""
    for d in data:
        if d.startswith("data-"):
            camel = re.sub(r"-([a-z0-9])", lambda m: m.group(1).upper(), d[5:])
            if d in css.data_attrs or d in js or ("." + camel) in js or ("'" + camel + "'") in js:
                return True
        elif d:
            return True
    return False


# `getPropertyValue( '--sgs-x' )`, `resolveColour( root, '--sgs-x' )`: a front-end script
# reading a custom property by name (a write through setProperty/removeProperty is not a read).
JS_CP_ARG_RE = re.compile(r"""\b(\w+)\s*\(\s*(?:[\w.$]+\s*,\s*)*['"`](--sgs-[a-z0-9-]*[a-z0-9])['"`]""")
JS_CP_WRITERS = frozenset({"setProperty", "removeProperty"})


def js_cp_reads(js: str) -> set[str]:
    return {m.group(2) for m in JS_CP_ARG_RE.finditer(js) if m.group(1) not in JS_CP_WRITERS}
