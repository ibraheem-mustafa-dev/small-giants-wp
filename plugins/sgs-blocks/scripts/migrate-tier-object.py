#!/usr/bin/env python3
"""migrate-tier-object.py — collapse a flat per-device attribute trio into ONE tier object.

    <prop> / <prop>Tablet / <prop>Mobile   ->   <prop>: {"desktop":…, "tablet":…, "mobile":…}

Spec 35 / D549 / D554. Bean's ruling A is PROPERTY-BY-PROPERTY: one property is migrated
across every block that carries it, then the next. This script takes `--property` and does
exactly that, so each pass is the same edit repeated rather than 41 bespoke edits.

THE TRIAD (D542, and the reason this file exists at all): the thing that finds every
instance, the thing that fixes them and the thing that keeps them fixed are the SAME
detector. `--survey` (census) -> `--fix` (propose a diff) -> `--check` (gate).
⛔ `--fix` NEVER writes without `--apply`. Modelled on scripts/migrate-core-blocks/
(README.md:24 "lint -> judge -> apply"), and it copies that tool's load-bearing rule
(README.md:22): every source attr is mapped, dropped-with-reason, or flagged — a LOUD
failure, never a quiet loss.

WHAT IT DOES NOT DO, deliberately
---------------------------------
* **No stored-content migration.** Ruling B: old canary pages are binned, not converted.
  ⚠ Consequence, and it is not hypothetical — measured on the canary 2026-08-10 for `gap`:
  1,058 stored flat values across 230 posts (31 published, 7 draft, 191 revisions). Every
  one is silently coerced to the `{}` default by WordPress once the attr is object-typed,
  because WP discards a value whose shape contradicts the declaration. Those pages render
  with the CSS default until re-cloned. That is the accepted trade, not an oversight.
* **No render.php rewriting.** A block that reads the attr itself needs a judgement call
  about its own emission, so the script REPORTS those blocks and refuses to pretend it
  handled them. Blocks that delegate to SGS_Container_Wrapper need no render change: the
  wrapper already reads an object value (class-sgs-container-wrapper.php:1948).
* **No edit.js rewriting** — same reason. The control must move to `ResponsiveOverride`,
  which is a JSX edit, not a schema edit.

THE THREE FAMILY SHAPES, and why only one of them is a target
-------------------------------------------------------------
    FLAT      base scalar + Tablet/Mobile siblings          -> MIGRATE
    BLENDED   base object + scalar siblings (half-migrated) -> DROP the orphan siblings
    OBJECT    base object, no siblings                      -> already done, skip

⛔ A base object WITH OBJECT siblings is NOT blended and is NOT a target: a per-tier ASSET
family (D521) and a per-tier BOX family (D496) are object at every tier by design. The
sibling's TYPE must differ from the base for the family to be half-migrated — same
discriminator as check-tier-storage-shape.py, deliberately, so gate and codemod agree.
"""

import argparse
import io
import json
import re
import sys
from pathlib import Path

# Windows consoles default to cp1252 and raise UnicodeEncodeError on any non-ASCII
# output — which would crash this tool AFTER it had already written files, leaving a
# half-applied migration. Standing repo rule for Python scripts on this machine.
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
TIERS = ('Tablet', 'Mobile')


def classify(attrs: dict, prop: str):
    """Return (kind, sibling_names). kind in FLAT|BLENDED|OBJECT|ASSET|ABSENT."""
    spec = attrs.get(prop)
    if not isinstance(spec, dict):
        return 'ABSENT', []
    base_type = spec.get('type')
    sibs = [prop + t for t in TIERS if isinstance(attrs.get(prop + t), dict)]
    if base_type == 'object':
        if not sibs:
            return 'OBJECT', []
        # Sibling type must DIFFER from the base for this to be half-migrated.
        if all(attrs[s].get('type') == 'object' for s in sibs):
            return 'ASSET', sibs          # consistent per-tier object family — correct as-is
        return 'BLENDED', sibs
    return ('FLAT', sibs) if sibs else ('ABSENT', [])


def reads_attr_directly(block_dir: Path, prop: str) -> int:
    rp = block_dir / 'render.php'
    if not rp.exists():
        return 0
    src = rp.read_text(encoding='utf-8', errors='replace')
    return len(re.findall(r"\[['\"]" + re.escape(prop) + r"(?:Tablet|Mobile)?['\"]\]", src))


def edit_refs(block_dir: Path, prop: str) -> int:
    ej = block_dir / 'edit.js'
    if not ej.exists():
        return 0
    src = ej.read_text(encoding='utf-8', errors='replace')
    return len(re.findall(r"\b" + re.escape(prop) + r"(?:Tablet|Mobile)?\b", src))


def survey(prop: str):
    out = []
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        attrs = data.get('attributes', {})
        kind, sibs = classify(attrs, prop)
        if kind in ('ABSENT',):
            continue
        d = bj.parent
        out.append({
            'slug': data.get('name', d.name),
            'dir': d,
            'kind': kind,
            'siblings': sibs,
            'default': attrs.get(prop, {}).get('default'),
            'base_type': attrs.get(prop, {}).get('type'),
            'render_reads': reads_attr_directly(d, prop),
            'edit_refs': edit_refs(d, prop),
        })
    return out


def build_object_default(rows) -> dict:
    """Preserve the authored default as the DESKTOP tier — dropping it would silently
    change every un-set instance's rendering, which is precisely the quiet loss this
    tool refuses to do."""
    obj = {}
    base = rows.get('default')
    if base not in (None, ''):
        obj['desktop'] = base
    for suffix, key in (('Tablet', 'tablet'), ('Mobile', 'mobile')):
        v = rows.get('sib_defaults', {}).get(suffix)
        if v not in (None, ''):
            obj[key] = v
    return obj


