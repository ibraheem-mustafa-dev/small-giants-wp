"""motion_literals_scan.py - find hard-coded motion times and easings in CSS text (Spec 38A FR-38A-53).

Used by check-motion-literals.py. Nothing here hard-codes a token: `load_tokens()` reads `settings.custom.duration`
and `settings.custom.easing` from the framework `theme/sgs-theme/theme.json` at run time.

WHAT COUNTS
  A declaration of transition, transition-duration, transition-delay, transition-timing-function, animation,
  animation-duration, animation-delay or animation-timing-function (a vendor prefix is allowed), in a stylesheet or in
  the CSS text inside a PHP file. Its value may hold:
    time literal    0.5s, 300ms, .3s
    easing literal  ease, ease-in, ease-out, ease-in-out, linear, step-start, step-end, cubic-bezier(...),
                    linear(...), steps(...)
  Anything inside a `var()` is skipped, so `var(--wp--custom--duration--medium, 300ms)` is allowed.
  Comments (`/* */`, and whole-line `//` in PHP) and PHP tags are blanked first. A PHP string value ends at its
  closing quote, so text a script concatenates after the quote is not seen.

EXEMPT  `0s`, `0ms` and the reduced-motion idiom `0.01ms` switch motion off; they are counted but never failed.
  A `1ms` animation-duration is also exempt when an `animation-timeline` is declared within 300 characters of it: a
  scroll-driven animation needs a non-zero duration to run at all, and the scroll position, not the clock, drives it.

ROLE  In a shorthand the first time in each comma item is the duration and the second is the delay. A delay is
  never swapped for a duration token: it is listed as a decision.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path

THEME_REL = Path("theme/sgs-theme/theme.json")
SKIP_DIRS = {"node_modules", "build", "vendor"}
PROP = re.compile(
    r"(?<![\w$@.#-])((?:-webkit-|-moz-)?(?:transition|animation)(?:-duration|-delay|-timing-function)?)\s*:")
TIME = re.compile(r"(?<![\w.-])(-?(?:\d+\.?\d*|\.\d+)(?:ms|s))(?![\w.])")
FUNC = re.compile(r"(?<![\w-])(cubic-bezier|linear|steps)\(")
KEYWORD = re.compile(r"(?<![\w-])(ease-in-out|ease-in|ease-out|ease|linear|step-start|step-end)(?![\w(-])")
VAR = re.compile(r"(?<![\w-])var\(")
NUMBER = re.compile(r"-?\d*\.?\d+")


@dataclass
class Finding:
    file: str
    line: int
    prop: str
    literal: str
    kind: str
    role: str
    start: int
    end: int
    exempt: bool = False
    match: tuple[str, str] | None = None
    nearest: str = ""
    selector: str = ""
    allowed: bool = False
    extra: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {"file": self.file, "line": self.line, "property": self.prop, "literal": self.literal,
                "kind": self.kind, "role": self.role, "exempt": self.exempt,
                "exact_token": f"{self.match[0]}.{self.match[1]}" if self.match else None,
                "nearest": self.nearest}


def parse_ms(text: str) -> Decimal:
    return Decimal(text[:-2]) if text.endswith("ms") else Decimal(text[:-1]) * 1000


def norm_easing(text: str) -> str:
    return NUMBER.sub(lambda m: format(float(m.group()), "g"), re.sub(r"\s+", "", text.lower()))


def load_tokens(root: Path) -> dict:
    custom = json.loads((root / THEME_REL).read_text(encoding="utf-8"))["settings"]["custom"]
    return {"duration": {k: parse_ms(v) for k, v in custom["duration"].items()},
            "easing": {k: norm_easing(v) for k, v in custom["easing"].items()}}


def _blank(chars: list[str], start: int, end: int) -> None:
    for i in range(start, end):
        if chars[i] != "\n":
            chars[i] = " "


def _close(text: str, open_at: int) -> int:
    """Index just past the parenthesis that closes the one at `open_at` (end of text when unbalanced)."""
    depth = 0
    for i in range(open_at, len(text)):
        depth += (text[i] == "(") - (text[i] == ")")
        if depth == 0:
            return i + 1
    return len(text)


def mask(text: str, php: bool) -> str:
    """Same-length copy with comments, PHP tags and var() contents blanked (newlines kept)."""
    chars = list(text)
    patterns = [r"/\*.*?\*/", r"<\?(?:php\b|=)[^\n]*?\?>", r"<\?php\b", r"\{\$[^}]*\}", r"#\{[^}]*\}"]
    if php:
        patterns.append(r"(?m)^[ \t]*(?://|#)[^\n]*$")
    for pattern in patterns:
        for m in re.finditer(pattern, text, re.S):
            _blank(chars, m.start(), m.end())
    masked = "".join(chars)
    for m in VAR.finditer(masked):
        _blank(chars, m.end(), _close(masked, m.end() - 1) - 1)
    return "".join(chars)


def _working(value: str) -> tuple[str, list[tuple[int, int]]]:
    """`value` with easing functions blanked, and the (start, end) of each function."""
    chars, spans = list(value), []
    for m in FUNC.finditer(value):
        end = _close(value, m.end() - 1)
        spans.append((m.start(), end))
        _blank(chars, m.start(), end)
    return "".join(chars), spans


def _classify(f: Finding, tokens: dict) -> None:
    if f.kind == "time":
        ms = parse_ms(f.literal)
        f.exempt = ms == 0 or ms == Decimal("0.01")
        if f.role == "delay" or f.exempt:
            f.nearest = "delay: no duration token" if f.role == "delay" and not f.exempt else ""
            return
        for key, val in tokens["duration"].items():
            if val == ms:
                f.match = ("duration", key)
                return
        near = min(tokens["duration"].items(), key=lambda kv: (abs(kv[1] - ms), kv[1]))
        f.nearest = f"duration.{near[0]} ({near[1]}ms)"
        return
    norm = norm_easing(f.literal)
    for key, val in tokens["easing"].items():
        if val == norm:
            f.match = ("easing", key)
            return
    f.nearest = "no token"


def scan_text(text: str, rel: str, tokens: dict) -> list[Finding]:
    php = rel.endswith(".php")
    masked = mask(text, php)
    end_chars = r"[^;{}'\"]*"
    found: list[Finding] = []
    for pm in PROP.finditer(masked):
        prop = pm.group(1).split("-", 2)[-1] if pm.group(1).startswith("-") else pm.group(1)
        base = pm.end()
        value = re.compile(end_chars).match(masked, base).group()
        work, spans = _working(value)
        items, pos = [], 0
        for part in work.split(","):
            items.append((pos, pos + len(part)))
            pos += len(part) + 1
        hits: list[tuple[int, int, str, str]] = []
        if not prop.endswith("-timing-function"):
            for tm in TIME.finditer(work):
                hits.append((tm.start(1), tm.end(1), "time", tm.group(1)))
        if not prop.endswith(("-duration", "-delay")):
            hits += [(s, e, "easing", value[s:e]) for s, e in spans]
            hits += [(km.start(1), km.end(1), "easing", km.group(1)) for km in KEYWORD.finditer(work)]
        hits.sort()
        seen_time: dict[int, int] = {}
        # a var() that is not an easing reference occupies a time slot, so a literal after it is the delay
        slots = [vm.start() for vm in VAR.finditer(value)
                 if not re.match(r"\s*--[\w-]*(?:ease|easing|timing)", text[base + vm.end():base + vm.end() + 60])]
        for s, e, kind, lit in sorted(hits + [(p, p, "slot", "") for p in slots]):
            if kind == "slot":
                idx = next(i for i, (a, b) in enumerate(items) if a <= s <= b)
                seen_time[idx] = seen_time.get(idx, 0) + 1
                continue
            role = "easing"
            if kind == "time":
                idx = next(i for i, (a, b) in enumerate(items) if a <= s <= b)
                n = seen_time.get(idx, 0)
                seen_time[idx] = n + 1
                role = "delay" if prop.endswith("-delay") or (n >= 1 and prop.endswith(("transition", "animation"))) \
                    else "duration"
            f = Finding(rel, text.count("\n", 0, base + s) + 1, prop, lit, kind, role, base + s, base + e)
            _classify(f, tokens)
            if (f.literal == "1ms" and f.prop.endswith("duration")
                    and "animation-timeline" in masked[max(0, base - 300):base + len(value) + 300]):
                f.exempt, f.match, f.nearest = True, None, ""
            found.append(f)
    return found


def selector_at(masked: str, pos: int) -> str:
    depth = 0
    for i in range(pos - 1, -1, -1):
        ch = masked[i]
        if ch == "}":
            depth += 1
        elif ch == "{":
            if depth == 0:
                j = i - 1
                while j >= 0 and masked[j] not in ";{}":
                    j -= 1
                return re.sub(r"\s+", " ", masked[j + 1:i]).strip()
            depth -= 1
    return ""


def source_files(root: Path) -> list[Path]:
    """The stylesheets and the PHP files that can emit CSS under src/blocks and includes, as sorted absolute paths."""
    base = root / "plugins/sgs-blocks"
    files: set[Path] = set()
    blocks = base / "src/blocks"
    for pattern in ("*.css", "*.scss", "*.php"):
        files.update(blocks.rglob(pattern))
    files.update((base / "includes").rglob("*.php"))
    files.update((base / "assets/css").glob("*.css"))
    return sorted(p for p in files if not SKIP_DIRS & set(p.relative_to(root).parts))


def scan_repo(root: Path, tokens: dict) -> tuple[list[Finding], int]:
    out: list[Finding] = []
    files = source_files(root)
    for path in files:
        rel = path.relative_to(root).as_posix()
        out += scan_text(path.read_bytes().decode("utf-8"), rel, tokens)
    return out, len(files)


def rewrite(text: str, findings: list[Finding]) -> tuple[str, int]:
    """Swap each exact-token literal for var(--wp--custom--<family>--<key>, <literal>), last first."""
    count = 0
    for f in sorted(findings, key=lambda x: x.start, reverse=True):
        if f.match and not f.exempt and f.role != "delay":
            ref = f"var(--wp--custom--{f.match[0]}--{f.match[1]}, {f.literal})"
            text = text[:f.start] + ref + text[f.end:]
            count += 1
    return text, count
