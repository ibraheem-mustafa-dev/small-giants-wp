#!/usr/bin/env python3
"""
SGS block-name search utility — fixes the block-name-search-blindspot failure mode.

Block names with parenthetical qualifiers (e.g. "Icon Block (single icon)")
break grep instinct because parens trip up regex escaping and shell handling.

This script searches both the literal block name AND the stripped form (without parens),
combining results and ranking by confidence: both match > literal-only > stripped-only.

Capture date: 2026-05-08
Reference: c:/Users/Bean/Projects/small-giants-wp/.claude/mistakes.md
  (Row: block-name-search-blindspot)

Usage:
  python sgs-block-grep.py "Icon Block (single icon)"
  python sgs-block-grep.py "Hero Block"
  python sgs-block-grep.py "Card Grid (with image filtering)" --root <path>
  python sgs-block-grep.py "Form Block" --output json
"""

import subprocess
import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple


def get_grep_command() -> str:
    """
    Detect which grep tool is available: ripgrep (rg) or GNU grep.

    Returns: 'rg' or 'grep'. Raises SystemExit if neither is found.
    """
    try:
        subprocess.run(['rg', '--version'],
                      capture_output=True,
                      check=True,
                      timeout=2)
        return 'rg'
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        pass

    try:
        subprocess.run(['grep', '--version'],
                      capture_output=True,
                      check=True,
                      timeout=2)
        return 'grep'
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        print("Error: neither 'rg' (ripgrep) nor 'grep' found in PATH", file=sys.stderr)
        sys.exit(1)


def strip_block_qualifier(block_name: str) -> str:
    """
    Remove parenthetical qualifiers from a block name.

    "Icon Block (single icon)" -> "Icon Block"
    "Hero Block" -> "Hero Block"
    "Card Grid (with image filtering)" -> "Card Grid"
    """
    return re.sub(r'\s*\([^)]*\)$', '', block_name).strip()


def to_slug_form(block_name: str, namespace: str = 'sgs') -> str:
    """
    Convert a human-readable block name into its likely SGS slug form.

    Strategy:
      1. Strip parenthetical qualifier
      2. Drop trailing 'Block' / 'Pattern' / 'Component' words (case-insensitive)
      3. Lowercase + replace spaces with hyphens
      4. Prepend `<namespace>/`

    Examples:
      "Icon Block (single icon)" -> "sgs/icon"
      "Hero Block"               -> "sgs/hero"
      "Card Grid"                -> "sgs/card-grid"
      "Mobile Nav Drawer"        -> "sgs/mobile-nav-drawer"
      "Form Field (Email)"       -> "sgs/form-field"

    The slug-form search is the practical hit-finder when a block's
    human heading doesn't appear verbatim in source — most SGS code
    references blocks by their `sgs/<slug>` namespace string instead.
    """
    stripped = strip_block_qualifier(block_name)
    # Drop trailing Block / Pattern / Component (case-insensitive)
    cleaned = re.sub(r'\s+(Block|Pattern|Component)s?$', '', stripped, flags=re.IGNORECASE).strip()
    if not cleaned:
        cleaned = stripped  # "Block" alone -> keep "Block"
    slug = cleaned.lower().replace(' ', '-')
    return f'{namespace}/{slug}'