def apply_block_json(entry, prop: str, apply: bool):
    """Rewrite one block.json. Returns (changed, description, error)."""
    bj = entry['dir'] / 'block.json'
    raw = io.open(bj, encoding='utf-8', newline='').read()
    data = json.loads(raw)
    attrs = data['attributes']

    sib_defaults = {}
    for t in TIERS:
        name = prop + t
        if name in attrs:
            sib_defaults[t] = attrs[name].get('default')

    # A BLENDED base is ALREADY the tier object — its default is correct and must be
    # left exactly as it is. Only its orphan scalar siblings are deleted. Feeding it
    # through build_object_default would wrap the object inside itself
    # ({"desktop": {"desktop": …}}), which the retype below never applies for BLENDED —
    # but it WOULD be printed as the proposed change, and a human approving a diff
    # reads the description, not the code path. So compute it honestly per kind.
    if entry['kind'] == 'BLENDED':
        new_default = attrs[prop].get('default')
    else:
        new_default = build_object_default({'default': attrs[prop].get('default'),
                                            'sib_defaults': sib_defaults})

    out = raw
    # Delete sibling entries by exact key, preserving the file's own formatting.
    for t in TIERS:
        name = prop + t
        if name not in attrs:
            continue
        pat = re.compile(r'\n\s*"' + re.escape(name) + r'":\s*\{[^{}]*\},?')
        new = pat.sub('', out, count=1)
        if new == out:
            return False, None, f'could not delete "{name}" (nested braces? hand-edit)'
        out = new

    if entry['kind'] == 'FLAT':
        # Retype the base and swap its default for the tier object.
        pat = re.compile(r'"' + re.escape(prop) + r'":\s*\{[^{}]*\}')
        m = pat.search(out)
        if not m:
            return False, None, f'could not locate base "{prop}" declaration'
        indent = '\t\t\t'
        body = f'"{prop}": {{\n{indent}"type": "object",\n{indent}"default": ' \
               + json.dumps(new_default) + f'\n\t\t}}'
        out = out[:m.start()] + body + out[m.end():]

    # Deleting the LAST entry of an object leaves the previous entry's comma dangling.
    # JSON permits no trailing comma anywhere, so stripping one is always a repair and
    # never a semantic change — but only attempt it when the document is actually broken,
    # so a well-formed file is never rewritten by a blunt regex. Then re-validate: if it
    # still will not parse, REFUSE. Writing invalid JSON would take the block out of the
    # registry silently, which is exactly the quiet loss this tool exists to prevent.
    try:
        json.loads(out)
    except json.JSONDecodeError:
        out = re.sub(r',(\s*[}\]])', r'\1', out)
        try:
            json.loads(out)
        except json.JSONDecodeError as exc:
            return False, None, f'result would be invalid JSON ({exc.msg}) — refused'
    if apply:
        io.open(bj, 'w', encoding='utf-8', newline='').write(out)
    return True, f'default -> {json.dumps(new_default)}', None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--property', required=True, help='attribute base name, e.g. gap')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true', help='propose; writes nothing without --apply')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true', help='exit 1 if any FLAT/BLENDED remain')
    args = ap.parse_args()
    prop = args.property
    rows = survey(prop)

    if args.survey or not (args.fix or args.check):
        for kind in ('FLAT', 'BLENDED', 'OBJECT', 'ASSET'):
            group = [r for r in rows if r['kind'] == kind]
            if not group:
                continue
            print(f'\n{kind} ({len(group)}):')
            for r in group:
                extra = f"render_reads={r['render_reads']} edit_refs={r['edit_refs']}"
                print(f"   {r['slug']:28} default={json.dumps(r['default']):26} {extra}")
        targets = [r for r in rows if r['kind'] in ('FLAT', 'BLENDED')]
        print(f'\n{len(targets)} block(s) to migrate for "{prop}".')
        return 0

    if args.check:
        bad = [r for r in rows if r['kind'] in ('FLAT', 'BLENDED')]
        if bad:
            print(f'[migrate-tier-object --check] {len(bad)} block(s) still un-migrated for "{prop}":')
            for r in bad:
                print(f"   {r['slug']:28} {r['kind']}")
            return 1
        print(f'[migrate-tier-object --check] OK - "{prop}" is fully object-shaped everywhere.')
        return 0

    targets = [r for r in rows if r['kind'] in ('FLAT', 'BLENDED')]
    if not targets:
        print(f'Nothing to do for "{prop}".')
        return 0

    print(f'{"APPLYING" if args.apply else "PROPOSED (dry-run; pass --apply to write)"} '
          f'- "{prop}" across {len(targets)} block(s)\n')
    follow_up, errors = [], []
    for r in targets:
        ok, desc, err = apply_block_json(r, prop, args.apply)
        if err:
            errors.append((r['slug'], err))
            print(f"   {r['slug']:28} ⛔ REFUSED: {err}")
            continue
        verb = 'siblings dropped; default UNCHANGED' if r['kind'] == 'BLENDED' else desc
        print(f"   {r['slug']:28} {r['kind']:8} {verb}")
        if r['render_reads']:
            follow_up.append((r['slug'], 'render.php', r['render_reads']))
        if r['edit_refs']:
            follow_up.append((r['slug'], 'edit.js', r['edit_refs']))

    if follow_up:
        print('\n⚠ MANUAL FOLLOW-UP REQUIRED (reported, never silently skipped):')
        for slug, f, n in follow_up:
            print(f'   {slug:28} {f:12} {n} reference(s)')
        print('   render.php: read the object via sgs_responsive_normalise_object().')
        print('   edit.js   : move the control to <ResponsiveOverride>.')
    if errors:
        print(f'\n⛔ {len(errors)} block(s) REFUSED — nothing was written for them.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
