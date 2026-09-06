#!/usr/bin/env python3
"""
Fix borderRadius format issues:
- sgs/media: convert scalar to corner-keyed {topLeft, topRight, bottomLeft, bottomRight}
- sgs/button, sgs/container: ensure tier-object format {desktop: "...", tablet: ..., mobile: ...}
"""
import json
import re
import sys
from pathlib import Path

BORDER_ATTRS = {
    'sgs/button': 'tier-object',
    'sgs/container': 'tier-object',
    'sgs/media': 'corner-keyed',
}


def extract_json_from_line(line, start_pos):
    """Extract JSON object from line starting at position start_pos."""
    depth = 0
    in_string = False
    escape = False
    end_pos = start_pos

    for i in range(start_pos, len(line)):
        char = line[i]

        if escape:
            escape = False
            continue

        if char == '\\':
            escape = True
            continue

        if char == '"' and not escape:
            in_string = not in_string
            continue

        if in_string:
            continue

        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                end_pos = i + 1
                break

    if depth != 0:
        return None, -1

    try:
        json_str = line[start_pos:end_pos]
        return json.loads(json_str), end_pos
    except json.JSONDecodeError:
        return None, -1


def fix_border_radius_format(attrs, block_slug):
    """
    Fix borderRadius to the correct format.
    Returns: (modified_attrs, was_changed)
    """
    if 'borderRadius' not in attrs:
        return attrs, False

    radius = attrs['borderRadius']
    expected_format = BORDER_ATTRS[block_slug]
    was_changed = False

    if expected_format == 'tier-object':
        # sgs/button and sgs/container need {"desktop": "value", "tablet": null, "mobile": null}
        if isinstance(radius, str):
            # Convert scalar to tier-object
            attrs['borderRadius'] = {"desktop": radius}
            was_changed = True
        elif isinstance(radius, dict):
            # Check if it's already tier-keyed
            has_tier_keys = any(k in radius for k in ['desktop', 'tablet', 'mobile'])
            if not has_tier_keys:
                # Probably a corner-keyed object by mistake - convert to tier-object
                # This shouldn't happen, but handle it just in case
                # Take the first value and assume it's the desktop value
                first_value = next(iter(radius.values())) if radius else None
                if first_value:
                    attrs['borderRadius'] = {"desktop": first_value}
                    was_changed = True

    elif expected_format == 'corner-keyed':
        # sgs/media needs {topLeft, topRight, bottomLeft, bottomRight}
        if isinstance(radius, str):
            # Convert scalar to corner-keyed
            attrs['borderRadius'] = {
                'topLeft': radius,
                'topRight': radius,
                'bottomLeft': radius,
                'bottomRight': radius,
            }
            was_changed = True
        elif isinstance(radius, dict):
            # Check if it's tier-keyed (desktop, tablet, mobile)
            has_tier_keys = any(k in radius for k in ['desktop', 'tablet', 'mobile'])
            if has_tier_keys:
                # Convert tier-object to corner-keyed
                desktop_value = radius.get('desktop')
                if desktop_value:
                    if isinstance(desktop_value, str):
                        attrs['borderRadius'] = {
                            'topLeft': desktop_value,
                            'topRight': desktop_value,
                            'bottomLeft': desktop_value,
                            'bottomRight': desktop_value,
                        }
                        was_changed = True

    return attrs, was_changed


def fix_file(file_path):
    """
    Fix a single file.
    Returns: (success, changes_count, details)
    """
    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')

    changes = 0
    changes_details = []

    block_start_pattern = re.compile(r'<!-- wp:(sgs/[a-z-]+)\s+({)')

    new_lines = []
    for i, line in enumerate(lines):
        match = block_start_pattern.search(line)
        if match:
            block_slug = match.group(1)
            json_start = match.start(2)

            if block_slug in BORDER_ATTRS:
                attrs, end_pos = extract_json_from_line(line, json_start)

                if attrs is not None:
                    fixed_attrs, was_changed = fix_border_radius_format(attrs, block_slug)

                    if was_changed:
                        changes += 1
                        new_attr_str = json.dumps(fixed_attrs, separators=(',', ':'))
                        before_json = line[:json_start]
                        after_json = line[end_pos:]
                        new_line = before_json + new_attr_str + after_json

                        new_lines.append(new_line)
                        changes_details.append({
                            'line': i + 1,
                            'block': block_slug,
                            'from': attrs.get('borderRadius'),
                            'to': fixed_attrs.get('borderRadius'),
                        })
                        continue

        new_lines.append(line)

    if changes > 0:
        file_path.write_text('\n'.join(new_lines), encoding='utf-8')

    return True, changes, changes_details


def main():
    """Fix all pattern and template files."""
    pattern_dir = Path(__file__).parent / 'theme' / 'sgs-theme' / 'patterns'
    template_dir = Path(__file__).parent / 'theme' / 'sgs-theme' / 'templates'

    pattern_files = sorted(pattern_dir.glob('*.php'))
    template_files = sorted(template_dir.glob('*.html'))
    all_files = list(pattern_files) + list(template_files)

    total_changes = 0
    files_changed = []
    all_details = []

    for file_path in all_files:
        success, changes, details = fix_file(file_path)
        if success and changes > 0:
            total_changes += changes
            files_changed.append(file_path.name)
            all_details.extend(details)

    print(f"Format fixes complete: {total_changes} attributes fixed in {len(files_changed)} files")

    if files_changed:
        print("\nFiles changed:")
        for fname in files_changed:
            print(f"  - {fname}")

        print("\nDetailed fixes:")
        for detail in all_details:
            print(f"  Line {detail['line']}: {detail['block']}")
            from_val = json.dumps(detail['from']) if not isinstance(detail['from'], str) else detail['from']
            to_val = json.dumps(detail['to']) if not isinstance(detail['to'], str) else detail['to']
            print(f"    {from_val} -> {to_val}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
