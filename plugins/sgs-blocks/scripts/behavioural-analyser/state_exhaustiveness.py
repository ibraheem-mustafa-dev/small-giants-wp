"""state_exhaustiveness.py -- find every state-bearing selector in the framework's styles and map it (states wave, Step 2).

A *site* is one selector (one comma-separated part of a rule) that carries a token the `states` vocabulary names, with
the declarations it paints. Each site maps to exactly one of:

  setting    (a) the rule consumes a custom property the block's PHP publishes (a setting-like `var(--sgs-...)`) and the
                 block (or, for a block-less file, any block) has a `block_attributes` row tagged with that state;
  states-row (b) the state's family is one no setting is tagged for (form-field, effect, player, environment), so the
                 vocabulary row is the whole record, or the rule is fixed paint in such a family;
  register   (c) fixed paint in a tagged family, recorded in `data/state-fixed-behaviours.json` (file, selector, reason);
  unmapped   anything else: a setting-like custom property under a state with no tagged row, or fixed paint nobody recorded.

Pure functions over data: nothing here opens the DB for writing, runs PHP, or writes a file.
"""
from __future__ import annotations

import importlib.util
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import state_vocabulary  # noqa: E402
PLUGIN = HERE.parent.parent
REPO = PLUGIN.parent.parent
REGISTER = HERE / "data" / "state-fixed-behaviours.json"
# The reason `--baseline` writes for fixed paint nobody has triaged. A rule that consumes a published custom property is
# not fixed paint, so this reason never clears one: it needs a specific reason (JS-set, motion runtime, ...) or a tagged setting.
GENERIC_REASON = "fixed paint, no setting (baseline 2026-10-20)"
# A helper such as sgs_custom_property_gradient_decls( 'sgs-x', ... ) publishes `--sgs-x` plus these suffixed variants.
SUFFIX_TOKENS = frozenset(("hover", "focus", "gradient", "active", "current", "open"))
SOURCE_GLOBS = (
    ("plugins/sgs-blocks/src/blocks/**/style.css", "css"),
    ("plugins/sgs-blocks/assets/css/**/*.css", "css"),
    ("theme/sgs-theme/assets/css/**/*.css", "css"),
    ("plugins/sgs-blocks/includes/**/*.php", "php"),
)
# Families no setting is tagged for (state_vocabulary.TAGGED_FAMILIES is the tagged set): the vocabulary row is the record.
UNTAGGED_FAMILIES = frozenset(("form-field", "effect", "player", "environment"))
# SGS paints every hover look on keyboard focus too (includes/helpers-hover-state.php), so the two share settings.
EQUIVALENT = {"hover": {"hover", "focus"}, "focus": {"hover", "focus"}}

_VAR_RE = re.compile(r"var\(\s*(--[\w-]+)")
_STRING_RE = re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"")
_COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)
_BLOCK_CLASS_RE = re.compile(r"\.(?:wp-block-sgs-|sgs-)([a-z0-9]+(?:-[a-z0-9]+)*)")


@dataclass(frozen=True)
class Site:
    file: str
    selector: str
    states: tuple[str, ...]
    families: tuple[str, ...]
    block: str | None
    vars: tuple[str, ...]
    setting_like: bool = False
    origin: str = "source"
    publishers: tuple[str, ...] = ()  # block slugs whose PHP publishes a property the rule consumes
    transform_only: bool = False  # every declaration of the rule is a transform-family property


@dataclass
class Mapping:
    site: Site
    kind: str  # setting | behaviour | states-row | register | unmapped
    detail: str = ""


@dataclass
class Vocabulary:
    patterns: list[tuple[re.Pattern, str, str]] = field(default_factory=list)  # (regex, state, family)
    sources: list[dict] = field(default_factory=list)  # {source, state, family} for the live scan


