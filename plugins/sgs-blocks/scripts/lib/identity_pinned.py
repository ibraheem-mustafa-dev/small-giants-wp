"""identity_pinned -- the markup that code outside the repo prints, read from pinned source (plan
`.claude/plans/2026-10-30-clone-recognition-fixes.md` F1, the extractor fix track).

Two outside sources reach SGS block output and are read here instead of being left `unknown`:

- WordPress core. `refresh_core( <wordpress root> )` reads a core install (a local mirror, e.g.
  `//wsl.localhost/Ubuntu/var/www/local-sandybrown`) with the same reader the blocks use (`identity_sources.py` +
  `identity_scan.py`): for each function in `identity_sources.CORE_MARKUP_CALLS`, the tags, roles and ARIA attributes
  its body and every core function it calls can print; and the kses allowlists (`post`, `data`) evaluated by PHP from
  `wp-includes/kses.php`. The result, with the core version and each file's sha256, is the committed snapshot
  `scripts/data/core-markup-facts.json`, so a seed or a drift check reads a fixed file, never a live install. A function
  whose output keeps a dynamic site the reader cannot settle, or that hands its output to code registered at run time
  (`do_shortcode`, a template part), is recorded `unknown` with the reason. Output that third-party plugins add through
  core's filters is outside this snapshot (core as shipped).
- npm packages a view script imports (GSAP). `npm_file()` resolves a bare import to its file under the plugin's
  `node_modules`, and only when the installed version equals the one `package-lock.json` pins; the caller reads the
  file with the same JS reader. A package that is absent or unpinned stays outside the repo (`unknown`).

    python plugins/sgs-blocks/scripts/lib/identity_pinned.py --refresh-core <wordpress root>   # rewrite the snapshot
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import identity_scan as S  # noqa: E402
import identity_sources as I  # noqa: E402

PLUGIN = HERE.parents[1]
SNAPSHOT = PLUGIN / "scripts" / "data" / "core-markup-facts.json"
# Core calls whose output is content registered at run time (shortcodes, template parts): never settled by reading core.
RUNTIME_CONTENT = frozenset({"do_shortcode", "block_template_part", "get_the_block_template_html"})


def load_core(path: Path = SNAPSHOT) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _kses_sets(root: Path) -> dict:
    """The `post` and `data` kses allowlists, evaluated by PHP from the install's own kses.php."""
    code = (
        "define('CUSTOM_TAGS', false); function apply_filters($h, $v) { return $v; } "
        f"include {json.dumps(str(root / 'wp-includes' / 'kses.php'))}; "
        "$out = array(); foreach (array('post' => $allowedposttags, 'data' => $allowedtags) as $k => $set) { "
        "$attrs = array(); foreach ($set as $t => $a) { if (is_array($a)) { $attrs = array_merge($attrs, array_keys($a)); } } "
        "$out[$k] = array('tags' => array_keys($set), 'attributes' => array_values(array_unique($attrs))); } "
        "echo json_encode($out);"
    )
    proc = subprocess.run(["php", "-r", code], capture_output=True, text=True, timeout=60)
    if proc.returncode != 0:
        raise SystemExit(f"php could not evaluate kses.php: {proc.stderr.strip()[:300]}")
    raw = json.loads(proc.stdout)
    out = {}
    for ctx, spec in raw.items():
        attrs = set(spec["attributes"])
        out[ctx] = {
            "tags": sorted(t for t in spec["tags"] if S._tag_name(t)),
            "aria": sorted(a for a in attrs if a in S.ARIA_ATTRS),
            "role": "role" in attrs,
        }
    return out


def refresh_core(root: Path) -> dict:
    version = re.search(r"\$wp_version\s*=\s*'([^']+)'", (root / "wp-includes" / "version.php").read_text(encoding="utf-8")).group(1)
    index = I.RepoIndex(root, [root / "wp-includes"], root / "none", root / "none")
    funcs = {}
    for name in sorted(I.CORE_MARKUP_CALLS):
        units = index.functions.get(name)
        if not units:
            funcs[name] = {"unknown": f"no definition of {name} in wp-includes {version}"}
            continue
        reached, ext = index.closure(units[:1], max_units=600)
        tags, roles, arias, dyn = set(), set(), set(), []
        for u in reached:
            sc = S.scan(index.unit_tokens(u))
            tags |= set(sc.tags)
            roles |= set(sc.roles)
            arias |= set(sc.arias)
            dyn += [f"{d.fact} from {d.expr or 'a variable'} at {u.key}" for d in sc.dyn]
        rec = {"evidence": f"WordPress {version} {units[0].key}", "tags": sorted(tags), "roles": sorted(roles), "aria": sorted(arias)}
        if name in RUNTIME_CONTENT:
            rec["unknown"] = f"{name} prints content registered at run time"
        elif dyn:
            rec["unknown"] = "; ".join(sorted(set(dyn))[:3])
        funcs[name] = rec
    files = {}
    for rel in sorted({u.file.relative_to(root).as_posix() for us in index.functions.values() for u in us
                       if any(x is u for n in I.CORE_MARKUP_CALLS for x in index.functions.get(n, []))} | {"wp-includes/kses.php", "wp-includes/version.php"}):
        files[rel] = hashlib.sha256((root / rel).read_bytes()).hexdigest()
    return {"_meta": {"purpose": "WordPress core's markup output read from pinned source by identity_pinned.py --refresh-core; "
                      "read by the identification facts (block_identity_facts.py). Core as shipped: third-party filters are not part of it.",
                      "wordpress": version, "files": files},
            "functions": funcs, "kses": _kses_sets(root)}


# ---------------------------------------------------------------------------------------------------------------------
# npm packages
# ---------------------------------------------------------------------------------------------------------------------

@lru_cache(maxsize=None)
def _lock(plugin: Path) -> dict:
    try:
        return json.loads((plugin / "package-lock.json").read_text(encoding="utf-8")).get("packages") or {}
    except (OSError, ValueError):
        return {}


def npm_file(spec: str, plugin: Path = PLUGIN) -> tuple[Path | None, str]:
    """The file a bare import resolves to and the pinned `<package>@<version>`, or (None, reason)."""
    parts = spec.split("/")
    pkg = "/".join(parts[:2]) if spec.startswith("@") else parts[0]
    sub = "/".join(parts[2:] if spec.startswith("@") else parts[1:])
    base = plugin / "node_modules" / pkg
    pinned = (_lock(plugin).get(f"node_modules/{pkg}") or {}).get("version")
    try:
        installed = json.loads((base / "package.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None, f"{pkg} is not installed (node_modules)"
    if not pinned or installed.get("version") != pinned:
        return None, f"{pkg} {installed.get('version')} is not the version package-lock.json pins ({pinned})"
    if sub:
        cand = [base / sub, base / f"{sub}.js", base / sub / "index.js"]
    else:
        cand = [base / (installed.get("module") or installed.get("main") or "index.js"), base / "index.js"]
    for c in cand:
        if c.is_file():
            return c, f"{pkg}@{pinned}"
    return None, f"{spec} does not resolve to a file in {pkg}@{pinned}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--refresh-core", type=Path, metavar="WP_ROOT", help="read a WordPress install and rewrite the snapshot")
    args = ap.parse_args()
    if not args.refresh_core:
        ap.print_help()
        return 0
    snap = refresh_core(args.refresh_core)
    SNAPSHOT.write_text(json.dumps(snap, indent="\t", ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[identity-pinned] wrote {SNAPSHOT.relative_to(PLUGIN.parents[1]).as_posix()} from WordPress {snap['_meta']['wordpress']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
