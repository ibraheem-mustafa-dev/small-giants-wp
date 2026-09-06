#!/usr/bin/env python3
"""check-fx-registration.py - every shipped fx module is registered everywhere it must be.

THE DEFECT CLASS THIS EXISTS TO KILL (D784)
----------------------------------------------------------------------------------------
An fx effect only reaches a visitor's screen if THREE independent registrations all
exist, in three different files, none of which is gated by anything today:

  1. `SGS_Motion_Registry::MODULES`   includes/class-sgs-motion-registry.php
     The script-module map. Miss the `@sgs/fx-<slug>` row and `enqueue_effect()`
     computes a module id nothing has registered - WordPress enqueues nothing, the
     browser gets no module, and no PHP warning is raised.
  2. The webpack entry               webpack.config.js
     Miss it and `build/shared/effects[/gsap]/fx-<slug>.js` is never produced, so the
     MODULES row above points at a file that does not exist on the server. A 404 for a
     module is silent to everything except the browser console.
  3. `SGS_Motion_Registry::EFFECT_STYLES` (per-effect CSS, WHERE THE EFFECT HAS ANY)
     For several effects the stylesheet IS the effect (cursor-field, magnet, particles,
     wave-gradient) - the JS only publishes custom-property VALUES. Ship the module
     without the stylesheet and the module faithfully tracks a pointer that moves
     nothing at all.

In every case the effect still registers, the panel still appears in the editor, the
client still configures it, and the page does nothing. Five features have hit this shape
independently. A comment asking nicely is not a gate.

THE DRIVER IS THE DISK, NOT A LIST
----------------------------------------------------------------------------------------
The set of effects is taken from the `fx-*.js` modules that actually EXIST under
`src/shared/effects/` and `src/shared/effects/gsap/`. It is deliberately NOT taken from
`SHIPPED_EFFECTS` in src/blocks/extensions/fx.js: that array is the EDITOR PICKER list,
and four shipped effects (`draggable`, `image-sequence`, `flip`, `carousel-loop`) have
modules and webpack entries while being deliberately absent from it. Driving off the
picker would build a gate blind to exactly those four - a gate that cannot see a quarter
of its subject. (The picker's own cross-checks are check-fx-list-drift.py's job; the two
gates are complementary, not duplicates.)

CSS IS OPT-IN - "EVERY EFFECT HAS A STYLESHEET" IS A FALSE INVARIANT
----------------------------------------------------------------------------------------
Only some effects need CSS, and asserting otherwise would produce a gate that fails on a
correct tree and gets its floor lowered until it means nothing. So R3 asserts the two
things that ARE true in both directions: every EFFECT_STYLES row names a real effect and
a file that exists, and every `assets/css/fx-*.css` file on disk is either enqueued by a
row or explicitly exempt WITH a written reason. That catches the real failure - a
stylesheet written, committed, and never enqueued - without the false one. Note also that
a filename need not match its slug: `morph` enqueues `fx-shape-routes.css`, so nothing
here may assume `fx-<slug>.css`.

THE PARSER MUST NOT PASS VACUOUSLY
----------------------------------------------------------------------------------------
This pattern-matches PHP and JS. If a construct is renamed or reshaped and a parse
matches nothing, every set comparison becomes empty-vs-empty and the gate reads green
forever. So EVERY parse asserts a floor count and hard-fails naming the file and the
construct when it comes back thin. A gate that cannot fail is worse than no gate - this
project has shipped a drift guard with a stray character in its regex that matched
nothing and passed green for hours. `--self-test`'s three blindness cases prove this arm
fires for each of the three constructs independently.

ONE TRAP WORTH NAMING: webpack.config.js contains TWO `Object.fromEntries([...].map(...))`
constructs. The first emits 13 `vendor-modules/${name}` GSAP PLUGIN entries, which are not
effects. A parser keying on `Object.fromEntries` alone swallows the wrong 13. Everything
here anchors on the `shared/effects/` entry-name prefix instead.

A FOURTH REGISTRATION SURFACE, ADDED 2026-08-26 (R5) - found investigating a stale "editor
console error" note in decisions.md D427 that turned out to already be fixed in source, but
which the three rules above could never have caught either way, before or after the fix.
----------------------------------------------------------------------------------------
R1-R4 cover the SHARED registry (`class-sgs-motion-registry.php` + `webpack.config.js`).
Two blocks - `before-after` and `testimonial-slider` - ALSO perform their OWN dynamic
`import( '@sgs/...' )` inside `view.js`, independent of the registry, to lazy-load an
externalised GSAP module. Webpack's `externalsType: 'module'` marks every externalised
specifier `buildMeta.async = false` regardless of whether the call site is a dynamic
`import()` or a static `import`, so an unmarked dynamic import silently COLLAPSES at build
time into an eagerly-resolved import - module linking happens before any runtime guard
(`isEditorSurface()`, a feature flag, anything) can run, and the specifier fails to resolve
in any context lacking that module in its import map (e.g. wp-admin, where
`SGS_Motion_Registry` deliberately never registers Tier G modules). The ONE documented fix
is the `/* webpackIgnore: true */` pragma immediately before the string literal, which
keeps the import genuinely dynamic and lets the guard around the call site actually work.
R1-R4 have no visibility into per-block `view.js` files at all, so a THIRD block copying
this dynamic-import pattern without the pragma would ship a guard that never worked and
nothing here would say so.

Run: python plugins/sgs-blocks/scripts/check-fx-registration.py
     python plugins/sgs-blocks/scripts/check-fx-registration.py --self-test
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, replace
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_PLUGIN_ROOT = Path(__file__).resolve().parent.parent

GATE = "fx-registration"

# ---------------------------------------------------------------------------
# Exemptions. Each needs a written reason, because an exemption with no reason is
# indistinguishable from a defect somebody silenced.
# ---------------------------------------------------------------------------

# R3 reverse direction: `assets/css/fx-*.css` files that deliberately have NO
# EFFECT_STYLES row. EMPTY TODAY - every fx-*.css on disk is enqueued by a row. If you
# add a name here, add the reason with it; "it's fine" is not a reason.
DECLARED_CSS_EXEMPT: dict[str, str] = {}

MODULE_PREFIX = "@sgs/fx-"
ENTRY_PREFIX = "shared/effects/"


class VacuousParse(Exception):
    """Raised when a parse returns fewer items than its floor.

    NOT an invariant breach - it means the gate lost sight of its own input and can no
    longer make any claim at all. It fails the gate loudly and separately, so a reshaped
    source file can never be mistaken for "everything is registered".
    """


def _floor(items, floor: int, path: Path, construct: str) -> None:
    """Assert a parse found at least `floor` entries, or hard-fail naming the file."""
    if len(items) < floor:
        raise VacuousParse(
            f"{path}: parsing `{construct}` found {len(items)} entr(y/ies), expected at "
            f"least {floor}. The construct has almost certainly been renamed or "
            "reshaped, which would silently turn every comparison it feeds into "
            "empty-vs-empty. Fix the parser in check-fx-registration.py (and re-run "
            "--self-test), or restore the construct - do NOT lower the floor to make "
            "this pass."
        )


def _block_after(text: str, header_re: str, open_ch: str, close_ch: str, path: Path,
                 construct: str) -> str:
    """Return the balanced `open_ch`...`close_ch` body following the first match of
    `header_re`. Balanced rather than a lazy regex so nested arrays inside a body (every
    MODULES row contains its own `array( ... )` of deps) cannot truncate the match."""
    match = re.search(header_re, text)
    if match is None:
        raise VacuousParse(
            f"{path}: could not locate `{construct}` (pattern {header_re!r}). It has "
            "been renamed, moved or reshaped - every comparison fed by it would "
            "silently become empty-vs-empty. Fix the parser in check-fx-registration.py."
        )
    start = text.find(open_ch, match.end() - 1)
    if start == -1:
        raise VacuousParse(f"{path}: found `{construct}` but no opening {open_ch!r} after it.")
    depth = 0
    for index in range(start, len(text)):
        if text[index] == open_ch:
            depth += 1
        elif text[index] == close_ch:
            depth -= 1
            if depth == 0:
                return text[start + 1:index]
    raise VacuousParse(f"{path}: `{construct}` opening {open_ch!r} is never closed.")


def _strip_php_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    text = re.sub(r"//[^\n]*", "", text)
    return re.sub(r"(?m)^\s*#[^\n]*", "", text)


def _strip_js_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return re.sub(r"//[^\n]*", "", text)


# ---------------------------------------------------------------------------
# The tree under test.
#
# The three TEXTS are carried as strings, not read on demand, so --self-test can perturb
# in-memory copies without ever writing to the real tree. The DISK facts (which modules
# exist, which stylesheets exist) stay real in every mode - a self-test that faked those
# too would be testing its own fixtures rather than the gate.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Tree:
    root: Path
    registry_php: str
    webpack_js: str
    # R5's self-test override: {view.js Path -> perturbed text}, read INSTEAD of disk
    # when a path is a key here. None everywhere else, so real runs never consult it.
    view_js_overrides: "dict[Path, str] | None" = None

    @property
    def registry_path(self) -> Path:
        return self.root / "includes" / "class-sgs-motion-registry.php"

    @property
    def webpack_path(self) -> Path:
        return self.root / "webpack.config.js"

    @property
    def view_js_paths(self) -> list[Path]:
        """Every block `view.js` on disk - R5's corpus. Not cached as text like the
        other two files because R5 needs to name the OFFENDING FILE per violation, not
        just fail one shared blob; a self-test perturbing "the" view.js text would have
        no single file to perturb."""
        blocks_dir = self.root / "src" / "blocks"
        if not blocks_dir.is_dir():
            return []
        return sorted(blocks_dir.glob("*/view.js"))

    def read_view_js(self, path: Path) -> str:
        if self.view_js_overrides and path in self.view_js_overrides:
            return self.view_js_overrides[path]
        return path.read_text(encoding="utf-8")

    @staticmethod
    def load(root: Path = _PLUGIN_ROOT) -> "Tree":
        blank = Tree(root=root, registry_php="", webpack_js="")
        for path in (blank.registry_path, blank.webpack_path):
            if not path.exists():
                raise VacuousParse(
                    f"{path} does not exist - this gate reads it as an input and cannot "
                    "verify anything without it."
                )
        return Tree(
            root=root,
            registry_php=blank.registry_path.read_text(encoding="utf-8"),
            webpack_js=blank.webpack_path.read_text(encoding="utf-8"),
        )


# ---------------------------------------------------------------------------
# The driver set - the fx modules that actually exist on disk.
# ---------------------------------------------------------------------------

def parse_drivers(tree: Tree) -> dict[str, str]:
    """slug -> tier ('' for the Tier V root dir, 'gsap' for the Tier G subdir).

    The tier is a FACT ABOUT WHERE THE SOURCE LIVES, and it is what R1/R2 compare the
    two registrations against: a gsap-dir module registered at the root build path
    resolves to a 404, which is silent everywhere but the browser console.
    """
    effects_dir = tree.root / "src" / "shared" / "effects"
    if not effects_dir.is_dir():
        raise VacuousParse(
            f"{effects_dir} does not exist as a directory - the driver set for this "
            "entire gate comes from it, so nothing at all can be verified without it."
        )
    drivers: dict[str, str] = {}
    for tier in ("", "gsap"):
        directory = effects_dir / tier if tier else effects_dir
        if not directory.is_dir():
            continue
        for module in sorted(directory.glob("fx-*.js")):
            drivers[module.name[len("fx-"):-len(".js")]] = tier
    _floor(drivers, 10, effects_dir, "the fx-*.js modules on disk (the driver set)")
    return drivers


def expected_build_path(slug: str, tier: str) -> str:
    middle = f"{ENTRY_PREFIX}{tier}/" if tier else ENTRY_PREFIX
    return f"build/{middle}fx-{slug}.js"


def expected_entry_name(slug: str, tier: str) -> str:
    middle = f"{ENTRY_PREFIX}{tier}/" if tier else ENTRY_PREFIX
    return f"{middle}fx-{slug}"


# ---------------------------------------------------------------------------
# Target 1 - the script-module map.
# ---------------------------------------------------------------------------

def parse_modules(tree: Tree) -> dict[str, str]:
    """`private const MODULES` -> {slug: declared build path} for the `@sgs/fx-*` rows.

    Only rows whose key starts `@sgs/fx-` are collected: the same array also registers
    the GSAP vendor plugins (`@sgs/gsap-*`) and the shared provider, which are not
    effects and have no driver module of their own.
    """
    path = tree.registry_path
    body = _strip_php_comments(
        _block_after(
            tree.registry_php,
            r"private\s+const\s+MODULES\s*=\s*array\s*\(",
            "(", ")", path, "SGS_Motion_Registry::MODULES",
        )
    )
    keys = re.findall(r"'" + re.escape(MODULE_PREFIX) + r"([a-z0-9-]+)'\s*=>", body)
    _floor(keys, 10, path, "the @sgs/fx-* keys of MODULES")

    pairs = dict(
        re.findall(
            r"'" + re.escape(MODULE_PREFIX) + r"([a-z0-9-]+)'\s*=>\s*array\s*\(\s*"
            r"'path'\s*=>\s*'([^']*)'",
            body,
        )
    )
    missing_path = sorted(set(keys) - set(pairs))
    if missing_path:
        raise VacuousParse(
            f"{path}: {len(missing_path)} MODULES row(s) matched as keys but their "
            f"`'path' => '...'` could not be read ({', '.join(missing_path)}). The row "
            "shape has changed, so R1's path check would silently verify nothing. Fix "
            "the parser in check-fx-registration.py."
        )
    return pairs


# ---------------------------------------------------------------------------
# Target 2 - the webpack entries. TWO shapes, and a third construct that is a trap.
# ---------------------------------------------------------------------------

# `path.resolve( process.cwd(), 'src', ... )` - the inner `process.cwd()` parentheses
# mean a naive `([^)]*)` argument capture stops dead at the FIRST close-paren and yields
# nothing. The shape is pinned explicitly instead, and _EXPLICIT_NAME_RE below counts the
# entry names independently so an entry written in some other shape cannot go unnoticed.
_EXPLICIT_ENTRY_RE = re.compile(
    r"'(" + re.escape(ENTRY_PREFIX) + r"[A-Za-z0-9/_-]+)'\s*:\s*path\.resolve\(\s*"
    r"process\.cwd\(\)\s*,([^)]*)\)"
)
_EXPLICIT_NAME_RE = re.compile(
    r"'(" + re.escape(ENTRY_PREFIX) + r"[A-Za-z0-9/_-]+)'\s*:\s*path\.resolve\("
)

# Anchored on the `shared/effects/` prefix INSIDE the template literal, never on
# `Object.fromEntries` - the other fromEntries in this file emits `vendor-modules/${name}`
# GSAP plugin entries, which this must not collect.
_MAPPED_ENTRY_RE = re.compile(
    r"\[([^\[\]]*)\]\s*\.map\(\s*\(\s*\w+\s*\)\s*=>\s*\[\s*"
    r"`(" + re.escape(ENTRY_PREFIX) + r"[A-Za-z0-9/_-]*)\$\{",
    re.DOTALL,
)


def parse_webpack_entries(tree: Tree) -> dict[str, str]:
    """entry name -> the source file it resolves to, relative to the plugin root.

    Covers both fx entry shapes plus the two non-fx `shared/effects/` entries
    (`gsap/provider`, `smooth-scroll`), which R4 checks resolve to real files just like
    the rest.
    """
    path = tree.webpack_path
    text = _strip_js_comments(tree.webpack_js)
    entries: dict[str, str] = {}

    explicit = _EXPLICIT_ENTRY_RE.findall(text)
    _floor(explicit, 4, path, f"the explicit '{ENTRY_PREFIX}...' : path.resolve(...) entries")
    declared_names = _EXPLICIT_NAME_RE.findall(text)
    unparsed = sorted(set(declared_names) - {name for name, _args in explicit})
    if unparsed:
        raise VacuousParse(
            f"{path}: {len(unparsed)} explicit '{ENTRY_PREFIX}...' entr(y/ies) matched by "
            f"name but their path.resolve(...) arguments could not be read "
            f"({', '.join(unparsed)}). R4 would silently skip them. Fix the parser in "
            "check-fx-registration.py."
        )
    for name, args in explicit:
        segments = re.findall(r"'([^']+)'", args)
        entries[name] = "/".join(segments) if segments else ""

    mapped = _MAPPED_ENTRY_RE.findall(text)
    _floor(mapped, 1, path, f"the [...].map(...) block emitting `{ENTRY_PREFIX}...` entries")
    mapped_names: list[str] = []
    for array_body, prefix in mapped:
        for name in re.findall(r"'([A-Za-z0-9/_-]+)'", array_body):
            mapped_names.append(name)
            tier_dir = prefix[len(ENTRY_PREFIX):].strip("/")
            source = ["src", "shared", "effects"] + ([tier_dir] if tier_dir else []) + [f"{name}.js"]
            entries[f"{prefix}{name}"] = "/".join(source)
    _floor(mapped_names, 4, path, "the effect names inside that .map(...) array")

    _floor(entries, 10, path, f"all '{ENTRY_PREFIX}...' webpack entries combined")
    return entries


# ---------------------------------------------------------------------------
# Target 3 - the per-effect CSS map.
# ---------------------------------------------------------------------------

def parse_effect_styles(tree: Tree) -> dict[str, str]:
    """`private const EFFECT_STYLES` -> {bare slug: stylesheet path}.

    Keys are BARE slugs here, not `@sgs/`-prefixed, and the filename need not match the
    slug (`morph` => `fx-shape-routes.css`).
    """
    path = tree.registry_path
    body = _strip_php_comments(
        _block_after(
            tree.registry_php,
            r"private\s+const\s+EFFECT_STYLES\s*=\s*array\s*\(",
            "(", ")", path, "SGS_Motion_Registry::EFFECT_STYLES",
        )
    )
    rows = dict(re.findall(r"'([a-z0-9-]+)'\s*=>\s*'([^']+)'", body))
    _floor(rows, 4, path, "the rows of EFFECT_STYLES")
    return rows


# ---------------------------------------------------------------------------
# Target 4 (R5) - per-block view.js dynamic imports of an externalised @sgs/ module.
# ---------------------------------------------------------------------------

# A dynamic `import(...)` whose sole string-literal argument is an `@sgs/`-prefixed
# specifier. Captures the leading comment slot (group 1) separately from the specifier
# (group 2) so a present-but-wrong pragma (typo, `webpackIgnore: false`) is distinguishable
# from an absent one.
_SGS_DYNAMIC_IMPORT_RE = re.compile(
    r"import\(\s*(/\*.*?\*/\s*)?['\"](@sgs/[a-z0-9-]+)['\"]\s*\)", re.DOTALL
)
_WEBPACK_IGNORE_RE = re.compile(r"/\*\s*webpackIgnore\s*:\s*true\s*\*/")


@dataclass(frozen=True)
class DynamicImportSite:
    file: Path
    specifier: str
    has_ignore_pragma: bool


def parse_view_js_dynamic_imports(tree: Tree) -> list[DynamicImportSite]:
    """Every `import( '@sgs/...' )` call site across `src/blocks/*/view.js`.

    Reads each file fresh rather than relying on a cached blob (unlike registry_php/
    webpack_js) because a violation must name the OFFENDING FILE, and because new blocks
    are added to this corpus over time - caching it in the dataclass would go stale the
    moment a block gains its own view.js.

    Matched against the RAW file text - deliberately NOT comment-stripped first. A
    generic `/\\*.*?\\*/` stripper is unsound on THIS EXACT CORPUS: `before-after/view.js`
    documents this very bug in a `//` line comment that quotes the code path as
    `` `gsap/*` `` -\\> \\`@sgs/gsap-*\\` `` - those two backtick-quoted characters are a
    literal `/*`, so a naive stripper opens a false comment there and silently swallows
    everything up to the next real `*/`, which turned out to be the ACTUAL pragma this
    rule exists to find. Anchoring tightly on `import(` immediately before the optional
    comment and `)` immediately after the specifier avoids the whole hazard: nothing
    elsewhere in the file can match this shape by accident.
    """
    sites: list[DynamicImportSite] = []
    for path in tree.view_js_paths:
        text = tree.read_view_js(path)
        for match in _SGS_DYNAMIC_IMPORT_RE.finditer(text):
            pragma_slot, specifier = match.group(1), match.group(2)
            sites.append(
                DynamicImportSite(
                    file=path,
                    specifier=specifier,
                    has_ignore_pragma=bool(
                        pragma_slot and _WEBPACK_IGNORE_RE.search(pragma_slot)
                    ),
                )
            )
    return sites


# ---------------------------------------------------------------------------
# Target 5 (R6) - a block's own view.js statically importing a bare `@sgs/`
# specifier, added 2026-08-27 (D-branch4).
#
# Distinct from R5 above: R5 covers a DYNAMIC `import('@sgs/...')` written directly in
# SOURCE. This is a STATIC `import ... from '...'` - possibly a `gsap/Xyz` alias, not
# necessarily an `@sgs/` literal in source - that webpack's `GSAP_MODULE_IDS` map
# (webpack.config.js) resolves to a bare `@sgs/...` specifier at build time. Reading
# BUILT view.js was tried first and rejected: `check-fx-registration` runs in the
# PRE-webpack gate chain (`scripts/gates.json`, tier "fast"), after the `clean-build`
# generator step deletes `build/` and before webpack ever repopulates it - so any rule
# that requires `build/` to exist would raise VacuousParse on every fresh checkout and
# on the very build that is supposed to prove this rule right. `GSAP_MODULE_IDS` is a
# small, flat object literal in webpack.config.js and is parseable from source with the
# same confidence R1-R4 already place in that file, so translating the alias here
# (rather than reading the compiled output) keeps this rule genuinely pre-build.
#
# WHY THIS IS A DISTINCT FAILURE FROM R1-R5: a static bare-specifier import needs an
# IMPORT MAP entry to resolve (unlike a `<script src>` tag, which fetches by URL and
# needs no map entry for itself). WP core's `WP_Script_Modules::get_import_map()`
# deliberately excludes QUEUE members from the map ("they get printed as scripts") and
# includes only their registered DEPENDENCIES - so a block's OWN viewScriptModule
# (auto-registered by WP core from `view.asset.php`'s 'dependencies' key) must declare
# every bare `@sgs/*` specifier it imports, or those entries never reach the map at all,
# regardless of whether the underlying module is separately enqueued elsewhere. There is
# no need to read `view.asset.php` itself to know this: `view.asset.php` is generated by
# @wordpress/dependency-extraction-webpack-plugin, which only ever recognises
# `@wordpress/*` externals - it is a tooling limitation, not a per-block fact, so its
# 'dependencies' key is ALWAYS `array()` for every block regardless of what that block's
# view.js imports. The only working fix shape is a compensating
# `wp_register_script_module()` call for that exact view module id, registered BEFORE WP
# core's own auto-registration (`init` priority below 10; core's own runs at the default
# priority 10 from `SGS_Blocks::register_blocks()`) - core's registration is a NO-OP once
# the id already exists, so anything correcting the deps AFTER core's own call (e.g. from
# render.php, at render time) can never take effect. Proven live on the canary
# 2026-08-27: an attempt to do exactly that shipped, deployed, purged both cache layers,
# and changed nothing; moving the same call to
# `SGS_Motion_Registry::preregister_physics_canvas_deps()` on `init` priority 5 is what
# actually fixed it.
#
# Floor of 1 driver, not the usual higher floor: today only ONE block (physics-canvas)
# has this pattern. A floor of 1 still catches the parse going vacuous (0 found) without
# demanding a count this corpus does not have yet.
# ---------------------------------------------------------------------------

# `gsap: '@sgs/gsap',` (bare identifier key) plus every `'gsap/Xyz': '@sgs/...'` /
# `'@sgs/motion-provider': '@sgs/motion-provider'` quoted-key row.
_GSAP_MODULE_IDS_RE = re.compile(
    r"^\s*(?:'([^']+)'|([A-Za-z_$][A-Za-z0-9_$]*))\s*:\s*'(@sgs/[a-z0-9-]+)'\s*,",
    re.MULTILINE,
)
_STATIC_IMPORT_RE = re.compile(r"import\s+[^;'\"]*?\s+from\s+['\"]([^'\"]+)['\"]")
_REGISTER_SCRIPT_MODULE_CALL_RE = re.compile(
    r"wp_register_script_module\(\s*'([^']+)'\s*,[^,]*,\s*array\(([^)]*)\)",
    re.DOTALL,
)


def parse_gsap_module_ids(tree: Tree) -> dict[str, str]:
    """source specifier (e.g. `gsap/Draggable`, bare `gsap`) -> the bare `@sgs/...`
    specifier webpack's externals resolver rewrites it to, from `GSAP_MODULE_IDS` in
    webpack.config.js."""
    path = tree.webpack_path
    body = _block_after(
        tree.webpack_js,
        r"const\s+GSAP_MODULE_IDS\s*=\s*\{",
        "{", "}", path, "GSAP_MODULE_IDS",
    )
    mapping: dict[str, str] = {}
    for quoted_key, bare_key, target in _GSAP_MODULE_IDS_RE.findall(body):
        mapping[quoted_key or bare_key] = target
    _floor(mapping, 8, path, "the GSAP_MODULE_IDS source -> @sgs/* specifier map")
    return mapping


def parse_view_js_static_bare_imports(tree: Tree) -> dict[str, set[str]]:
    """block-relative view.js SOURCE path -> the bare `@sgs/*` specifiers it statically
    imports, resolved through GSAP_MODULE_IDS where the import is an aliased `gsap/Xyz`
    path rather than an `@sgs/...` literal already."""
    module_ids = parse_gsap_module_ids(tree)
    result: dict[str, set[str]] = {}
    for view_js in tree.view_js_paths:
        text = tree.read_view_js(view_js)
        specifiers: set[str] = set()
        for spec in _STATIC_IMPORT_RE.findall(text):
            if spec.startswith("@sgs/"):
                specifiers.add(spec)
            elif spec in module_ids:
                specifiers.add(module_ids[spec])
        if specifiers:
            result[view_js.relative_to(tree.root).as_posix()] = specifiers
    _floor(result, 1, tree.root / "src" / "blocks", "view.js files with a static bare @sgs/* import")
    return result


def parse_preregistered_deps(tree: Tree) -> dict[str, set[str]]:
    """module id -> declared deps, for every `wp_register_script_module()` CALL SITE
    in `class-sgs-motion-registry.php` (not the MODULES const array R1/R2/R4 already
    cover - a genuine PHP function call, e.g. `preregister_physics_canvas_deps()`)."""
    return {
        module_id: set(re.findall(r"'([^']+)'", deps_body))
        for module_id, deps_body in _REGISTER_SCRIPT_MODULE_CALL_RE.findall(tree.registry_php)
    }


def css_files_on_disk(tree: Tree) -> set[str]:
    """The `assets/css/fx-*.css` files that exist, as plugin-root-relative paths."""
    directory = tree.root / "assets" / "css"
    if not directory.is_dir():
        raise VacuousParse(
            f"{directory} does not exist as a directory - R3's reverse direction reads "
            "it and cannot verify anything without it."
        )
    return {f"assets/css/{p.name}" for p in directory.glob("fx-*.css")}


# ---------------------------------------------------------------------------
# The invariants.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Violation:
    rule: str
    detail: str
    fix: str


_RULES = {
    "R1": "every fx module has a MODULES row whose path matches its source tier",
    "R2": "every fx module has a webpack entry named for its source tier",
    "R3": "EFFECT_STYLES rows name real effects and real files, and no fx-*.css is orphaned",
    "R4": "no MODULES row or shared/effects webpack entry points at a missing source file",
    "R5": "every view.js dynamic import( '@sgs/...' ) carries the webpackIgnore pragma",
    "R6": "every built view.js static bare @sgs/* import is a declared dependency somewhere",
}


def evaluate(tree: Tree) -> list[Violation]:
    drivers = parse_drivers(tree)
    modules = parse_modules(tree)
    entries = parse_webpack_entries(tree)
    styles = parse_effect_styles(tree)
    css_on_disk = css_files_on_disk(tree)
    dynamic_import_sites = parse_view_js_dynamic_imports(tree)
    # Floor of 2, not 1: today's two known call sites (before-after, testimonial-slider).
    # A parse that suddenly finds 0 or 1 has lost the construct, not proven the tree
    # clean - same "the parser must not pass vacuously" discipline R1-R4 already apply.
    _floor(
        dynamic_import_sites, 2,
        tree.root / "src" / "blocks", "view.js dynamic import('@sgs/...') call sites",
    )
    static_bare_imports = parse_view_js_static_bare_imports(tree)
    preregistered_deps = parse_preregistered_deps(tree)

    violations: list[Violation] = []

    # ---- R1: driver -> MODULES, including the tier the path declares ----------
    for slug in sorted(drivers):
        tier = drivers[slug]
        wanted = expected_build_path(slug, tier)
        if slug not in modules:
            violations.append(Violation(
                "R1",
                f"`fx-{slug}.js` exists on disk but there is no `{MODULE_PREFIX}{slug}` "
                "row in `SGS_Motion_Registry::MODULES`. enqueue_effect() derives that "
                "exact module id, so WordPress registers nothing, the browser is sent "
                "nothing, and no warning is raised anywhere - the panel still appears "
                "and the effect silently does nothing.",
                f"Add '{MODULE_PREFIX}{slug}' => array( 'path' => '{wanted}', 'deps' => "
                "array( ... ) ) to MODULES in includes/class-sgs-motion-registry.php.",
            ))
            continue
        if modules[slug] != wanted:
            violations.append(Violation(
                "R1",
                f"`{MODULE_PREFIX}{slug}` declares path `{modules[slug]}` but its source "
                f"lives in `src/{ENTRY_PREFIX}{tier + '/' if tier else ''}`, so webpack "
                f"emits `{wanted}`. The registered path points at a file that is never "
                "built - a 404 for a script module is silent to PHP and to the build.",
                f"Change that row's path to '{wanted}', or move the source module to the "
                "tier directory the path already claims.",
            ))

    # ---- R2: driver -> webpack entry, same tier -------------------------------
    for slug in sorted(drivers):
        tier = drivers[slug]
        wanted = expected_entry_name(slug, tier)
        if wanted in entries:
            continue
        wrong_tier = [name for name in entries if name.rsplit("/", 1)[-1] == f"fx-{slug}"]
        if wrong_tier:
            violations.append(Violation(
                "R2",
                f"`fx-{slug}.js` lives in `src/{ENTRY_PREFIX}{tier + '/' if tier else ''}` "
                f"but its webpack entry is named `{wrong_tier[0]}`. The emitted bundle "
                "path will not be the one MODULES registers, so the module 404s.",
                f"Rename that entry to '{wanted}' in webpack.config.js.",
            ))
        else:
            violations.append(Violation(
                "R2",
                f"`fx-{slug}.js` exists on disk but has NO webpack entry. "
                f"`build/{wanted}.js` is therefore never produced, so the MODULES row "
                "that registers it points at a file that does not exist on the server. "
                "The build passes green and the effect does nothing.",
                f"Add '{wanted}' to the vendorEntries object in webpack.config.js "
                + ("(the `.map(...)` array of gsap effect names)." if tier else
                   "(an explicit `path.resolve( process.cwd(), 'src', 'shared', "
                   "'effects', ... )` entry)."),
            ))

    # ---- R3: CSS, both directions --------------------------------------------
    # NOT "every effect has CSS" - CSS is opt-in and only 8 of the effects use it.
    for slug in sorted(styles):
        asset = styles[slug]
        if slug not in drivers:
            violations.append(Violation(
                "R3",
                f"`EFFECT_STYLES` enqueues `{asset}` for effect `{slug}`, which has no "
                f"`fx-{slug}.js` module on disk. The row is dead - either the effect was "
                "removed and this was left behind, or the key is misspelled and the real "
                "effect is shipping with no stylesheet at all.",
                f"Delete the `{slug}` row from EFFECT_STYLES, or correct the key to the "
                "slug of the module it was meant to style.",
            ))
        if not (tree.root / asset).is_file():
            violations.append(Violation(
                "R3",
                f"`EFFECT_STYLES['{slug}']` points at `{asset}`, which does not exist. "
                "The enqueue resolves to a missing file, so for any effect whose "
                "stylesheet IS the effect the module runs and paints nothing.",
                f"Create {asset}, or correct the path in EFFECT_STYLES "
                "(includes/class-sgs-motion-registry.php).",
            ))

    referenced = set(styles.values())
    for asset in sorted(css_on_disk - referenced):
        name = asset.rsplit("/", 1)[-1]
        if name in DECLARED_CSS_EXEMPT:
            continue
        violations.append(Violation(
            "R3",
            f"`{asset}` exists but no `EFFECT_STYLES` row enqueues it. A stylesheet that "
            "is written, committed and never enqueued is the exact failure this gate "
            "exists for: the effect registers, the panel appears, the client configures "
            "it, and nothing paints.",
            f"Add a row to EFFECT_STYLES mapping the owning effect slug to '{asset}' "
            f"(includes/class-sgs-motion-registry.php), or - if it is enqueued some "
            f"other way or deliberately unused - add '{name}' to DECLARED_CSS_EXEMPT in "
            "check-fx-registration.py WITH the reason.",
        ))

    # ---- R4: reverse / dangling ----------------------------------------------
    for slug in sorted(modules):
        declared = modules[slug]
        source = tree.root / declared.replace("build/", "src/", 1)
        if not source.is_file():
            violations.append(Violation(
                "R4",
                f"`{MODULE_PREFIX}{slug}` is registered with path `{declared}`, but no "
                f"source module exists at `{source.relative_to(tree.root).as_posix()}`. "
                "Nothing will ever be built there, so the registration is a permanent "
                "404 that no build step can notice.",
                f"Restore the source module, or delete the `{MODULE_PREFIX}{slug}` row "
                "from MODULES in includes/class-sgs-motion-registry.php.",
            ))

    for name in sorted(entries):
        source_rel = entries[name]
        if not source_rel or not (tree.root / source_rel).is_file():
            violations.append(Violation(
                "R4",
                f"webpack entry `{name}` resolves to "
                f"`{source_rel or '(unparseable path.resolve arguments)'}`, which is not "
                "a file. webpack fails on a missing entry, so this is a broken build "
                "waiting for the next clean checkout rather than a silent one.",
                f"Restore that source file, or remove the `{name}` entry from "
                "webpack.config.js.",
            ))

    # ---- R5: view.js dynamic imports of an externalised @sgs/ module --------
    for site in dynamic_import_sites:
        if site.has_ignore_pragma:
            continue
        rel = site.file.relative_to(tree.root).as_posix()
        violations.append(Violation(
            "R5",
            f"`{rel}` calls `import( '{site.specifier}' )` with no `/* webpackIgnore: "
            "true */` pragma. webpack's `externalsType: 'module'` marks EVERY "
            "externalised specifier non-async regardless of call site, so this "
            "dynamic import silently collapses into an eagerly-resolved one at build "
            "time - module linking happens before any runtime guard around the call "
            "site (an editor check, a feature flag, a try/catch) can run. In any "
            "context where the registry does not register this module (wp-admin, "
            "chiefly - SGS_Motion_Registry only ever registers on the frontend), the "
            "browser throws an uncaught 'Failed to resolve module specifier "
            f"\"{site.specifier}\"' the moment this file is evaluated, whether or not "
            "the guarded code path is ever reached.",
            f"Add `/* webpackIgnore: true */` immediately before the "
            f"'{site.specifier}' string literal in `{rel}` (see "
            "`before-after/view.js`'s `bootDraggableLayer` or "
            "`testimonial-slider/view.js`'s momentum loader for the pattern).",
        ))

    # ---- R6: view.js static bare @sgs/* imports must resolve ----------------
    for view_js_rel, specifiers in sorted(static_bare_imports.items()):
        block_dir = view_js_rel.split("/")[2]  # src/blocks/<dir>/view.js
        module_id = f"sgs-{block_dir}-view-script-module"
        covering_deps = preregistered_deps.get(module_id, set())
        missing = sorted(specifiers - covering_deps)
        for specifier in missing:
            violations.append(Violation(
                "R6",
                f"`{view_js_rel}` statically imports `{specifier}` (directly, or via a "
                "webpack-aliased `gsap/Xyz` path resolved through GSAP_MODULE_IDS), but "
                f"no `wp_register_script_module( '{module_id}', ... )` call in "
                "`class-sgs-motion-registry.php` declares it as a dependency. Its "
                "auto-registered `view.asset.php` 'dependencies' key is ALWAYS empty "
                "for this specifier - @wordpress/dependency-extraction-webpack-plugin "
                "never recognises `@sgs/*` externals - so `WP_Script_Modules::"
                "get_import_map()` (which excludes QUEUE members from the import map "
                "and includes only their registered DEPENDENCIES) has no import-map "
                "entry to resolve this specifier against, and the browser throws "
                f"'Failed to resolve module specifier \"{specifier}\"' the moment "
                "this module evaluates - even if the underlying module is separately "
                "enqueued elsewhere on the same page.",
                f"Add a `wp_register_script_module( '{module_id}', ..., array( "
                f"'{specifier}', ... ) )` call hooked to `init` at a priority BELOW 10 "
                "in `class-sgs-motion-registry.php::register()` (core's own "
                "auto-registration runs at the default priority 10 and is a no-op "
                "once the id already exists, so this must register FIRST) - see "
                "`preregister_physics_canvas_deps()` for the pattern.",
            ))

    return violations


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def check(tree: Tree) -> int:
    try:
        violations = evaluate(tree)
    except VacuousParse as exc:
        print(f"[{GATE}] FAIL - VACUOUS PARSE. The gate cannot see its own input, so it "
              "has verified nothing.")
        print(f"    {exc}")
        return 1

    drivers = parse_drivers(tree)
    if violations:
        print(f"[{GATE}] FAIL - {len(violations)} registration gap(s) across "
              f"{len(drivers)} fx module(s):")
        for violation in violations:
            print(f"  {violation.rule}: {violation.detail}")
            print(f"    FIX: {violation.fix}")
        return 1

    print(f"[{GATE}] PASS - {len(drivers)} fx module(s); all {len(_RULES)} rules hold "
          f"({', '.join(_RULES)}).")
    return 0


# ---------------------------------------------------------------------------
# --self-test
#
# Table-driven, over IN-MEMORY copies of the source text. Nothing is ever written to
# disk. Every mutation ASSERTS IT LANDED (apply() returns None on a missed anchor) before
# its result is trusted: a `.replace()` that silently matched nothing would make a case
# vacuously "pass" - a false negative control, which is worse than no case at all.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class _Case:
    rule: str            # the rule that must fire, or "VACUOUS"
    label: str
    field: str           # "registry_php" or "webpack_js"
    pattern: str
    replacement: str
    # Most breaks are surgical: exactly ONE substitution, and zero-or-many means the
    # anchor is stale and the case proves nothing. A blindness case is the exception -
    # reshaping a construct means rewriting EVERY occurrence of it, so those set
    # `min_hits` above 1 and accept any count at or above it.
    min_hits: int = 1

    def apply(self, before: str) -> str | None:
        """Return the perturbed text, or None if the break did not land as specified."""
        if self.min_hits == 1:
            after, count = re.subn(self.pattern, self.replacement, before, count=1)
            return after if count == 1 else None
        after, count = re.subn(self.pattern, self.replacement, before)
        return after if count >= self.min_hits else None


_CASES = (
    _Case(
        "R1", "delete the @sgs/fx-magnet row from MODULES",
        "registry_php",
        r"'@sgs/fx-magnet'\s*=>\s*array\(\s*'path'\s*=>\s*'[^']*',\s*'deps'\s*=>\s*array\([^)]*\),\s*\),",
        "",
    ),
    _Case(
        # Not a deletion: point the row at the WRONG tier. Proves R1 checks the path's
        # tier directory rather than merely the key's existence - the failure mode where
        # the row is present, looks right, and 404s.
        "R1", "point @sgs/fx-scrub at the root tier instead of gsap/",
        "registry_php",
        r"'build/shared/effects/gsap/fx-scrub\.js'",
        "'build/shared/effects/fx-scrub.js'",
    ),
    _Case(
        "R2", "delete the explicit fx-particles webpack entry",
        "webpack_js",
        r"'shared/effects/fx-particles'\s*:\s*path\.resolve\([^)]*\),",
        "",
    ),
    _Case(
        # Proves shape (b) - the `.map(...)` array - is genuinely parsed, not assumed.
        "R2", "delete 'fx-flip' from the gsap .map(...) array",
        "webpack_js",
        r"\n\t+'fx-flip',",
        "",
    ),
    _Case(
        "R3", "point an EFFECT_STYLES row at a stylesheet that does not exist",
        "registry_php",
        r"'magnet'(\s*)=>(\s*)'assets/css/fx-magnet\.css',",
        r"'magnet'\1=>\2'assets/css/fx-magnet-does-not-exist.css',",
    ),
    _Case(
        "R3", "add an EFFECT_STYLES key that is not a real effect slug",
        "registry_php",
        r"('particles'\s*=>\s*'assets/css/fx-particles\.css',)",
        r"\1\n\t\t'selftest-ghost'  => 'assets/css/fx-particles.css',",
    ),
    _Case(
        "R4", "add a dangling @sgs/fx-ghost row to MODULES",
        "registry_php",
        r"('@sgs/fx-particles'\s*=>\s*array\(\s*'path'\s*=>\s*'[^']*',)",
        r"\1 'deps' => array(), ),\n\t\t'@sgs/fx-ghost' => array( 'path' => "
        r"'build/shared/effects/fx-ghost.js',",
    ),
    _Case(
        # field="view_js:<relative path>" - a third field shape only R5 recognises,
        # perturbing Tree.view_js_overrides instead of a registry_php/webpack_js blob.
        "R5", "strip the webpackIgnore pragma from before-after's gsap-draggable import",
        "view_js:before-after/view.js",
        r"/\*\s*webpackIgnore:\s*true\s*\*/\s*(['\"]@sgs/gsap-draggable['\"])",
        r"\1",
    ),
    _Case(
        # Drops '@sgs/gsap-inertia' from preregister_physics_canvas_deps()'s deps
        # array - the exact live regression this rule exists to catch (D-branch4,
        # 2026-08-27). physics-canvas/view.js's BUILT file still imports it; nothing
        # else declares it as a dependency of the view module once this row is gone.
        "R6", "drop @sgs/gsap-inertia from preregister_physics_canvas_deps()'s deps",
        "registry_php",
        r"array\( '@sgs/motion-provider', '@sgs/gsap-draggable', '@sgs/gsap-inertia', "
        r"'@sgs/gsap-physics2d' \)",
        "array( '@sgs/motion-provider', '@sgs/gsap-draggable', '@sgs/gsap-physics2d' )",
    ),
    # ---- blindness: each construct blanked in turn ----------------------------
    _Case(
        "VACUOUS", "rename MODULES so its parse matches nothing",
        "registry_php",
        r"private const MODULES\s*=\s*array\(",
        "private const MODULES_RENAMED_BY_SELFTEST = array(",
    ),
    _Case(
        # NOT count=1: renaming a single occurrence leaves the other eighteen entries
        # perfectly parseable, so the gate would correctly report a violation and the
        # blindness arm would never be exercised. A construct reshape rewrites them ALL.
        "VACUOUS", "reshape every shared/effects entry name in webpack.config.js",
        "webpack_js",
        r"shared/effects/",
        "shared/effectsRENAMED/",
        # 9 occurrences today (8 explicit entry names + the one gsap template
        # literal); the floor is 5 so the case still asserts a MASS rewrite landed
        # without re-breaking every time an entry is added or removed.
        min_hits=5,
    ),
    _Case(
        "VACUOUS", "rename EFFECT_STYLES so its parse matches nothing",
        "registry_php",
        r"private const EFFECT_STYLES\s*=\s*array\(",
        "private const EFFECT_STYLES_RENAMED_BY_SELFTEST = array(",
    ),
)


def _self_test() -> int:
    try:
        clean = Tree.load()
    except VacuousParse as exc:
        print(f"[{GATE} --self-test] FAIL - cannot load the tree: {exc}")
        return 1

    failures: list[str] = []

    # Case 0 - the negative control. The clean tree must PASS, and every parse must be
    # non-vacuous, or every case below is measuring nothing.
    try:
        baseline = evaluate(clean)
        drivers = parse_drivers(clean)
        modules = parse_modules(clean)
        entries = parse_webpack_entries(clean)
        styles = parse_effect_styles(clean)
    except VacuousParse as exc:
        print(f"[{GATE} --self-test] FAIL - baseline parse is vacuous: {exc}")
        return 1
    if baseline:
        print(f"[{GATE} --self-test] FAIL - expected a clean baseline, got "
              f"{len(baseline)} violation(s):")
        for violation in baseline:
            print(f"    {violation.rule}: {violation.detail}")
        return 1
    print(f"[{GATE} --self-test] [0] negative control: clean tree passes; parses are "
          f"non-vacuous ({len(drivers)} drivers, {len(modules)} MODULES fx rows, "
          f"{len(entries)} shared/effects entries, {len(styles)} EFFECT_STYLES rows)")

    for index, case in enumerate(_CASES, start=1):
        # "view_js:<relative path>" is a synthetic field only R5 uses: it perturbs ONE
        # named file inside Tree.view_js_overrides rather than one of the two cached
        # text blobs, because R5's corpus is "every view.js on disk", not a single file.
        is_view_js_case = case.field.startswith("view_js:")
        if is_view_js_case:
            rel = case.field[len("view_js:"):]
            target_path = clean.root / "src" / "blocks" / rel
            before = target_path.read_text(encoding="utf-8")
        else:
            before = getattr(clean, case.field)
        after = case.apply(before)
        if after is None:
            failures.append(f"{case.rule}/{case.label}")
            print(f"[{GATE} --self-test] [{index}] {case.rule}: {case.label} - THE BREAK "
                  f"DID NOT LAND (anchor {case.pattern!r} matched 0 or >1 times in "
                  f"{case.field}). Nothing was broken, so 'no violation' proves nothing. "
                  "Update the anchor in _CASES.")
            continue

        if is_view_js_case:
            broken = replace(clean, view_js_overrides={target_path: after})
        else:
            broken = replace(clean, **{case.field: after})
        if case.rule == "VACUOUS":
            try:
                evaluate(broken)
                failures.append(f"VACUOUS/{case.label}")
                print(f"[{GATE} --self-test] [{index}] VACUOUS: {case.label} - NOT "
                      "CAUGHT. Every comparison it feeds is empty-vs-empty; this gate "
                      "would read green forever.")
            except VacuousParse as exc:
                print(f"[{GATE} --self-test] [{index}] VACUOUS: {case.label} - caught: "
                      f"{str(exc)[:110]}...")
            continue

        try:
            found = evaluate(broken)
            caught = [v for v in found if v.rule == case.rule]
        except VacuousParse as exc:
            found, caught = [], []
            print(f"[{GATE} --self-test] [{index}] {case.rule}: parse went vacuous "
                  f"instead of reporting a violation: {exc}")
        if caught:
            print(f"[{GATE} --self-test] [{index}] {case.rule}: {case.label} - caught "
                  f"({len(caught)} msg): {caught[0].detail[:88]}...")
        else:
            failures.append(f"{case.rule}/{case.label}")
            other = ", ".join(sorted({v.rule for v in found})) or "none"
            print(f"[{GATE} --self-test] [{index}] {case.rule}: {case.label} - NOT "
                  f"CAUGHT by {case.rule} (fired: {other})")

    # The tree object is immutable and nothing was written; re-confirm anyway, because
    # "I never wrote to disk" is a claim and this is the observation.
    if evaluate(Tree.load()):
        print(f"[{GATE} --self-test] FAIL - the real tree is no longer clean. The "
              "self-test must never touch disk.")
        return 1

    if failures:
        print(f"[{GATE} --self-test] FAIL - unproven: {', '.join(failures)}. Those rules "
              "read green forever. Fix the check.")
        return 1
    print(f"[{GATE} --self-test] PASS - {len(_CASES)} break case(s) plus the negative "
          "control: each rule provably fails on its own break, all three parses fail "
          "closed when blinded, and the real tree is untouched.")
    return 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(_self_test())
    try:
        sys.exit(check(Tree.load()))
    except VacuousParse as exc:
        print(f"[{GATE}] FAIL - VACUOUS PARSE.\n    {exc}")
        sys.exit(1)