def load_vocabulary(rows: list[dict], token_regex) -> Vocabulary:
    """Every `states` row whose token a selector can carry (media tokens have no selector form)."""
    vocab = Vocabulary()
    for r in rows:
        src = token_regex(r)
        if src:
            vocab.patterns.append((re.compile(src), r["state"], r["family"]))
            vocab.sources.append({"source": src, "state": r["state"], "family": r["family"]})
    return vocab


def selector_states(selector: str, vocab: Vocabulary) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """The (states, families) of every vocabulary token the selector carries; a token only inside `:not( ... )` says
    "not in that state" and counts for nothing (the classifier's rule)."""
    sel = selector.lower()
    states: list[str] = []
    families: list[str] = []
    for pattern, state, family in vocab.patterns:
        if any(not state_vocabulary._negated(sel, m.start()) for m in pattern.finditer(sel)):
            if state not in states:
                states.append(state)
            if family not in families:
                families.append(family)
    return tuple(states), tuple(families)


def norm_selector(selector: str) -> str:
    """A selector in the form both the source and the browser's CSSOM agree on, so a register entry written from source
    matches the live rule: spacing inside brackets and around combinators, quotes, `:first-child`, and per-block uids."""
    s = re.sub(r"\s+", " ", selector.replace("'", '"')).strip()
    s = re.sub(r"\(\s+", "(", s)
    s = re.sub(r"\s+\)", ")", s)
    s = re.sub(r"\s*([>+~])\s*", r"\1", s)
    s = s.replace(":first-child", ":nth-child(1)")
    return re.sub(r"(?<=-)[0-9a-f]{8}\b", "<uid>", s)


def split_selector_list(selector: str) -> list[str]:
    """Top-level comma parts of a selector list, whitespace collapsed."""
    parts, depth, cur = [], 0, []
    for ch in selector:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    parts.append("".join(cur))
    return [re.sub(r"\s+", " ", p).strip() for p in parts if p.strip()]