def run_grep(term: str, root: str, grep_cmd: str) -> List[Tuple[str, int, str]]:
    """
    Run grep/rg and return a list of (filepath, line_number, preview_text) tuples.

    Searches for the term in relevant file types (.md, .php, .js, .jsx, .ts, .tsx, .json, .py, .css).
    Returns empty list if no matches found.
    """
    # File-type filter — repeated per extension since neither tool
    # expands brace globs at the argument level (shell-level only).
    # Also reused below when parsing the grep output (regex anchor for
    # Windows-path drive-letter handling — "c:\..." would otherwise split
    # naively on the first colon and break the path/line-number parser).
    extensions = ['md', 'php', 'js', 'jsx', 'ts', 'tsx', 'json', 'py', 'css']

    try:
        if grep_cmd == 'rg':
            # ripgrep: -H (filename), -n (line numbers), -F (fixed-string — slashes literal)
            # one --glob per extension; rg does NOT brace-expand.
            cmd = ['rg', '-Hn', '-F']
            for ext in extensions:
                cmd.extend(['--glob', f'*.{ext}'])
            cmd.extend([term, root])
        else:
            # GNU grep: -r (recursive), -n (line numbers), -H (filename), -F (fixed-string)
            cmd = ['grep', '-rnH', '-F']
            for ext in extensions:
                cmd.append(f'--include=*.{ext}')
            cmd.extend([term, root])

        result = subprocess.run(cmd,
                               capture_output=True,
                               text=True,
                               timeout=10)

        if result.returncode != 0 or not result.stdout.strip():
            return []

        matches = []
        # Windows path handling: a leading drive letter like "c:" splits naively
        # into ['c', '\\Users\\...', 'rest'] when the first split argument is ':'.
        # Match the path part with a regex that anchors to the END of the path
        # using known file extensions, then split the remainder on ':' once.
        ext_alternation = '|'.join(re.escape(e) for e in extensions)
        line_pattern = re.compile(
            rf'^(.+?\.(?:{ext_alternation})):(\d+):(.*)$'
        )

        for line in result.stdout.strip().split('\n'):
            if not line.strip():
                continue
            m = line_pattern.match(line)
            if not m:
                continue
            filepath = m.group(1).strip()
            try:
                line_num = int(m.group(2))
            except ValueError:
                continue
            preview = m.group(3).strip()[:80]
            matches.append((filepath, line_num, preview))

        return matches

    except subprocess.TimeoutExpired:
        print(f"Error: grep command timed out for term '{term}'", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error running grep: {e}", file=sys.stderr)
        return []


def combine_results(literal_matches: List[Tuple[str, int, str]],
                   stripped_matches: List[Tuple[str, int, str]]) -> Dict:
    """
    Combine results from literal and stripped searches.

    Returns a dict with:
      - both_match: files where both terms matched
      - literal_only: files where only literal matched
      - stripped_only: files where only stripped matched
    """
    # Convert to file:line keys for deduplication
    literal_set = {f"{f}:{l}" for f, l, _ in literal_matches}
    stripped_set = {f"{f}:{l}" for f, l, _ in stripped_matches}

    # Build lookup dicts for preview text
    literal_lookup = {f"{f}:{l}": (f, l, p) for f, l, p in literal_matches}
    stripped_lookup = {f"{f}:{l}": (f, l, p) for f, l, p in stripped_matches}

    both = literal_set & stripped_set
    literal_only = literal_set - stripped_set
    stripped_only = stripped_set - literal_set

    return {
        'both_match': [literal_lookup[k] for k in sorted(both)],
        'literal_only': [literal_lookup[k] for k in sorted(literal_only)],
        'stripped_only': [stripped_lookup[k] for k in sorted(stripped_only)],
    }


def format_text_output(literal_term: str,
                      stripped_term: str,
                      slug_term: str,
                      combined: Dict,
                      slug_matches: List[Tuple[str, int, str]]) -> str:
    """Format results as human-readable text."""
    output = [
        f"Block search: \"{literal_term}\"",
        f"  Stripped form: \"{stripped_term}\"",
        f"  Slug form:     \"{slug_term}\"",
        ""
    ]

    both = combined['both_match']
    literal = combined['literal_only']
    stripped = combined['stripped_only']

    if both:
        output.append(f"Both literal+stripped match ({len(both)} hits):")
        for filepath, line_num, preview in both:
            output.append(f"  {filepath}:{line_num}")
        output.append("")

    if literal:
        output.append(f"Literal-only ({len(literal)} hits):")
        for filepath, line_num, preview in literal:
            output.append(f"  {filepath}:{line_num}")
        output.append("")

    if stripped:
        output.append(f"Stripped-only ({len(stripped)} hits):")
        for filepath, line_num, preview in stripped:
            output.append(f"  {filepath}:{line_num}")
        output.append("")

    if slug_matches:
        output.append(f"Slug-form match ({len(slug_matches)} hits):")
        for filepath, line_num, preview in slug_matches:
            output.append(f"  {filepath}:{line_num}")
        output.append("")

    total = len(both) + len(literal) + len(stripped) + len(slug_matches)
    output.append(f"Total matches: {total}")

    return "\n".join(output)


def format_json_output(literal_term: str,
                      stripped_term: str,
                      slug_term: str,
                      combined: Dict,
                      slug_matches: List[Tuple[str, int, str]]) -> str:
    """Format results as JSON."""
    both = combined['both_match']
    literal = combined['literal_only']
    stripped = combined['stripped_only']

    def _to_obj(matches):
        return [
            {'file': f, 'line': ln, 'preview': p}
            for f, ln, p in matches
        ]

    output = {
        'literal_term': literal_term,
        'stripped_term': stripped_term,
        'slug_term': slug_term,
        'both_match': _to_obj(both),
        'literal_only': _to_obj(literal),
        'stripped_only': _to_obj(stripped),
        'slug_matches': _to_obj(slug_matches),
        'total_matches': len(both) + len(literal) + len(stripped) + len(slug_matches),
    }

    return json.dumps(output, indent=2)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Search for SGS block names, handling parenthetical qualifiers.',
        epilog='Examples:\n'
               '  python sgs-block-grep.py "Icon Block (single icon)"\n'
               '  python sgs-block-grep.py "Hero Block" --root /path/to/repo\n'
               '  python sgs-block-grep.py "Card Grid (with image filtering)" --output json'
    )

    parser.add_argument('block_name',
                       help='Block name to search (may include parenthetical qualifier)')
    parser.add_argument('--root',
                       default=r'c:\Users\Bean\Projects\small-giants-wp',
                       help='Repository root directory (default: SGS WP framework)')
    parser.add_argument('--output',
                       choices=['text', 'json'],
                       default='text',
                       help='Output format (default: text)')

    args = parser.parse_args()

    # Verify root exists
    root_path = Path(args.root)
    if not root_path.exists():
        print(f"Error: root directory does not exist: {args.root}", file=sys.stderr)
        sys.exit(1)

    # Compute three search terms — the practical hit-finder
    # is usually the slug form, since SGS source references blocks
    # via the `sgs/<slug>` namespace string rather than the human heading.
    literal_term = args.block_name.strip()
    stripped_term = strip_block_qualifier(literal_term)
    slug_term = to_slug_form(literal_term)

    # Detect grep tool
    grep_cmd = get_grep_command()

    # Run all three searches (skip duplicates when terms collide)
    literal_matches = run_grep(literal_term, str(root_path), grep_cmd)
    stripped_matches = run_grep(stripped_term, str(root_path), grep_cmd) if literal_term != stripped_term else []
    slug_matches = run_grep(slug_term, str(root_path), grep_cmd) if slug_term not in (literal_term, stripped_term) else []

    # Combine literal+stripped results into the venn buckets
    combined = combine_results(literal_matches, stripped_matches)

    # Format and print output (slug results carried alongside, not venn-merged)
    if args.output == 'json':
        print(format_json_output(literal_term, stripped_term, slug_term, combined, slug_matches))
    else:
        print(format_text_output(literal_term, stripped_term, slug_term, combined, slug_matches))


def validate_capture():
    """Smoke test: verify script works against the live repo."""
    try:
        # Test 1: "Hero Block" (no parens)
        sys.argv = ['sgs-block-grep.py', 'Hero Block']

        grep_cmd = get_grep_command()
        root = r'c:\Users\Bean\Projects\small-giants-wp'
        matches = run_grep('Hero Block', root, grep_cmd)

        if not matches:
            print("FAIL: No matches found for 'Hero Block'", file=sys.stderr)
            return False

        print(f"PASS: Found {len(matches)} matches for 'Hero Block'")

        # Test 2: verify stripped form works
        stripped = strip_block_qualifier("Icon Block (single icon)")
        if stripped != "Icon Block":
            print(f"FAIL: Strip failed. Expected 'Icon Block', got '{stripped}'",
                  file=sys.stderr)
            return False

        print("PASS: Strip qualifier works correctly")
        return True

    except Exception as e:
        print(f"FAIL: {e}", file=sys.stderr)
        return False


if __name__ == '__main__':
    # If invoked with no args, run smoke test
    if len(sys.argv) == 1:
        sys.exit(0 if validate_capture() else 1)
    else:
        main()
