"""CSS consumer index (link L6 and the editor.css shadowing rule S1).

Parses every front-end stylesheet the plugin and theme ship (`.css` and nested
`.scss`, `//` comments stripped, declarations before a nested rule kept, `&`
resolved against the parent selector), plus `var(--sgs-…)` readers built in PHP
and any `var(--sgs-…)` template a postbuild CSS injector writes. Editor-only
stylesheets are indexed separately: they never count as a front-end consumer,
and they feed S1.
"""
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from wf_php import read

CP_READ_RE = re.compile(r"var\(\s*(--sgs-[a-z0-9-]+)")
CLASS_TOKEN_RE = re.compile(r"\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)")
DATA_ATTR_SEL_RE = re.compile(r"\[\s*(data-[a-z0-9-]+)")
DECL_PROP_RE = re.compile(r"(?:^|;)\s*([a-z-]+)\s*:")
EDITOR_SHEET_RE = re.compile(r"(^|/)editor[^/]*\.s?css$")
# Postbuild scripts that rewrite built CSS (package.json::scripts.postbuild).
INJECTOR_GLOBS = ("scripts/shadow-lift/*.js", "scripts/shadow-fallback/*.js", "scripts/hover-guard/*.js")


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

    def has_class(self, token: str) -> bool:
        """Exact class, or a prefix ending in `-`/`--`/`__` built dynamically."""
        if token in self.class_tokens:
            return True
        if token.endswith(("-", "_")):
            return any(t.startswith(token) for t in self.class_tokens)
        return False

    def cp_read(self, cp: str) -> bool:
        if cp.endswith("-"):
            return any(k.startswith(cp) for k in self.cp_readers) or any(
                k.startswith(cp) for k in self.php_cp_readers | self.injector_cp_readers
            )
        return bool(self.cp_readers.get(cp)) or cp in self.php_cp_readers or cp in self.injector_cp_readers


def stylesheet_files(plugin: Path, theme: Path) -> list[Path]:
    files: list[Path] = []
    for pat in ("src/**/*.css", "src/**/*.scss", "assets/**/*.css"):
        files += plugin.glob(pat)
    if theme.exists():
        files += theme.glob("**/*.css")
    return sorted(f for f in files if "node_modules" not in f.parts and "build" not in f.parts)


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
    for t in php_texts:
        idx.php_cp_readers.update(CP_READ_RE.findall(t.src))
        # Selectors a PHP emitter writes (`'.sgs-x--y{'`) are class rules too.
        idx.class_tokens.update(m.group(1) for m in re.finditer(r"\.((?:sgs|is|has)-[a-z0-9_-]+)\s*[{:,> .\[]", t.src))
        idx.data_attrs.update(DATA_ATTR_SEL_RE.findall(t.src))
    for pat in INJECTOR_GLOBS:
        for f in sorted(plugin.glob(pat)):
            idx.injector_cp_readers.update(CP_READ_RE.findall(read(f)))
    return idx


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
