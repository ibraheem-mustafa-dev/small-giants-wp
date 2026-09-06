#!/usr/bin/env python3
"""
Migrate style.border to typed border attributes in SGS pattern files.
Task 2 codemod: rewrite style.border as borderWidth/borderStyle/borderColour/borderRadius/etc.
"""
import json
import re
import sys
from pathlib import Path

# Map of block slugs to their border attribute definitions
BORDER_ATTRS = {
    'sgs/button': [
        'borderWidth', 'borderStyle', 'borderColour', 'borderColourGradient',
        'borderColourHover', 'borderColourHoverGradient', 'borderRadius',
    ],
    'sgs/container': [
        'borderWidth', 'borderStyle', 'borderColour', 'borderColourGradient',
        'borderColourHover', 'borderColourHoverGradient', 'borderRadius',
    ],
    'sgs/media': [
        'borderWidth', 'borderStyle', 'borderColour', 'borderColourGradient',
        'borderRadius', 'borderRadiusTablet', 'borderRadiusMobile',
    ],
}


def extract_json_from_line(line, start_pos):
    """
    Extract JSON object from line starting at position start_pos.
    Returns: (json_obj, end_pos_in_line) or (None, -1) on error
    """
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


def migrate_style_border_to_attrs(attrs, block_slug):
    """
    Convert style.border to typed border attributes.

    Returns: (new_attrs, migration_details) where migration_details is a dict of changes.
    """
    if 'style' not in attrs or 'border' not in attrs['style']:
        return attrs, {}

    border_style = attrs['style']['border']
    migration = {}

    # Extract style.border values - can be simple or nested per side
    radius = border_style.get('radius')
    color = border_style.get('color')
    width = border_style.get('width')
    style = border_style.get('style')

    # Also check for per-side borders (top, bottom, left, right with nested width/color/style)
    # These are used in index.html and single.html
    top_border = border_style.get('top')
    bottom_border = border_style.get('bottom')
    left_border = border_style.get('left')
    right_border = border_style.get('right')

    # Convert radius to borderRadius (tier-object for container/button, corner-keyed for media)
    if radius:
        if block_slug == 'sgs/media':
            # sgs/media uses corner-keyed object: {topLeft, topRight, bottomLeft, bottomRight}
            # Convert flat radius string to corner-keyed format
            attrs['borderRadius'] = {
                'topLeft': radius,
                'topRight': radius,
                'bottomLeft': radius,
                'bottomRight': radius,
            }
            migration['borderRadius'] = attrs['borderRadius']
        else:
            # sgs/button and sgs/container use tier-object
            # Convert flat radius string to tier-object: {"desktop": "12px"}
            attrs['borderRadius'] = {"desktop": radius}
            migration['borderRadius'] = {"desktop": radius}

    # Handle per-side borders (top, bottom, left, right with nested width/color/style)
    # These override the flat width/color/style values if present
    has_per_side = any([top_border, bottom_border, left_border, right_border])

    if has_per_side:
        # Construct borderWidth from per-side borders
        border_widths = {}
        border_colors = {}
        border_styles = {}

        if top_border:
            border_widths['top'] = top_border.get('width')
            border_colors['top'] = top_border.get('color')
            border_styles['top'] = top_border.get('style')

        if bottom_border:
            border_widths['bottom'] = bottom_border.get('width')
            border_colors['bottom'] = bottom_border.get('color')
            border_styles['bottom'] = bottom_border.get('style')

        if left_border:
            border_widths['left'] = left_border.get('width')
            border_colors['left'] = left_border.get('color')
            border_styles['left'] = left_border.get('style')

        if right_border:
            border_widths['right'] = right_border.get('width')
            border_colors['right'] = right_border.get('color')
            border_styles['right'] = right_border.get('style')

        # Only set attributes if we found actual values
        if any(border_widths.values()):
            attrs['borderWidth'] = border_widths
            migration['borderWidth'] = border_widths

        if any(border_colors.values()):
            # Check if any is a gradient
            is_gradient = any(isinstance(v, str) and 'gradient' in v.lower() for v in border_colors.values() if v)
            if is_gradient:
                attrs['borderColourGradient'] = border_colors
                migration['borderColourGradient'] = border_colors
            else:
                attrs['borderColour'] = border_colors
                migration['borderColour'] = border_colors

        if any(border_styles.values()):
            attrs['borderStyle'] = border_styles
            migration['borderStyle'] = border_styles

    else:
        # Flat border values (no per-side nesting)
        # Convert width to borderWidth (object with sides)
        if width:
            # The width in style.border is typically just a value like "1px" or "2px"
            # Convert to borderWidth object: {"top": "1px", "right": "1px", "bottom": "1px", "left": "1px"}
            # But we should check if it's already an object (e.g., from WP's structure)
            if isinstance(width, dict):
                attrs['borderWidth'] = width
                migration['borderWidth'] = width
            else:
                # Flat value - apply to all sides
                attrs['borderWidth'] = {
                    'top': width,
                    'right': width,
                    'bottom': width,
                    'left': width,
                }
                migration['borderWidth'] = attrs['borderWidth']

        # Convert color to borderColour and borderColourGradient
        if color:
            # Check if it's a gradient (contains 'gradient' or 'linear-gradient', etc.)
            if isinstance(color, str) and ('gradient' in color.lower()):
                attrs['borderColourGradient'] = color
                migration['borderColourGradient'] = color
            else:
                attrs['borderColour'] = color
                migration['borderColour'] = color

        # Convert style to borderStyle
        if style:
            attrs['borderStyle'] = style
            migration['borderStyle'] = style

    # Remove the old style.border
    if 'style' in attrs:
        del attrs['style']['border']
        # If style object is now empty, remove it entirely
        if not attrs['style']:
            del attrs['style']

    return attrs, migration


