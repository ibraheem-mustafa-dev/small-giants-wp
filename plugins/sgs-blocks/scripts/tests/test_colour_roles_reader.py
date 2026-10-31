r"""Spec 32 FR-32-28: the theme's colour-roles reader (theme/sgs-theme/inc/colour-roles.php).

Runs the pure function ``SGS\Theme\colour_roles_css`` under the PHP CLI with the WordPress functions the file touches
stubbed. Skipped when ``php`` is not on PATH. The live proof (front end and editor canvas on a local mirror) is in
``scripts/local-wp``'s mirror check described in Spec 32 FR-32-28's Status.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest tests/test_colour_roles_reader.py -q
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

READER = Path(__file__).resolve().parents[4] / "theme" / "sgs-theme" / "inc" / "colour-roles.php"
pytestmark = pytest.mark.skipif(shutil.which("php") is None, reason="php is not on PATH")


def css_for(settings: dict | None) -> str:
    harness = (
        "<?php\n"
        "define('ABSPATH', __DIR__);\n"
        "function add_action(...$a) {}\n"
        "function wp_get_global_settings() { return json_decode(getenv('SETTINGS'), true) ?: array(); }\n"
        f"require {json.dumps(READER.as_posix())};\n"
        "echo \\SGS\\Theme\\colour_roles_css();\n"
    )
    import os
    out = subprocess.run(["php", "-r", harness.split("?php\n", 1)[1]], capture_output=True, text=True,
                         env={**os.environ, "SETTINGS": json.dumps(settings) if settings is not None else ""})
    assert out.returncode == 0, out.stderr
    return out.stdout


def merged(palette_slugs, roles):
    return {"color": {"palette": {"theme": [{"slug": s, "color": "#111111"} for s in palette_slugs]}}, "custom": {"colourRoles": roles}}


def test_roles_print_as_pointers_to_their_shades_and_status_hex_is_kept():
    css = css_for(merged(["brand-blue", "ink"], {"primary": "brand-blue", "text": "ink", "success": "#2E7D4F"}))
    assert css == (":root{--wp--preset--color--primary:var(--wp--preset--color--brand-blue);"
                   "--wp--preset--color--text:var(--wp--preset--color--ink);--wp--preset--color--success:#2E7D4F}")


def test_nothing_is_printed_when_the_key_is_absent():
    """A starter snapshot keeps its roles as palette entries: no key, no CSS."""
    assert css_for({"color": {"palette": {"theme": [{"slug": "primary", "color": "#111111"}]}}, "custom": {}}) == ""
    assert css_for({"color": {"palette": {"theme": []}}, "custom": {"colourRoles": {}}}) == ""


@pytest.mark.parametrize("roles", [
    {"primary": "ink;}body{display:none}"},
    {"te xt": "ink"},
    {"pri}mary{": "ink"},
    {"primary": "var(--x)"},
    {"primary": "#12"},
    {"primary": "#GGGGGG"},
    {"primary": "url(x)"},
    {"primary": "no-such-shade"},
    {"primary": "primary"},
    {"Primary": "ink"},
])
def test_negative_control_every_unsafe_or_dangling_entry_is_dropped(roles):
    """MUST FAIL if a slug or hex reaches the stylesheet unvalidated, or a pointer to a missing shade is printed."""
    assert css_for(merged(["ink"], roles)) == ""


def test_a_valid_entry_survives_beside_invalid_ones():
    css = css_for(merged(["ink"], {"primary": "ink};x{", "text": "ink"}))
    assert css == ":root{--wp--preset--color--text:var(--wp--preset--color--ink)}"


def test_a_flat_palette_list_is_read_too():
    css = css_for({"color": {"palette": [{"slug": "ink", "color": "#111111"}]}, "custom": {"colourRoles": {"text": "ink"}}})
    assert css == ":root{--wp--preset--color--text:var(--wp--preset--color--ink)}"
