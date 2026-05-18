#!/usr/bin/env python3
"""
Lint SGS pattern PHP files for hardcoded personal data.

Scans pattern files for email addresses, phone numbers, location names,
social media URLs, and operator names that should be bound to the sgs/site-info
block binding source instead of hardcoded.

Exit codes:
  0 = no violations found
  1 = violations found
"""

import re
import sys
from pathlib import Path


# Personal data patterns to hunt for in pattern body text (not PHP comments).
# Each tuple: (pattern_name, regex, description)
PERSONAL_DATA_PATTERNS = [
    (
        "email_address",
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "Email address",
    ),
    (
        "uk_phone_international",
        r"\+44\s?[\d\s()-]{7,}",
        "International UK phone number (+44)",
    ),
    (
        "uk_phone_local_7digit",
        r"07[0-9]\s?[\d\s]{7,9}",
        "UK phone number (07 prefix)",
    ),
    (
        "uk_phone_area_code",
        r"\(0\d{3,4}\)\s?[\d\s()-]{6,}",
        "UK phone number with area code",
    ),
    (
        "location_birmingham",
        r"\bBirmingham\b",
        "City name: Birmingham",
    ),
    (
        "location_london",
        r"\bLondon\b",
        "City name: London",
    ),
    (
        "social_facebook",
        r"facebook\.com/[a-zA-Z0-9._-]+",
        "Facebook account URL",
    ),
    (
        "social_instagram",
        r"instagram\.com/[a-zA-Z0-9._-]+",
        "Instagram account URL",
    ),
    (
        "social_whatsapp",
        r"wa\.me/[0-9+]+",
        "WhatsApp link",
    ),
    (
        "operator_zainab",
        r"\bZainab\b",
        "Operator name: Zainab",
    ),
    (
        "operator_mamas_munches",
        r"Mama['\s]*s\s+Munches",
        "Business name: Mama's Munches",
    ),
    (
        "operator_indus",
        r"\bIndus\s+Foods\b",
        "Business name: Indus Foods",
    ),
    (
        "operator_helping_doctors",
        r"Helping\s+Doctors",
        "Business name: Helping Doctors",
    ),
    (
        "operator_amir",
        r"\bAmir\b",
        "Operator name: Amir",
    ),
]


def is_php_comment_line(line: str) -> bool:
    """Check if line is a PHP comment (docblock or inline)."""
    stripped = line.strip()
    return stripped.startswith("*") or stripped.startswith("//") or stripped.startswith("/*")


def scan_file(file_path: Path) -> list[dict]:
    """
    Scan a PHP pattern file for personal data violations.

    Returns:
        List of violation dicts with keys: line_num, matched_text, pattern_name, description
    """
    violations = []

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()

    for line_num, line in enumerate(lines, start=1):
        # Skip PHP comment lines
        if is_php_comment_line(line):
            continue

        # Check each personal data pattern
        for pattern_name, regex, description in PERSONAL_DATA_PATTERNS:
            matches = re.finditer(regex, line, re.IGNORECASE)
            for match in matches:
                violations.append(
                    {
                        "line_num": line_num,
                        "matched_text": match.group(0),
                        "pattern_name": pattern_name,
                        "description": description,
                    }
                )

    return violations


def main():
    """Scan all pattern PHP files and report violations."""
    patterns_dir = Path(__file__).parent.parent / "theme" / "sgs-theme" / "patterns"

    if not patterns_dir.exists():
        print(f"Error: patterns directory not found: {patterns_dir}", file=sys.stderr)
        return 1

    pattern_files = sorted(patterns_dir.glob("*.php"))

    if not pattern_files:
        print(f"Error: no PHP files found in {patterns_dir}", file=sys.stderr)
        return 1

    total_violations = 0
    files_with_violations = 0

    for file_path in pattern_files:
        violations = scan_file(file_path)

        if violations:
            files_with_violations += 1
            total_violations += len(violations)
            rel_path = file_path.relative_to(patterns_dir.parent.parent)

            for v in violations:
                print(
                    f"{rel_path}:{v['line_num']} — matched {v['description']}: "
                    f'"{v["matched_text"]}"'
                )

    if total_violations > 0:
        print(
            f"\n{files_with_violations} file(s) with {total_violations} violation(s) found.",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
