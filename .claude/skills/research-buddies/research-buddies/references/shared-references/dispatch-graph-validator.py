#!/usr/bin/env python3
"""
Dispatch Graph Validator — checks that every skill, agent, or command named
as a dispatch target in an artefact resolves to a live artefact on disk.

Used by optimiser skills (skill-optimiser, agent-optimiser, pipeline-optimiser)
to catch dead cross-skill references before they reach production. Complements
the sgs-skillscore intra-skill file reference check: the intra check handles
file paths, this tool handles named routing targets.

Usage:
    python dispatch-graph-validator.py <target-path> [--type skill|agent|pipeline]
                                       [--json] [--registry <path>]

Exit codes:
    0  no dead references
    1  at least one dead reference found
    2  bad invocation (missing path, invalid args)
"""
import sys
import os
import re
import json
import argparse
from pathlib import Path


# ─────────────────────────────────────────────
# Registry discovery
# ─────────────────────────────────────────────
DEFAULT_SKILL_ROOTS = [
    Path.home() / ".agents" / "skills",
    Path.home() / ".claude" / "skills",
]
DEFAULT_AGENT_ROOTS = [
    Path.home() / ".claude" / "agents",
]
DEFAULT_COMMAND_ROOTS = [
    Path.home() / ".claude" / "commands",
]


def discover_live_skills(extra_roots=None) -> set:
    """Return the set of live skill names (directory names containing SKILL.md)."""
    names = set()
    roots = list(DEFAULT_SKILL_ROOTS)
    if extra_roots:
        roots.extend(Path(r) for r in extra_roots)
    for root in roots:
        if not root.is_dir():
            continue
        for child in root.iterdir():
            if not child.is_dir():
                continue
            # Accept either SKILL.md or skill.md
            if (child / "SKILL.md").is_file() or (child / "skill.md").is_file():
                names.add(child.name)
    return names


def discover_live_agents(extra_roots=None) -> set:
    """Return the set of live agent names (flat .md files in agents/)."""
    names = set()
    roots = list(DEFAULT_AGENT_ROOTS)
    if extra_roots:
        roots.extend(Path(r) for r in extra_roots)
    for root in roots:
        if not root.is_dir():
            continue
        for child in root.iterdir():
            if child.is_file() and child.suffix.lower() == ".md":
                names.add(child.stem)
    return names


def discover_live_commands(extra_roots=None) -> set:
    """Return the set of live command names (.md files in commands/, nested allowed)."""
    names = set()
    roots = list(DEFAULT_COMMAND_ROOTS)
    if extra_roots:
        roots.extend(Path(r) for r in extra_roots)
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("*.md"):
            names.add(path.stem)
    return names


# ─────────────────────────────────────────────
# Dispatch target extraction
# ─────────────────────────────────────────────
# Slash-command style: /my-skill, /router:subcommand.
# Negative lookbehind excludes preceding / or word chars (avoiding "./foo", "a/b").
# Negative lookahead excludes trailing / (filesystem paths like "/path/to/file").
# Negative lookahead also excludes ". " or ".md" and similar to avoid "/path.md".
SLASH_REF_RE = re.compile(
    r'(?<![a-zA-Z0-9_/.])/([a-zA-Z][a-zA-Z0-9_-]*(?::[a-zA-Z0-9_-]+)?)(?![/\w.-])'
)
# Backtick-quoted skill name: `skill-name`
BACKTICK_REF_RE = re.compile(r'`([a-zA-Z][a-zA-Z0-9_-]*)`')
# Explicit "skill:" / "agent:" / "command:" labels in frontmatter-ish blocks
LABELLED_REF_RE = re.compile(r'(?:^|\b)(skill|agent|command):\s*([a-zA-Z][a-zA-Z0-9_-]*)', re.MULTILINE)

# Ignore directive: <!-- dispatch-graph-validator: ignore name1 name2 -->
IGNORE_DIRECTIVE_RE = re.compile(
    r'<!--\s*dispatch-graph-validator:\s*ignore\s+([^\s][^>]*?)\s*-->',
    re.IGNORECASE,
)

# Words that look like skill names but are stop words or common English / filename tokens.
STOP_WORDS = {
    'help', 'info', 'version', 'done', 'cancel', 'test', 'run', 'start',
    'stop', 'pass', 'fail', 'yes', 'no', 'ok', 'true', 'false', 'none',
    'null', 'error', 'warning', 'debug', 'readme', 'example', 'exemplar',
    'md', 'py', 'sh', 'js', 'json', 'yml', 'yaml', 'txt', 'log',
}


ROUTING_SECTION_HEADINGS = (
    'when not to use',
    'alternatives',
    'skill routing',
    'routing',
    'dispatch',
    'sub-skills',
    'subskills',
    'sub skills',
    'classification',
    'redirects',
    'see also',
)


def _extract_routing_sections(content: str) -> list:
    """Return the text of every section whose heading matches a routing keyword.

    Scans markdown headings (#, ##, ###) and collects each section body until the
    next heading at the same or higher level. Matching is case-insensitive and
    permissive — any heading containing a routing keyword qualifies."""
    lines = content.split('\n')
    sections = []
    in_section = False
    current_level = 0
    buffer = []
    heading_re = re.compile(r'^(#{1,6})\s+(.*)$')
    for line in lines:
        m = heading_re.match(line)
        if m:
            level = len(m.group(1))
            title = m.group(2).strip().lower()
            # Close any open section first
            if in_section and (level <= current_level):
                sections.append('\n'.join(buffer))
                buffer = []
                in_section = False
            # Open a new section if this heading matches
            if any(kw in title for kw in ROUTING_SECTION_HEADINGS):
                in_section = True
                current_level = level
                buffer = []
                continue
        if in_section:
            buffer.append(line)
    if in_section and buffer:
        sections.append('\n'.join(buffer))
    return sections