def load_rule_walker():
    """`_iter_rule_blocks` from the classifier (extract-signatures.py): the one stylesheet walker, reused not copied."""
    spec = importlib.util.spec_from_file_location("sgs_extract_signatures", HERE / "extract-signatures.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module._iter_rule_blocks


def block_for(file: str, selector: str, block_slugs: frozenset[str]) -> str | None:
    """The block a site belongs to: its folder under src/blocks, else the longest `.sgs-<block>` class in the selector."""
    m = re.match(r"plugins/sgs-blocks/src/blocks/([^/]+)/", file)
    if m:
        return "sgs/" + m.group(1)
    for cls in _BLOCK_CLASS_RE.findall(selector):
        parts = cls.split("-")
        for n in range(len(parts), 0, -1):
            slug = "sgs/" + "-".join(parts[:n])
            if slug in block_slugs:
                return slug
    return None


# The PHP helpers whose first argument is a bare property name (includes/helpers-tokens.php::sgs_custom_property_gradient_decls
# prefixes it with `--` and adds the `-gradient`, `-hover` and `-hover-gradient` variants).
BARE_NAME_HELPERS = ("sgs_custom_property_gradient_decls",)


def php_names(text: str) -> set[str]:
    """Every `--name` a PHP source writes. A name followed by a concatenation, a placeholder or a variable is a prefix,
    stored with a trailing `*`; any other name is exact."""
    out = set()
    # A bare quoted `'sgs-x-y'` as the first argument of a custom-property helper is the name the helper turns into
    # `--sgs-x-y`; stored with a trailing `~` (suffix variants allowed). A quoted string anywhere else (a handle, an
    # action name) publishes nothing.
    for m in re.finditer(r"\b(?:" + "|".join(BARE_NAME_HELPERS) + r")\(\s*['\"](sgs-[a-z0-9]+(?:-[a-z0-9]+)+)['\"]", text):
        out.add("--" + m.group(1) + "~")
    for m in re.finditer(r"(--[a-z][a-z0-9-]*)((?:['\"]\s*\.)|%|\{\$|\$)?", text):
        if not m.group(2):
            out.add(m.group(1))
        elif m.group(1).count("-") >= 4:  # `--sgs-` alone would claim every variable
            out.add(m.group(1) + "*")
    return out


def published_vars(root: Path) -> dict[str, set[str]]:
    """block slug (or '*' for shared PHP) -> every `--name` string a PHP file publishes; a name ending in '-' is a prefix."""
    out: dict[str, set[str]] = {"*": set()}
    php_roots = [(root / "plugins/sgs-blocks/includes", "*"), (root / "theme/sgs-theme", "*")]
    for base, key in php_roots:
        for p in base.rglob("*.php"):
            out[key] |= php_names(p.read_text(encoding="utf-8", errors="replace"))
    for p in (root / "plugins/sgs-blocks/src/blocks").glob("*/*.php"):
        out.setdefault("sgs/" + p.parent.name, set()).update(php_names(p.read_text(encoding="utf-8", errors="replace")))
    return out


def _name_matches(var: str, n: str) -> bool:
    if n.endswith("*"):
        return var.startswith(n[:-1])
    if n.endswith("~"):
        stem = n[:-1]
        return var == stem or (var.startswith(stem + "-") and set(var[len(stem) + 1:].split("-")) <= SUFFIX_TOKENS)
    return var == n


def publishers(var: str, published: dict[str, set[str]]) -> tuple[str, ...]:
    """Every pool key ('*' for shared PHP, else a block slug) whose PHP publishes `var`."""
    return tuple(k for k, pool in published.items() if any(_name_matches(var, n) for n in pool))


def is_published(var: str, block: str | None, published: dict[str, set[str]]) -> bool:
    """Published by ANY block's PHP or shared PHP: a rule in one block's stylesheet may read a property another block
    (a child, a parent) writes (accordion's rotation is published by accordion-item's render.php)."""
    return bool(publishers(var, published))


def setting_vars(body: str, block: str | None, published: dict[str, set[str]]) -> tuple[str, ...]:
    """Custom properties a rule body consumes that the block's PHP publishes (theme tokens `--wp--*` never count)."""
    found = [v for v in _VAR_RE.findall(body) if not v.startswith("--wp--") and is_published(v, block, published)]
    return tuple(dict.fromkeys(found))


TRANSFORM_PROPS = frozenset({"transform", "rotate", "scale", "translate", "transform-origin"})


def transform_only(body: str) -> bool:
    """Whether every declaration of a rule body is a transform-family property."""
    props = [d.split(":", 1)[0].strip().lower() for d in body.split(";") if ":" in d]
    return bool(props) and all(p in TRANSFORM_PROPS for p in props)


def scan_css_text(file: str, text: str, walker, vocab: Vocabulary, block_slugs: frozenset[str], published, origin="source") -> list[Site]:
    sites = []
    for selector, body in walker(_COMMENT_RE.sub("", text)):
        for part in split_selector_list(selector):
            states, families = selector_states(part, vocab)
            if not states:
                continue
            block = block_for(file, part, block_slugs)
            vars_ = setting_vars(body, block, published)
            pubs = tuple(dict.fromkeys(k for v in vars_ for k in publishers(v, published) if k != "*"))
            sites.append(Site(file, part, states, families, block, vars_, bool(vars_), origin, pubs, transform_only(body)))
    return sites


def scan_php_text(file: str, text: str, vocab: Vocabulary, block_slugs: frozenset[str], published) -> list[Site]:
    """State-bearing string literals in a PHP file. The statement (up to `;`) is the rule: a placeholder or a PHP
    variable beside the literal means the declaration value comes from a setting."""
    sites = []
    for stmt in re.split(r";\s*\n|;\s*$", text):
        literals = [a or b for a, b in _STRING_RE.findall(stmt)]
        for lit in literals:
            if not re.search(r"[.#\[:]", lit) or lit.lstrip().startswith("@"):
                continue
            states, families = selector_states(lit, vocab)
            if not states:
                continue
            dynamic = bool(re.search(r"%\d*\$?[sdF]|\{\$|\$[a-z_]", " ".join(literals) + " " + re.sub(_STRING_RE, "", stmt)))
            selector = re.sub(r"\s+", " ", lit.split("{")[0]).strip()
            block = block_for(file, selector, block_slugs)
            sites.append(Site(file, selector, states, families, block, ("<php-dynamic>",) if dynamic else (), dynamic))
    return sites


def load_register(path: Path = REGISTER) -> list[dict]:
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))["entries"]


