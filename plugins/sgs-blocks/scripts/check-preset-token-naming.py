#!/usr/bin/env python3
"""
check-preset-token-naming.py

STRUCTURAL GATE — Spec 32 FR-32-9 (Naming Convention) self-verifier.

FR-32-9 says:

    The token namespace is `{component}Presets` (camelCase) in
    `settings.custom`, where `{component}` matches the block's kebab base
    (`button` -> `buttonPresets`, `card` -> `cardPresets`, `hero` ->
    `heroPresets`). Variant slugs are semantic (`primary`/`secondary`/
    `outline`/...). Role keys are a fixed vocabulary: `background`, `text`,
    `border`, `hover-background`, `hover-text`, `hover-border` (+ geometry:
    `border-width`, `border-radius`, `padding`, `font-size`, `font-weight`,
    `min-height`).

    Done when: every component's tokens follow this scheme (lint/grep check
    per component).

This script IS that lint/grep check. It scans every `sites/*/theme-snapshot.json`
for any key under `settings.custom` ending in `Presets` and asserts:

1. Namespace shape — the key is camelCase ending in `Presets`, and its
   `{component}` stem maps to a real block: a block exists if
   `plugins/sgs-blocks/src/blocks/<kebab-of-stem>/block.json` exists.
2. Variant slugs are semantic — lowercase kebab-case (`^[a-z][a-z0-9-]*$`).
3. Role keys are in the fixed 12-entry vocabulary (6 colour + 6 geometry).

Usage
-----
    python check-preset-token-naming.py --check      # exit 1 on any finding
    python check-preset-token-naming.py --survey      # census, exit 0 always
    python check-preset-token-naming.py --self-test   # negative control, exit 1 on any FAIL

UK English throughout.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent  # plugins/sgs-blocks/scripts/
_REPO_ROOT = _HERE.parent.parent.parent  # small-giants-wp/
_BLOCKS_DIR = _REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
_SITES_DIR = _REPO_ROOT / "sites"

# ---------------------------------------------------------------------------
# Fixed vocabulary (Spec 32 FR-32-9) — 6 colour + 6 geometry = 12
# ---------------------------------------------------------------------------
_ROLE_VOCABULARY: frozenset[str] = frozenset({
    # colour roles
    "background", "text", "border",
    "hover-background", "hover-text", "hover-border",
    # geometry roles
    "border-width", "border-radius", "padding",
    "font-size", "font-weight", "min-height",
})

# camelCase namespace ending in "Presets", e.g. "buttonPresets", "cardGridPresets"
_NAMESPACE_RE = re.compile(r"^[a-z][a-zA-Z0-9]*Presets$")

# lowercase kebab-case variant slug, e.g. "primary", "hover-background"
_KEBAB_RE = re.compile(r"^[a-z][a-z0-9-]*$")


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------
@dataclass
class Finding:
    client: str
    namespace: str
    variant: str | None
    role: str | None
    kind: str  # "namespace" | "variant" | "role"
    detail: str

    def line(self) -> str:
        loc = self.namespace
        if self.variant is not None:
            loc += f".{self.variant}"
        if self.role is not None:
            loc += f".{self.role}"
        return f"{self.client}: {loc} — {self.detail}"


# ---------------------------------------------------------------------------
# camelCase stem -> kebab-case block slug
# ---------------------------------------------------------------------------
def _camel_stem_to_kebab(stem: str) -> str:
    """'button' -> 'button'; 'cardGrid' -> 'card-grid'; 'ctaSection' -> 'cta-section'."""
    s = re.sub(r"(?<!^)(?=[A-Z])", "-", stem)
    return s.lower()


def _stem_of_namespace(namespace: str) -> str:
    """'buttonPresets' -> 'button'; 'cardGridPresets' -> 'cardGrid'."""
    return namespace[: -len("Presets")]


def _block_exists(block_dir: Path, kebab_slug: str) -> bool:
    return (block_dir / kebab_slug / "block.json").exists()


# ---------------------------------------------------------------------------
# Core scan logic — operates on an arbitrary settings.custom dict, so the
# self-test can exercise it against synthetic fixtures without touching the
# real sites/ tree.
# ---------------------------------------------------------------------------
def _scan_custom_settings(
    client: str, custom: dict, block_dir: Path
) -> list[Finding]:
    findings: list[Finding] = []

    for key, value in custom.items():
        if not key.endswith("Presets"):
            continue  # out of scope — not a preset namespace at all

        # --- 1. namespace shape ------------------------------------------
        if not _NAMESPACE_RE.match(key):
            findings.append(Finding(
                client=client, namespace=key, variant=None, role=None,
                kind="namespace",
                detail=(
                    f"namespace '{key}' is not camelCase ending in 'Presets'"
                ),
            ))
            continue  # can't derive a stem sensibly, skip variant/role checks

        stem = _stem_of_namespace(key)
        kebab_slug = _camel_stem_to_kebab(stem)
        if not _block_exists(block_dir, kebab_slug):
            findings.append(Finding(
                client=client, namespace=key, variant=None, role=None,
                kind="namespace",
                detail=(
                    f"namespace '{key}' implies component '{kebab_slug}' but "
                    f"no block exists at src/blocks/{kebab_slug}/block.json — "
                    f"the namespace does not correspond to any component"
                ),
            ))

        if not isinstance(value, dict):
            findings.append(Finding(
                client=client, namespace=key, variant=None, role=None,
                kind="namespace",
                detail=f"'{key}' value is not an object of variants",
            ))
            continue

        # --- 2/3. per-variant checks --------------------------------------
        for variant_slug, roles in value.items():
            if not _KEBAB_RE.match(variant_slug):
                findings.append(Finding(
                    client=client, namespace=key, variant=variant_slug,
                    role=None, kind="variant",
                    detail=(
                        f"variant slug '{variant_slug}' is not lowercase "
                        f"kebab-case (expected e.g. 'primary', 'outline')"
                    ),
                ))
                continue

            if not isinstance(roles, dict):
                findings.append(Finding(
                    client=client, namespace=key, variant=variant_slug,
                    role=None, kind="variant",
                    detail=f"variant '{variant_slug}' value is not an object of roles",
                ))
                continue

            for role_key in roles:
                if role_key not in _ROLE_VOCABULARY:
                    findings.append(Finding(
                        client=client, namespace=key, variant=variant_slug,
                        role=role_key, kind="role",
                        detail=(
                            f"role key '{role_key}' is outside the fixed "
                            f"12-entry vocabulary (6 colour + 6 geometry)"
                        ),
                    ))

    return findings


def _iter_snapshot_files(sites_dir: Path) -> list[Path]:
    if not sites_dir.exists():
        return []
    return sorted(sites_dir.glob("*/theme-snapshot.json"))


def _load_custom(snapshot_path: Path) -> dict:
    try:
        data = json.loads(snapshot_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return data.get("settings", {}).get("custom", {}) or {}


def collect_findings(sites_dir: Path, block_dir: Path) -> list[Finding]:
    findings: list[Finding] = []
    for snapshot_path in _iter_snapshot_files(sites_dir):
        client = snapshot_path.parent.name
        custom = _load_custom(snapshot_path)
        findings.extend(_scan_custom_settings(client, custom, block_dir))
    return findings


def collect_survey(sites_dir: Path) -> list[tuple[str, str, list[str], list[str]]]:
    """Per (client, namespace): (variants, role-union) — census only, no judgement."""
    rows: list[tuple[str, str, list[str], list[str]]] = []
    for snapshot_path in _iter_snapshot_files(sites_dir):
        client = snapshot_path.parent.name
        custom = _load_custom(snapshot_path)
        for key, value in custom.items():
            if not key.endswith("Presets"):
                continue
            variants = list(value.keys()) if isinstance(value, dict) else []
            roles: set[str] = set()
            if isinstance(value, dict):
                for v in value.values():
                    if isinstance(v, dict):
                        roles.update(v.keys())
            rows.append((client, key, variants, sorted(roles)))
    return rows


# ---------------------------------------------------------------------------
# --check
# ---------------------------------------------------------------------------
def run_check(sites_dir: Path, block_dir: Path) -> int:
    findings = collect_findings(sites_dir, block_dir)
    if not findings:
        print("[check-preset-token-naming] All checks passed — 0 findings.")
        return 0
    print(f"[check-preset-token-naming] {len(findings)} finding(s):\n")
    for f in findings:
        print(f"  {f.line()}")
    print(f"\n[check-preset-token-naming] GATE FAILED — {len(findings)} finding(s).")
    return 1


# ---------------------------------------------------------------------------
# --survey
# ---------------------------------------------------------------------------
def run_survey(sites_dir: Path) -> int:
    rows = collect_survey(sites_dir)
    if not rows:
        print("[check-preset-token-naming] SURVEY — no *Presets namespaces found in any sites/*/theme-snapshot.json.")
        return 0
    print(f"[check-preset-token-naming] SURVEY — {len(rows)} namespace instance(s) found:\n")
    for client, namespace, variants, roles in rows:
        print(f"  {client}: {namespace}")
        print(f"    variants: {', '.join(variants) if variants else '(none)'}")
        print(f"    roles:    {', '.join(roles) if roles else '(none)'}")
    return 0


# ---------------------------------------------------------------------------
# --self-test
# ---------------------------------------------------------------------------
def run_self_test() -> int:
    tmp_root = Path(tempfile.mkdtemp(prefix="check-preset-token-naming-selftest-"))
    tmp_sites = tmp_root / "sites"
    tmp_blocks = tmp_root / "blocks"
    tmp_sites.mkdir(parents=True)
    tmp_blocks.mkdir(parents=True)

    results: list[tuple[str, bool]] = []

    def assert_true(name: str, cond: bool) -> None:
        results.append((name, cond))
        print(f"  [{'PASS' if cond else 'FAIL'}] {name}")

    try:
        # Only 'button' is a real block in this fixture tree — mirrors reality
        # where 'widget' has no such block.
        (tmp_blocks / "button").mkdir()
        (tmp_blocks / "button" / "block.json").write_text("{}", encoding="utf-8")

        # --- Fixture 1: stem matches no block -> flagged ---------------------
        client1 = tmp_sites / "client-a"
        client1.mkdir()
        (client1 / "theme-snapshot.json").write_text(json.dumps({
            "settings": {"custom": {
                "widgetPresets": {
                    "primary": {"background": "#fff", "text": "#000"},
                },
            }},
        }), encoding="utf-8")
        findings1 = collect_findings(tmp_sites, tmp_blocks)
        assert_true(
            "1. namespace with no matching block ('widgetPresets') is flagged",
            any(
                f.client == "client-a" and f.namespace == "widgetPresets" and f.kind == "namespace"
                for f in findings1
            ),
        )
        for f in findings1:
            (client1 / "theme-snapshot.json").unlink()

        # --- Fixture 2: key not ending in 'Presets' -> ignored ---------------
        client2 = tmp_sites / "client-b"
        client2.mkdir()
        (client2 / "theme-snapshot.json").write_text(json.dumps({
            "settings": {"custom": {
                "buttonTokens": {
                    "primary": {"background": "#fff"},
                },
            }},
        }), encoding="utf-8")
        findings2 = collect_findings(tmp_sites, tmp_blocks)
        assert_true(
            "2. non-'Presets'-suffixed key ('buttonTokens') is ignored (out of scope)",
            not any(f.client == "client-b" for f in findings2),
        )
        (client2 / "theme-snapshot.json").unlink()

        # --- Fixture 3: camelCase variant slug -> flagged ---------------------
        client3 = tmp_sites / "client-c"
        client3.mkdir()
        (client3 / "theme-snapshot.json").write_text(json.dumps({
            "settings": {"custom": {
                "buttonPresets": {
                    "primaryDark": {"background": "#fff", "text": "#000"},
                },
            }},
        }), encoding="utf-8")
        findings3 = collect_findings(tmp_sites, tmp_blocks)
        assert_true(
            "3. camelCase variant slug ('primaryDark') is flagged",
            any(
                f.client == "client-c" and f.variant == "primaryDark" and f.kind == "variant"
                for f in findings3
            ),
        )
        (client3 / "theme-snapshot.json").unlink()

        # --- Fixture 4: role key outside vocabulary -> flagged -----------------
        client4 = tmp_sites / "client-d"
        client4.mkdir()
        (client4 / "theme-snapshot.json").write_text(json.dumps({
            "settings": {"custom": {
                "buttonPresets": {
                    "primary": {"backgroundColour": "#fff", "text": "#000"},
                },
            }},
        }), encoding="utf-8")
        findings4 = collect_findings(tmp_sites, tmp_blocks)
        assert_true(
            "4. role key outside vocabulary ('backgroundColour') is flagged",
            any(
                f.client == "client-d" and f.variant == "primary"
                and f.role == "backgroundColour" and f.kind == "role"
                for f in findings4
            ),
        )
        (client4 / "theme-snapshot.json").unlink()

        # --- Fixture 5: fully valid snapshot mirroring the REAL buttonPresets
        #     shape (mamas-munches / indus-foods) -> NOT flagged ---------------
        client5 = tmp_sites / "client-e"
        client5.mkdir()
        (client5 / "theme-snapshot.json").write_text(json.dumps({
            "settings": {"custom": {
                "buttonPresets": {
                    "primary": {
                        "background": "#e68a95", "text": "#3a2e26",
                        "border": "#e68a95", "border-width": "2px",
                        "border-radius": "10px", "font-size": "15px",
                        "font-weight": "600", "min-height": "48px",
                        "hover-background": "#41322b", "hover-text": "#f7f1ec",
                        "hover-border": "#41322b",
                    },
                    "secondary": {
                        "background": "transparent", "text": "#3a2e26",
                        "border": "#e68a95", "border-width": "2px",
                        "border-radius": "10px", "font-size": "15px",
                        "font-weight": "600", "min-height": "48px",
                        "hover-background": "rgba(58, 46, 38, 0.914)",
                        "hover-text": "#eee9e3", "hover-border": "#49362f",
                    },
                    "outline": {
                        "background": "transparent", "text": "#3a2e26",
                        "border": "#e8d5c0", "border-width": "2px",
                        "border-radius": "10px", "font-size": "14px",
                        "font-weight": "600", "min-height": "44px",
                        "hover-background": "rgba(245, 194, 200, 0.914)",
                        "hover-border": "#e69099",
                    },
                },
            }},
        }), encoding="utf-8")
        findings5 = collect_findings(tmp_sites, tmp_blocks)
        assert_true(
            "5. fully valid buttonPresets shape (real-world mirror) is NOT flagged",
            not any(f.client == "client-e" for f in findings5),
        )
        (client5 / "theme-snapshot.json").unlink()

        client1.rmdir()
        client3.rmdir()
        client4.rmdir()
        client5.rmdir()
        client2.rmdir()

    finally:
        shutil.rmtree(tmp_root, ignore_errors=True)

    print()
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    if passed == total:
        print(f"[check-preset-token-naming] SELF-TEST PASSED — {passed}/{total} assertions.")
        return 0
    print(f"[check-preset-token-naming] SELF-TEST FAILED — {passed}/{total} assertions passed.")
    return 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Preset-token naming gate — Spec 32 FR-32-9 self-verifier. "
            "Checks {component}Presets namespace shape, variant-slug "
            "kebab-case, and role-key vocabulary across every "
            "sites/*/theme-snapshot.json."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", default=False,
                       help="Exit 1 on any finding (default when no flag given).")
    mode.add_argument("--survey", action="store_true", default=False,
                       help="Census of every Presets namespace found. Exit 0 always.")
    mode.add_argument("--self-test", action="store_true", default=False,
                       help="Negative-control self-test in a temp dir. Exit 1 on any FAIL.")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()
    if args.survey:
        return run_survey(_SITES_DIR)

    # default / --check
    return run_check(_SITES_DIR, _BLOCKS_DIR)


if __name__ == "__main__":
    raise SystemExit(main())
