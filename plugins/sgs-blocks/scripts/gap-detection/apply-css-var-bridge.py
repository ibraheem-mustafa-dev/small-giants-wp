"""
Spec 15 Phase 3.5 follow-up — apply css-var-bridge role to mobile-nav attrs.

Per B2's render.php mining: sgs/mobile-nav routes ~30 attrs through CSS
custom properties (--sgs-mn-*) rather than directly to CSS properties.
The css-var-bridge role (added to role-templates.json) models this
indirection — its value_extractor is `computed_var_value` rather than
the typical `computed_color` / `computed_px_int` etc.

This script:
  1. Identifies mobile-nav attrs that flow through $css_vars[] in render.php
  2. Backs up the current role for each row to applied-css-var-bridge-backup.json
  3. Updates block_attributes.role = 'css-var-bridge' for those rows

Reversible — restore from the backup JSON to revert.
Idempotent — re-run produces zero updates once applied.
"""
from __future__ import annotations
import json, os, sqlite3, sys
from datetime import date
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DB_PATH = Path(os.environ.get("SGS_FRAMEWORK_DB",
    str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db")))
REPO = Path(__file__).resolve().parents[4]
BACKUP_PATH = REPO / "plugins" / "sgs-blocks" / "scripts" / "gap-detection" / "css-var-bridge-backup.json"


# Attrs that flow through $css_vars[] in mobile-nav/render.php
# (verified by grepping the render.php source — lines 102-210)
MOBILE_NAV_CSS_VAR_ATTRS = [
    # Direct $css_vars[] assignments
    "accentColour",
    "dividerColour",
    "staggerDelay",
    "drawerWidth",
    "drawerWidthMobile",
    "drawerWidthTablet",
    "drawerMaxWidth",
    "animationDuration",
    "exitDuration",
    "backdropOpacity",
    "backdropBlur",
    "backdropBlurAmount",
    "linkFontSize",
    "linkFontSizeMobile",
    "linkFontWeight",
    "sublinkFontSize",
    "sublinkFontSizeMobile",
    "submenuIndent",
    "submenuIndentMobile",
    "submenuIndentTablet",
    "socialIconSize",
    "socialIconSizeMobile",
    "socialIconSizeTablet",
    "logoMaxWidth",
    "logoMaxWidthMobile",
    "logoMaxWidthTablet",
    "closeButtonSize",
    "closeButtonSizeMobile",
    "closeButtonSizeTablet",
    "drawerGradient",
    # Colour overrides (from $colour_map loop, lines 169-194)
    "drawerBg",
    "drawerText",
    "closeButtonBg",
    "closeButtonColour",
    "ctaBg",
    "ctaTextColour",
    "ctaBorderColour",
    "secondaryCtaBg",
    "secondaryCtaTextColour",
    "linkColour",
    "linkHoverColour",
    "linkActiveColour",
    "sublinkColour",
    "sublinkHoverColour",
    "backdropColour",
    "focusColour",
]


def main() -> int:
    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row

    # Snapshot current role for backup
    rows = list(db.execute(
        "SELECT id, attr_name, role FROM block_attributes "
        "WHERE block_slug = 'sgs/mobile-nav' AND attr_name IN (" +
        ",".join("?" for _ in MOBILE_NAV_CSS_VAR_ATTRS) + ")",
        tuple(MOBILE_NAV_CSS_VAR_ATTRS),
    ))
    print(f"Mobile-nav css-var-bridge candidates found in DB: {len(rows)} / {len(MOBILE_NAV_CSS_VAR_ATTRS)} expected")

    # Backup
    backup = {
        "applied_on": date.today().isoformat(),
        "spec": "Spec 15 Phase 3.5 follow-up — css-var-bridge application",
        "source_render_php": "plugins/sgs-blocks/src/blocks/mobile-nav/render.php (lines 102-210)",
        "rows": [
            {"id": r["id"], "attr_name": r["attr_name"], "original_role": r["role"]}
            for r in rows
        ],
    }
    BACKUP_PATH.write_text(json.dumps(backup, indent=2), encoding="utf-8")
    print(f"Backed up original roles to: {BACKUP_PATH.name}")

    # Update
    update_count = 0
    for r in rows:
        if r["role"] != "css-var-bridge":
            db.execute("UPDATE block_attributes SET role = 'css-var-bridge' WHERE id = ?", (r["id"],))
            update_count += 1
    db.commit()
    print(f"Rows updated to role='css-var-bridge': {update_count}")
    print(f"(idempotent — re-run will produce 0 updates)")

    # Verify
    final = db.execute(
        "SELECT COUNT(*) FROM block_attributes "
        "WHERE block_slug = 'sgs/mobile-nav' AND role = 'css-var-bridge'"
    ).fetchone()[0]
    print(f"Final css-var-bridge row count: {final}")
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