def register_index(entries: list[dict]) -> tuple[set[tuple[str, str]], set[str]]:
    return {(e["file"], norm_selector(e["selector"])) for e in entries}, {norm_selector(e["selector"]) for e in entries}


def generic_index(entries: list[dict]) -> frozenset[tuple[str, str]]:
    """The register entries that carry only the generic baseline reason."""
    return frozenset((e["file"], norm_selector(e["selector"])) for e in entries if e.get("reason") == GENERIC_REASON)


def classify(site: Site, tagged: dict[str | None, set[str]], by_file: set, by_selector: set, generic: frozenset = frozenset()) -> Mapping:
    """Map one site. `tagged`: block slug -> states tagged on its rows; key None holds every block's states."""
    families = set(site.families)
    wanted = set().union(*(EQUIVALENT.get(s, {s}) for s in site.states))
    if site.setting_like:
        if site.publishers:  # the block whose PHP writes the property holds the setting, not the block that styles the rule
            pool = set().union(*(tagged.get(pub, set()) for pub in site.publishers))
        else:
            pool = set(tagged.get(site.block, set())) if site.block else set(tagged.get(None, set()))
        if pool & wanted:
            return Mapping(site, "setting", "tagged " + "/".join(sorted(pool & wanted)))
        # Owner rule: behaviour that follows an element's real state (a toggle icon turning when its item opens) is not a
        # state look; the setting holds the resting amount and the state is only the trigger.
        if site.transform_only and site.vars:
            return Mapping(site, "behaviour", "state-driven behaviour: the setting is the amount, the state is the trigger")
        key = (site.file, norm_selector(site.selector))
        # A live scan's file is 'live:<sheet>', so its rule is matched to a generic entry by selector alone.
        if key in generic or (site.origin == "live" and key[1] in {sel for _, sel in generic}):
            return Mapping(site, "unmapped", "generic baseline reason on a rule that consumes a published custom property (" + ", ".join(site.vars[:3]) + "): tag the setting's state or record a specific reason")
        if key in by_file or (site.origin == "live" and norm_selector(site.selector) in by_selector):
            return Mapping(site, "register", "recorded")
        if families <= UNTAGGED_FAMILIES:
            return Mapping(site, "states-row", "family " + "/".join(sorted(families)))
        return Mapping(site, "unmapped", ("setting-like custom property (" + ", ".join(site.vars[:3]) + ") under a state with no tagged row") if site.vars else "setting output (generated per-page stylesheet) under a state with no tagged row")
    if families <= UNTAGGED_FAMILIES:
        return Mapping(site, "states-row", "fixed paint, family " + "/".join(sorted(families)))
    if (site.file, norm_selector(site.selector)) in by_file or (site.origin == "live" and norm_selector(site.selector) in by_selector):
        return Mapping(site, "register", "recorded")
    return Mapping(site, "unmapped", "fixed paint under a state, not recorded in the register")


def summarise(mappings: list[Mapping]) -> dict[str, dict[str, int]]:
    out: dict[str, dict[str, int]] = {}
    for m in mappings:
        row = out.setdefault(m.site.file, {"setting": 0, "behaviour": 0, "states-row": 0, "register": 0, "unmapped": 0})
        row[m.kind] += 1
    return out
