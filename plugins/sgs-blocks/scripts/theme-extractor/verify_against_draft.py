"""verify_against_draft.py — compare a theme snapshot with the design its export declares (FR-33-1 gate).

Every value an export's ``tokens/*.css`` declares for a job the snapshot holds (``declared_tokens.expectations``:
heading sizes, line heights and tracking, the body size, line height and colour, the gutter and section padding per
tier, the focus ring, the display and body families, the heading and link colours) and every palette colour Bean's
confirmed intake marks give a slug (``confirmed_palette.confirmed_map``) is compared with the snapshot's value at that
path, preset and palette references resolved. A difference is a mismatch unless the client's accepted file lists its
path with a reason (``sites/<client>/build/theme-verify-accepted.json``: ``{"accepted": [{"path", "reason"}]}``).

    python verify_against_draft.py --client <slug> [--snapshot <file>] [--handoff <dir>] [--intake <file>]
                                   [--accepted <file>] [--json]

Exit 0 when every mismatch is accepted, 1 when one is not, 2 on unusable input. ``report`` is the importable form
``extract.py`` prints after a run (non-fatal there).
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

PKG = pathlib.Path(__file__).resolve().parent
if str(PKG) not in sys.path:
    sys.path.insert(0, str(PKG))

import confirmed_palette  # noqa: E402
import declared_tokens  # noqa: E402
import token_files  # noqa: E402
from colour import parse_colour  # noqa: E402

REPO = PKG.parents[3]
ACCEPTED_NAME = "theme-verify-accepted.json"
_STYLE_REF = re.compile(r"^var:preset\|(color|font-size|font-family|spacing)\|([a-z0-9-]+)$")
_CSS_REF = re.compile(r"^var\(--wp--preset--(color|font-size|font-family|spacing)--([a-z0-9-]+)\)$")
_NUM = re.compile(r"^(-?\d*\.?\d+)(px)?$")


def _get(snap: dict, path: str):
    node = snap
    for key in path.split("."):
        if not isinstance(node, dict) or key not in node:
            return None
        node = node[key]
    return node


def _preset(snap: dict, kind: str, slug: str):
    settings = snap.get("settings") or {}
    if kind == "color":
        rows = (settings.get("color") or {}).get("palette") or []
        own = next((e.get("color") for e in rows if e.get("slug") == slug), None)
        if own is not None:
            return own
        # A framework role the palette does not carry points at a shade (or holds a raw hex) in settings.custom.colourRoles.
        pointed = ((settings.get("custom") or {}).get("colourRoles") or {}).get(slug)
        if isinstance(pointed, str) and not pointed.startswith("#"):
            return next((e.get("color") for e in rows if e.get("slug") == pointed), None)
        return pointed
    if kind == "font-size":
        rows = (settings.get("typography") or {}).get("fontSizes") or []
        return next((e.get("size") for e in rows if e.get("slug") == slug), None)
    if kind == "font-family":
        rows = (settings.get("typography") or {}).get("fontFamilies") or []
        return next((e.get("fontFamily") for e in rows if e.get("slug") == slug), None)
    rows = (settings.get("spacing") or {}).get("spacingSizes") or []
    return next((e.get("size") for e in rows if e.get("slug") == slug), None)


def resolve(snap: dict, value):
    """A snapshot value with preset references followed to the value they print."""
    for _ in range(4):
        if not isinstance(value, str):
            return value
        m = _STYLE_REF.match(value.strip()) or _CSS_REF.match(value.strip())
        if not m:
            return value
        value = _preset(snap, m.group(1), m.group(2))
    return value


def snapshot_value(snap: dict, path: str):
    if path.startswith("settings.typography.fontFamilies."):
        stack = _preset(snap, "font-family", path.rsplit(".", 1)[1])
        return stack.split(",")[0].strip().strip("'\"") if isinstance(stack, str) else None
    return resolve(snap, _get(snap, path))


def same(expected, got) -> bool:
    if got is None:
        return False
    e, g = str(expected).strip().lower(), str(got).strip().lower()
    ce, cg = parse_colour(e), parse_colour(g)
    if ce and cg:
        return ce.key == cg.key
    me, mg = _NUM.match(e), _NUM.match(g)
    if me and mg and (me.group(2) == mg.group(2) or float(me.group(1)) == 0 == float(mg.group(1))):
        return abs(float(me.group(1)) - float(mg.group(1))) < 0.005
    return re.sub(r"\s+", "", e) == re.sub(r"\s+", "", g)


def palette_expectations(intake: dict | None, baseline: dict, handoff: pathlib.Path | None = None) -> list[dict]:
    """One row per confirmed slug. A ``custom-<name>`` slug whose every token is an alias (``var(--x)``) is skipped: an
    alias is no palette entry (FR-32-28), the shade it points at is the entry."""
    if not intake:
        return []
    framework = confirmed_palette.framework_slugs(baseline)
    confirmed, _unmarked = confirmed_palette.confirmed_map(intake, framework, confirmed_palette.framework_colours(baseline))
    files = token_files.read_token_files(handoff) if handoff else None
    aliases = {"--" + a for a in (files or {}).get("aliases", set())}
    out = []
    for slug, row in sorted(confirmed.items()):
        tokens = row.get("tokens") or []
        if slug.startswith("custom-") and tokens and all(t in aliases for t in tokens):
            continue
        if slug.startswith("custom-") and tokens:
            # a client's own colour name: the palette carries each literal token under the token's own name (FR-32-28)
            out += [{"role": "palette", "path": f"palette.{t.lstrip('-')}", "value": row["hex"], "source": f"intake mark {t}"}
                    for t in tokens if t not in aliases]
            continue
        out.append({"role": "palette", "path": f"palette.{slug}", "value": row["hex"], "source": "intake mark " + ", ".join(tokens)})
    return out


def _palette_value(snap: dict, slug: str):
    """A confirmed ``custom-<name>`` the client's snapshot already held as ``<name>`` keeps that slug."""
    got = _preset(snap, "color", slug)
    if got is None and slug.startswith("custom-"):
        name = slug[len("custom-"):]
        # A draft token named for a framework role is entered as `<name>-shade` (FR-32-28): the role then points elsewhere.
        rows = (((snap.get("settings") or {}).get("color") or {}).get("palette")) or []
        got = next((e.get("color") for e in rows if e.get("slug") == name + "-shade"), None)
        if got is None:
            got = _preset(snap, "color", name)
    return got