def extract_dispatch_targets(content: str) -> set:
    """Return the set of plausible dispatch target names mentioned in content.

    Looks for three patterns:
      1. /skill-name or /skill:subcommand (slash-command style) — anywhere in the doc
      2. `skill-name` (backtick-quoted identifier) — ONLY inside routing sections
      3. skill: name / agent: name / command: name labelled references — anywhere

    Restricting backtick extraction to routing sections dramatically reduces false
    positives from prose that happens to mention other skill or tool names. The
    result is still a superset of true dispatch targets — final resolution against
    the live registry catches any remaining noise.
    """
    found = set()
    # 1. Slash-style references anywhere in the doc
    for m in SLASH_REF_RE.finditer(content):
        found.add(m.group(1))
    # 3. Labelled references anywhere in the doc
    for m in LABELLED_REF_RE.finditer(content):
        found.add(m.group(2))
    # 2. Backtick references ONLY in routing sections
    routing_sections = _extract_routing_sections(content)
    for section in routing_sections:
        for m in BACKTICK_REF_RE.finditer(section):
            name = m.group(1)
            if len(name) <= 2:
                continue
            if name.lower() in STOP_WORDS:
                continue
            if name.isdigit():
                continue
            found.add(name)
    # Filter: discard tokens that look like file extensions or uppercase constants
    filtered = {n for n in found if '.' not in n and not n.isupper()}
    return filtered


def collect_ignored(content: str) -> set:
    """Names explicitly marked as expected dead references via the ignore directive."""
    ignored = set()
    for m in IGNORE_DIRECTIVE_RE.finditer(content):
        raw = m.group(1).strip()
        for token in raw.split():
            ignored.add(token)
    return ignored


# ─────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────
def validate(target_path: str, target_type: str = None, extra_roots=None) -> dict:
    """Validate a single artefact's dispatch graph.

    Returns a dict:
      {
        "target": str,
        "target_type": str,
        "total_references": int,
        "resolved": [names...],
        "dead": [names...],
        "ignored": [names...],
      }
    """
    path = Path(target_path)
    if path.is_dir():
        md = path / "SKILL.md"
        if not md.is_file():
            md = path / "skill.md"
        if not md.is_file():
            return {"error": f"No SKILL.md in directory: {target_path}"}
    else:
        md = path
    if not md.is_file():
        return {"error": f"File not found: {md}"}

    content = md.read_text(encoding="utf-8", errors="replace")
    refs = extract_dispatch_targets(content)
    ignored_names = collect_ignored(content)

    live_skills = discover_live_skills(extra_roots)
    live_agents = discover_live_agents(extra_roots)
    live_commands = discover_live_commands(extra_roots)
    all_live = live_skills | live_agents | live_commands

    resolved = []
    dead = []
    ignored_hit = []
    for name in sorted(refs):
        # Strip any ":subcommand" tail for matching
        base = name.split(":", 1)[0]
        if name in ignored_names or base in ignored_names:
            ignored_hit.append(name)
            continue
        if base in all_live:
            resolved.append(name)
        else:
            dead.append(name)

    return {
        "target": str(md),
        "target_type": target_type or "auto",
        "total_references": len(refs),
        "resolved": resolved,
        "dead": dead,
        "ignored": ignored_hit,
        "live_skill_count": len(live_skills),
        "live_agent_count": len(live_agents),
        "live_command_count": len(live_commands),
    }


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Validate dispatch graph — find dead cross-skill references",
    )
    parser.add_argument("target", help="Path to a skill directory, agent .md, or command .md")
    parser.add_argument("--type", choices=["skill", "agent", "pipeline", "command"],
                        help="Artefact type hint (informational only)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--registry", action="append", dest="extra_roots",
                        help="Additional skill/agent root to include (can repeat)")
    args = parser.parse_args()

    result = validate(args.target, target_type=args.type, extra_roots=args.extra_roots)

    if "error" in result:
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"ERROR: {result['error']}", file=sys.stderr)
        sys.exit(2)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Dispatch graph for {result['target']}")
        print(f"  Total references: {result['total_references']}")
        print(f"  Resolved:         {len(result['resolved'])}")
        print(f"  Ignored:          {len(result['ignored'])}")
        print(f"  Dead:             {len(result['dead'])}")
        print(f"  Live registry:    {result['live_skill_count']} skills, "
              f"{result['live_agent_count']} agents, "
              f"{result['live_command_count']} commands")
        if result["dead"]:
            print("\nDEAD references (targets that do not resolve to any live artefact):")
            for name in result["dead"]:
                print(f"  - {name}")
            print("\nFix: rename or remove the dead references, or add "
                  "<!-- dispatch-graph-validator: ignore <name> --> "
                  "if the name is intentional (e.g. a planned-future skill).")
        else:
            print("\nAll dispatch targets resolve cleanly.")

    sys.exit(1 if result["dead"] else 0)


if __name__ == "__main__":
    main()