def migrate_pattern_file(file_path):
    """
    Migrate a single pattern file.
    Returns: (success, changes_count, details)
    """
    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')

    changes = 0
    changes_details = []

    # Pattern to match block opening comments
    # Matches: <!-- wp:sgs/block-name or wp:sgs/block-name {json}
    block_start_pattern = re.compile(r'<!-- wp:(sgs/[a-z-]+)\s+({)')

    new_lines = []
    for i, line in enumerate(lines):
        match = block_start_pattern.search(line)
        if match:
            block_slug = match.group(1)
            json_start = match.start(2)  # Position of the opening {

            # Only process if this is a block we care about
            if block_slug in BORDER_ATTRS:
                # Try to extract JSON
                attrs, end_pos = extract_json_from_line(line, json_start)

                if attrs is not None and 'style' in attrs and 'border' in attrs['style']:
                    # Migrate!
                    new_attrs, migration = migrate_style_border_to_attrs(attrs, block_slug)

                    if migration:
                        changes += 1
                        # Rebuild the line with new attributes
                        new_attr_str = json.dumps(new_attrs, separators=(',', ':'))

                        # Rebuild line preserving the start and end structure
                        # <!-- wp:sgs/block-name {attrs} /-->  OR  <!-- wp:sgs/block-name {attrs} -->
                        before_json = line[:json_start]
                        after_json = line[end_pos:]
                        new_line = before_json + new_attr_str + after_json

                        new_lines.append(new_line)
                        changes_details.append({
                            'line': i + 1,
                            'block': block_slug,
                            'migration': migration,
                        })
                        continue

        new_lines.append(line)

    if changes > 0:
        file_path.write_text('\n'.join(new_lines), encoding='utf-8')

    return True, changes, changes_details


def main():
    """Run migration on all pattern and template files."""
    pattern_dir = Path(__file__).parent / 'theme' / 'sgs-theme' / 'patterns'
    template_dir = Path(__file__).parent / 'theme' / 'sgs-theme' / 'templates'

    if not pattern_dir.exists():
        print(f"Pattern directory not found: {pattern_dir}", file=sys.stderr)
        sys.exit(1)

    if not template_dir.exists():
        print(f"Template directory not found: {template_dir}", file=sys.stderr)
        sys.exit(1)

    # Get all PHP pattern files and HTML template files
    pattern_files = sorted(pattern_dir.glob('*.php'))
    template_files = sorted(template_dir.glob('*.html'))

    total_changes = 0
    files_changed = []
    all_details = []

    all_files = list(pattern_files) + list(template_files)
    for file_path in all_files:
        success, changes, details = migrate_pattern_file(file_path)
        if success and changes > 0:
            total_changes += changes
            files_changed.append(file_path.name)
            all_details.extend(details)

    print(f"Migration complete: {total_changes} attributes changed in {len(files_changed)} files")

    if files_changed:
        print("\nFiles changed:")
        for fname in files_changed:
            print(f"  - {fname}")

        print("\nDetailed changes:")
        for detail in all_details:
            print(f"  Line {detail['line']}: {detail['block']}")
            for key, value in detail['migration'].items():
                val_str = json.dumps(value) if not isinstance(value, str) else value
                print(f"    + {key}: {val_str}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