def compare(snap: dict, handoff: pathlib.Path, intake: dict | None, accepted: dict, baseline: dict) -> list[dict]:
    """One row per declared value: ``{role, path, expected, got, source, verdict}`` (match / mismatch / accepted)."""
    rows = declared_tokens.expectations(declared_tokens.read_roles(handoff), snap) + palette_expectations(intake, baseline, handoff)
    out = []
    for row in rows:
        path = row["path"]
        got = _palette_value(snap, path.split(".", 1)[1]) if path.startswith("palette.") else snapshot_value(snap, path)
        ok = same(row["value"], got)
        verdict = "match" if ok else ("accepted" if path in accepted else "mismatch")
        out.append({"role": row["role"], "path": path, "expected": row["value"], "got": got,
                    "source": row["source"], "verdict": verdict, "reason": accepted.get(path, "")})
    return out


def load_accepted(path: pathlib.Path | None) -> dict:
    if path is None or not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {a["path"]: a.get("reason", "") for a in data.get("accepted") or [] if isinstance(a, dict) and a.get("path")}


def report(snap: dict, client: str | None, handoff: pathlib.Path, intake: dict | None, repo: pathlib.Path = REPO,
           accepted_path: pathlib.Path | None = None) -> list[dict]:
    """The comparison for ``snap`` with the client's accepted file (``extract.py`` prints its count)."""
    baseline = json.loads((repo / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
    if accepted_path is None and client:
        accepted_path = repo / "sites" / client / "build" / ACCEPTED_NAME
    return compare(snap, handoff, intake, load_accepted(accepted_path), baseline)


def _default_handoff(client: str) -> pathlib.Path:
    return REPO / "sites" / client / "handoff"


def main(argv=None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--client", required=True)
    ap.add_argument("--snapshot", default=None, help="default sites/<client>/theme-snapshot.json")
    ap.add_argument("--handoff", default=None, help="default sites/<client>/handoff")
    ap.add_argument("--intake", default=None, help="default sites/<client>/build/intake/intake.json when present")
    ap.add_argument("--accepted", default=None, help=f"default sites/<client>/build/{ACCEPTED_NAME}")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)
    snap_path = pathlib.Path(args.snapshot) if args.snapshot else REPO / "sites" / args.client / "theme-snapshot.json"
    handoff = pathlib.Path(args.handoff) if args.handoff else _default_handoff(args.client)
    intake_path = pathlib.Path(args.intake) if args.intake else REPO / "sites" / args.client / "build" / "intake" / "intake.json"
    if not snap_path.is_file() or not (handoff / declared_tokens.TOKENS_DIR).is_dir():
        print(f"unusable input: snapshot {snap_path} or {handoff / declared_tokens.TOKENS_DIR} is missing", file=sys.stderr)
        return 2
    snap = json.loads(snap_path.read_text(encoding="utf-8"))
    intake = json.loads(intake_path.read_text(encoding="utf-8")) if intake_path.is_file() else None
    if intake is not None:
        baseline_theme = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
        intake = confirmed_palette.effective_marks(intake, confirmed_palette.framework_slugs(baseline_theme), confirmed_palette.read_key(intake_path))
    rows = report(snap, args.client, handoff, intake,
                  accepted_path=pathlib.Path(args.accepted) if args.accepted else None)
    if args.json:
        print(json.dumps(rows, indent=1, ensure_ascii=False))
    else:
        for r in rows:
            if r["verdict"] != "match":
                print(f"{r['verdict'].upper():9} {r['path']}: snapshot {r['got']!r}, draft {r['expected']!r} "
                      f"({r['source']}){' - ' + r['reason'] if r['reason'] else ''}")
    counts = {v: sum(1 for r in rows if r["verdict"] == v) for v in ("match", "accepted", "mismatch")}
    print(f"{args.client}: {len(rows)} declared values; {counts['match']} match, {counts['accepted']} accepted, "
          f"{counts['mismatch']} mismatch")
    return 1 if counts["mismatch"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
