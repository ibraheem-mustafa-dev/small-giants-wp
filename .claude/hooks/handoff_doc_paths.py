#!/usr/bin/env python
"""Live docs that name a repo path that does not exist, or a name the calibration retirement removed.

Used by handoff-preflight.py (check `doc-paths`); run it alone for the full list and the reason each class of path was
accepted:

    python .claude/hooks/handoff_doc_paths.py [repo-root] [--classes]

A live doc is a Markdown file the next session reads as current truth (CLAUDE.md files, rules, specs, plans,
dev-setup, catalogues, skills, site docs). Dated or frozen folders (archive, reports, memory, verify, qa,
gap-analysis, cloud-agents, prompts, backups, worktrees, scratch) are not live.

Two findings, both read from the repo, never from a copied list:
  dangling  a backticked or linked path, outside a code fence, that no rule below explains.
  retired   a mention of a file in scripts/computed-route/tools/retire-calibration.mjs REMOVED that no longer
            exists. The file's bare name is matched when no other file has it; otherwise its full path is.

A path is NOT dangling when one of these rules explains it (each class is counted by `--classes`):
  not-a-path          a URL, glob, placeholder, drive path, `...`, or a name with no folder part.
  folder-word         a bare `name/`: a folder named in prose, not a path.
  placeholder         a stand-in segment (`path/file.php`, `round-N/`, `rules/NN-x.js`).
  server-install      a WordPress or hosting path: wp-content, wp-includes, wp-admin, wp-json, public_html, domains,
                      themes, mu-plugins, uploads.
  foreign-namespace   another project's folder or a block or REST namespace: packages/, woocommerce/, wc/, wp/,
                      core/, sgs/, data:, and `name/v1/` REST routes.
  exists              a file or folder in the checkout (tracked or untracked), a suffix of one (a README may write
                      `lib/x.mjs` for `scripts/y/lib/x.mjs`), relative to the doc's folder or any folder above it,
                      `.claude/`, `plugins/sgs-blocks/` or `theme/sgs-theme/`, or relative to a folder the doc
                      names (`handoff-schema/trace/` in a doc that says `.claude/claude-design-handoff/`).
  exists-on-disk      present on disk but gitignored (secrets, vendor, build output): the disk is asked about a path
                      only when the git index does not have it, in this checkout and in the main one.
  generated-output    a path inside a folder named build, qa, cache, dist, node_modules or vendor: output a run makes.
  per-run             a path with a dated segment (2026-10-23T04-45-48): one run's output.
  tool-state          a path in a hidden folder that tracked code creates (`.sgs-delta/`) or git's own (`.git/`).
  gitignored          absent, but git ignores that location (scratch, secrets, a site's intake folder).
  foreign-project     the sentence names Gutenberg, WooCommerce, WordPress core or another repo.
  server-command      the sentence is about scp, ssh, rsync, a `remote:` target or the server.
  scratch             the sentence calls the file scratch or scratchpad material.
  outside-repo        the sentence names a drive path (`E:/...`) or content paths (site-relative, page-relative).
  planned             the sentence says the path will be made ("a new `x`").
  absence             the path sits in a "Removed" section, or the sentence says "no `x`", "never create `x`", "`x` does
                      not exist", "`x` MUST be removed", or a tool "removes `x`".
Anything else is a finding. A line carrying the marker dangling-ok (an HTML comment) is skipped as a last resort for
a path that is correct as written and that no rule can know.
"""
import json
import os
import posixpath
import re
import shutil
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Callable, NamedTuple

REPO = Path(__file__).resolve().parents[2]
RETIRE_LIST = "scripts/computed-route/tools/retire-calibration.mjs"

NOT_LIVE_DIRS = ("archive/", "reports/", ".claude/memory/", ".claude/verify/", ".claude/qa/", ".claude/gap-analysis/",
                 ".claude/cloud-agents/", ".claude/prompts/", ".claude/backups/", ".claude/worktrees/", ".claude/scratch/")
SKIP_PARTS = {"node_modules", "vendor", "build", ".git", "stackable", "backups"}
SERVER_PREFIXES = ("wp-content/", "wp-includes/", "wp-admin/", "wp-json/", "public_html/", "domains/", "themes/",
                   "mu-plugins/", "uploads/")
EXTERNAL_PREFIXES = ("packages/", "woocommerce/", "wc/", "wp/", "core/", "sgs/", "data:")
REST_ROUTE = re.compile(r"^[a-z0-9-]+/v\d+/?$")
GENERATED_SEGMENTS = {"build", "qa", "cache", "dist", "node_modules", "vendor"}
DATED_SEGMENT = re.compile(r"(?:^|/)\d{4}-\d{2}-\d{2}")
BASES = ("", ".claude", "plugins/sgs-blocks", "theme/sgs-theme")
# Where an ignored folder can sit when a doc writes its tail only (`intake/inventories/` for `sites/<client>/build/intake/inventories/`).
IGNORE_PARENTS = ("", "x", "sites/x", "sites/x/build", "plugins/x", "theme/x")
# Where untracked Markdown can live (a doc written this session and not yet committed); a narrow pathspec keeps `git ls-files -o` fast.
UNTRACKED_DOC_PATHS = (":(glob)*.md", ":(glob).claude/*.md", ".claude/specs", ".claude/plans", ".claude/rules", ".claude/skills",
                       ".claude/catalogues", ".claude/claude-design-handoff", "scripts", "plugins", "theme", ":(glob)sites/*/CLAUDE.md")
OK_MARKER = "dangling-ok"
PLACEHOLDER = re.compile(r"(?:^|/)(?:path|dir|file|foo|bar|NN|N|X)(?:/|$)|-N(?:/|$)|(?:^|/)NN-")
EXAMPLE_LINE = re.compile(r"\be\.g\.|\bfor example\b|\bsuch as\b|\(example\b|\bexample:", re.IGNORECASE)
FOREIGN_SENTENCE = re.compile(r"Gutenberg|WooCommerce|WordPress core|\bCore's\b|\bcore's\b|separate `[^`]+` repo|\bupstream\b", re.IGNORECASE)
SERVER_SENTENCE = re.compile(r"\bscp\b|\bssh\b|\brsync\b|\bremote:|on the server|server-side", re.IGNORECASE)
SCRATCH_SENTENCE = re.compile(r"\bscratch(?:pad)?\b", re.IGNORECASE)
OUTSIDE_SENTENCE = re.compile(r"\b[A-Za-z]:[\\/]|site-relative|page-relative|relative to the (?:site|page)")
ABSENCE_HEADING = re.compile(r"^#+\s.*\b(?:removed|deleted|retired|gone|dropped)\b", re.IGNORECASE)
ABSENCE_INTRO = re.compile(r"none of the following|do(?:es)? not exist|no longer exist", re.IGNORECASE)
# A negation right before the path ("There is no `x`", "**No `x/` directory**", "Never create a `x` at `y`"), or a verb that acts on it (a tool "removes `x`").
ABSENCE_BEFORE = re.compile(r"\b(?:no|never|without|none|nothing)\b[^;]{0,80}$|\b(?:removes?|deletes?|clears?)\b[^;]{0,40}$", re.IGNORECASE)
# A path the doc says will be made: "a new `x`", "will be created in `x`".
PLANNED_BEFORE = re.compile(r"\b(?:a|an|the) new\b[^;]{0,25}$|\bwill (?:be|add|create|write)\b[^;]{0,40}$|\bto be (?:created|added|built)\b[^;]{0,40}$", re.IGNORECASE)
ABSENCE_AFTER = re.compile(r"^[`)\]*_\s,]*[^.;`]{0,60}?\b(?:does not exist|do not exist|no longer exist|doesn't exist|(?:is|are|was|were) (?:gone|removed|deleted|missing)"
                           r"|MUST be removed|not ported)\b", re.IGNORECASE)
TICK = re.compile(r"`([^`\n]+)`")
LINK = re.compile(r"\]\(([^)\s]+)\)")


def is_live(rel: str) -> bool:
    if any(rel.startswith(d) or "/" + d in "/" + rel for d in NOT_LIVE_DIRS):
        return False
    parts = rel.split("/")
    if SKIP_PARTS & set(parts[:-1]) or ".example." in parts[-1]:
        return False
    name = parts[-1]
    if len(parts) == 1 or parts[0] == ".claude":
        return True
    if parts[0] == "scripts" and name == "README.md":
        return True
    if parts[0] == "plugins" and name in ("README.md", "CLAUDE.md"):
        return True
    if parts[0] == "theme" and name == "CLAUDE.md":
        return True
    return parts[0] == "sites" and len(parts) == 3 and name == "CLAUDE.md"


def shape_class(raw: str) -> tuple[str | None, str | None]:
    """(path, None) for a repo-path-shaped string from a backtick or link, else (None, the class that excludes it)."""
    s = raw.strip().strip("\"'").split("#")[0].split("::")[0]
    s = re.sub(r":\d+(-\d+)?$", "", s)
    if not s or " " in s or "://" in s or s.startswith(("~", "mailto:", "@", "http")) or "..." in s:
        return None, "not-a-path"
    if re.match(r"^[A-Za-z]:[\\/]", s) or any(c in s for c in "*<>{}$|?()[]=,;"):
        return None, "not-a-path"
    if "/" not in s or not (s.endswith("/") or re.search(r"\.[A-Za-z0-9]{1,6}$", s)):
        return None, "not-a-path"
    bare = s.lstrip("/")
    if bare.startswith(SERVER_PREFIXES):
        return None, "server-install"
    if bare.startswith(EXTERNAL_PREFIXES) or REST_ROUTE.match(bare):
        return None, "foreign-namespace"
    if PLACEHOLDER.search(s):
        return None, "placeholder"
    if len(s.rstrip("/").split("/")) < 2:
        return None, "folder-word"
    return s, None


def candidate(raw: str) -> str | None:
    """A repo-path-shaped string from a backtick or link, or None when it is not one."""
    return shape_class(raw)[0]


class PathIndex:
    """Every file and folder of the checkout, and every suffix of each (shorthand relative to a sub-folder).

    `paths` are repo-relative with forward slashes; folders are derived from them. A path that is gitignored (build
    output, secrets) is not in `paths`: `fs_roots`, when given, are the checkouts whose disk is asked about it."""

    def __init__(self, paths, fs_roots: tuple[Path, ...] = ()):
        self.fs_roots = fs_roots
        self.known = set()
        self.suffixes = set()
        for p in paths:
            parts = p.rstrip("/").split("/")
            for i in range(1, len(parts) + 1):
                self.known.add("/".join(parts[:i]))
        for k in self.known:  # every file and every folder, so `extensions/hover-effects/` finds `plugins/.../extensions/hover-effects/`
            parts = k.split("/")
            for i in range(len(parts)):
                self.suffixes.add("/".join(parts[i:]))
        # A doc about one client writes its paths from that client's folder (`handoff/assets/`, `build/intake/`).
        sites = sorted(k for k in self.known if re.fullmatch(r"sites/[^/]+", k))
        self.site_bases = tuple(sites) + tuple(s + "/build" for s in sites)

    def in_index(self, full: str) -> bool:
        return full in self.known

    def on_disk(self, full: str) -> bool:
        return any(os.path.exists(r / full) for r in self.fs_roots)

    def resolve(self, cand: str, doc_dir: str, named_dirs=()) -> str | None:
        """The class that finds `cand` in the checkout ("exists" or "exists-on-disk"), or None."""
        if cand.startswith("/"):
            return "exists"  # a site URL route or an absolute path: not a repo path
        if cand.rstrip("/") in self.suffixes:
            return "exists"
        ancestors = []
        d = doc_dir
        while d:
            ancestors.append(d)
            d = posixpath.dirname(d)
        bases = tuple(ancestors) + BASES + tuple(named_dirs) + self.site_bases
        fulls = [posixpath.normpath(posixpath.join(b, cand)) for b in bases]
        if any(self.in_index(f) for f in fulls):
            return "exists"
        return "exists-on-disk" if any(self.on_disk(f) for f in fulls) else None

    def exists(self, cand: str, doc_dir: str) -> bool:
        return self.resolve(cand, doc_dir) is not None


class Finding(NamedTuple):
    doc: str
    line: int
    kind: str       # "dangling path" or "retired name"
    value: str

    def __str__(self) -> str:
        return f"{self.doc}:{self.line} {self.kind} {self.value}"


def sentence_around(line: str, start: int, end: int) -> tuple[str, str]:
    """The text of `line` before `start` and after `end`, cut at the nearest sentence break (`. `, `; `, ` | `)."""
    before = re.split(r"(?:[.!?;]\s+|\s\|\s)", line[:start])[-1]
    after = re.split(r"(?:[.!?;]\s+|\s\|\s)", line[end:], maxsplit=1)[0]
    return before, after


def line_dirs(line: str) -> list[str]:
    """Folder prefixes of the path-like tokens in `line`, placeholders written as `x` (bases for a tail written beside them)."""
    out = []
    for raw in TICK.findall(line):
        s = re.sub(r"<[^>]*>|\{[^}]*\}|\*", "x", raw.strip().split("::")[0])
        if "/" in s and " " not in s and "://" not in s:
            parts = s.rstrip("/").split("/")
            out += ["/".join(parts[:i]) for i in range(1, len(parts) + (1 if s.endswith("/") else 0))]
    return out


def doc_named_dirs(text: str, index: PathIndex) -> list[str]:
    """Folders the doc names that exist in the checkout (`.claude/claude-design-handoff/`): bases for the doc's shorter paths."""
    out = set()
    for raw in TICK.findall(text):
        s = raw.strip().split("::")[0].rstrip("/")
        if "/" in s and " " not in s and "*" not in s and "<" not in s and s in index.known:
            out.add(s)
    return sorted(out)


def find_problems(docs: dict[str, str], index: PathIndex, retired: re.Pattern | None,
                  ignored: Callable[[list[str]], set[str]] | None = None,
                  tool_state: Callable[[str], bool] | None = None, tally: Counter | None = None,
                  trace: list | None = None) -> list[Finding]:
    """Every dangling path and retired-name mention in `docs`.

    `ignored` answers which of a list of repo paths git ignores, and `tool_state` whether tracked code names a hidden
    folder; both are asked only about paths no cheaper rule explained. `tally` counts each rule's catches; `trace`, when given, collects (doc, path, rule) for each."""
    tally = tally if tally is not None else Counter()
    def count(rel, cand, rule):
        tally[rule] += 1
        if trace is not None:
            trace.append((rel, cand, rule))

    problems: list[Finding] = []
    pending = []  # (doc, line, cand, probes): paths only a git-ignore lookup can explain
    for rel in sorted(docs):
        doc_dir = posixpath.dirname(rel)
        named = None
        seen, in_code = set(), False
        absent_section, previous = False, ""  # inside a "Removed" section; the paragraph before this line
        for n, line in enumerate(docs[rel].split("\n"), 1):
            if line.startswith("```"):
                in_code = not in_code
                continue
            after_intro = bool(ABSENCE_INTRO.search(previous))  # the paragraph before says nothing listed here exists
            if not in_code and line.startswith("#"):
                absent_section, previous = bool(ABSENCE_HEADING.match(line)), ""
            elif not in_code and line.strip():
                previous = line
            if OK_MARKER in line:
                continue
            if not in_code and not EXAMPLE_LINE.search(line):
                for raw in TICK.findall(line) + LINK.findall(line):
                    cand, skipped = shape_class(raw)
                    if skipped:
                        count(rel, raw.strip().strip(chr(96)), skipped)
                        continue
                    if cand in seen:
                        continue
                    seen.add(cand)
                    if named is None:
                        named = doc_named_dirs(docs[rel], index)
                    found = index.resolve(cand, doc_dir, named)
                    if found:
                        count(rel, cand, found)
                        continue
                    start = line.find(raw)
                    before, after = sentence_around(line, start, start + len(raw))
                    sentence = before + " " + after
                    segments = set(cand.rstrip("/").split("/"))
                    first = cand.split("/")[0]
                    why = None
                    if segments & GENERATED_SEGMENTS:
                        why = "generated-output"
                    elif DATED_SEGMENT.search(cand):
                        why = "per-run"
                    elif first == ".git" or (first.startswith(".") and first != ".." and first not in index.known and tool_state and tool_state(first)):
                        why = "tool-state"
                    elif FOREIGN_SENTENCE.search(sentence):
                        why = "foreign-project"
                    elif SERVER_SENTENCE.search(sentence):
                        why = "server-command"
                    elif SCRATCH_SENTENCE.search(sentence):
                        why = "scratch"
                    elif OUTSIDE_SENTENCE.search(sentence):
                        why = "outside-repo"
                    elif PLANNED_BEFORE.search(before):
                        why = "planned"
                    elif absent_section or after_intro or ABSENCE_BEFORE.search(before) or ABSENCE_AFTER.search(after):
                        why = "absence"
                    if why:
                        count(rel, cand, why)
                        continue
                    bases = IGNORE_PARENTS + tuple(line_dirs(line)) + (doc_dir,)
                    probes = {posixpath.normpath(posixpath.join(b, cand)) for b in bases}
                    probes = {q for q in probes if not q.startswith("..") and not posixpath.isabs(q)}  # git check-ignore aborts on a path outside the repo
                    pending.append((rel, n, cand, sorted(probes)))
            if retired and (m := retired.search(line)):
                before, after = sentence_around(line, m.start(), m.end())
                if absent_section or after_intro or ABSENCE_BEFORE.search(before) or ABSENCE_AFTER.search(after):
                    tally["retired-name said to be gone"] += 1  # the doc itself says the file is gone: current truth
                else:
                    problems.append(Finding(rel, n, "retired name", m.group(1)))
    if pending:
        flat = sorted({p for *_, probes in pending for p in probes} | {p + "/_" for *_, probes in pending for p in probes})
        hit = ignored(flat) if ignored else set()
        for rel, n, cand, probes in pending:
            if any(p in hit or p + "/_" in hit for p in probes):
                count(rel, cand, "gitignored")
            else:
                problems.append(Finding(rel, n, "dangling path", cand))
    return sorted(problems, key=lambda f: (f.doc, f.line, f.kind, f.value))


def _git_list(root: Path, *args) -> list[str]:
    out = subprocess.run(["git", "-C", str(root), "-c", "core.quotepath=false", "ls-files", "-z", *args],
                         capture_output=True, text=True, encoding="utf-8", errors="replace").stdout
    return [p for p in out.split("\0") if p]


def _checkouts(root: Path) -> tuple[Path, ...]:
    """`root`, and the main checkout when `root` is a worktree: gitignored files (secrets, build output) live there."""
    common = subprocess.run(["git", "-C", str(root), "rev-parse", "--path-format=absolute", "--git-common-dir"],
                            capture_output=True, text=True).stdout.strip()
    main = Path(common).parent if common else root
    return (root,) if main.resolve() == root.resolve() else (root, main)


def git_ignored(root: Path) -> Callable[[list[str]], set[str]]:
    """A lookup for which of a list of repo paths git ignores (one `git check-ignore` call, whatever the list)."""
    def lookup(paths: list[str]) -> set[str]:
        out = subprocess.run(["git", "-C", str(root), "check-ignore", "--no-index", "-z", "--stdin"], input="\0".join(paths) + "\0",
                             capture_output=True, text=True, encoding="utf-8", errors="replace").stdout
        return {p.rstrip("/") for p in out.split("\0") if p}
    return lookup


def code_names_folder(root: Path) -> Callable[[str], bool]:
    """Whether tracked non-Markdown code names a hidden folder (`.sgs-delta`): a folder a tool makes at run time."""
    cache: dict[str, bool] = {}

    def lookup(name: str) -> bool:
        if name not in cache:
            out = subprocess.run(["git", "-C", str(root), "grep", "-l", "-F", "-e", name, "--", ":!*.md"],
                                 capture_output=True, text=True, encoding="utf-8", errors="replace").stdout
            cache[name] = bool(out.strip())
        return cache[name]
    return lookup


def removed_paths(root: Path) -> tuple[list[str] | None, str]:
    """REMOVED's paths, read from retire-calibration.mjs by importing it. (None, reason) when that cannot be done."""
    if not (root / RETIRE_LIST).is_file():
        return [], ""  # no retire list in this checkout: nothing was retired
    node = shutil.which("node") or shutil.which("node.exe")
    if not node:
        return None, f"node is not on PATH, so {RETIRE_LIST} cannot be read"
    js = f"import('./{RETIRE_LIST}').then(m=>console.log(JSON.stringify(m.REMOVED.map(r=>r.path))))"
    r = subprocess.run([node, "-e", js], cwd=root, capture_output=True, text=True, timeout=60)
    try:
        return json.loads(r.stdout), ""
    except ValueError:
        return None, f"{RETIRE_LIST} did not print its REMOVED list: {(r.stderr or r.stdout).strip()[:160]}"


def retired_pattern(removed: list[str], present_names: set[str], known: set[str]) -> re.Pattern | None:
    """One pattern naming every REMOVED path that no longer exists: its bare name, or its full path when another
    file has that name. None when nothing was removed."""
    targets = set()
    for p in removed:
        if p in known:
            continue
        name = posixpath.basename(p)
        targets.add(p if name in present_names else name)
    if not targets:
        return None
    alternatives = "|".join(re.escape(t) for t in sorted(targets, key=len, reverse=True))
    return re.compile(r"(?<![\w-])(" + alternatives + r")(?![\w-])")


def scan(root: Path = REPO, tally: Counter | None = None, trace: list | None = None) -> tuple[list[Finding], str]:
    """All findings for the checkout at `root`, and a note ("" when everything ran, else why it could not run)."""
    tracked = _git_list(root, "-c")
    untracked = _git_list(root, "-o", "--exclude-standard", "--", *UNTRACKED_DOC_PATHS)
    index = PathIndex(tracked + untracked, fs_roots=_checkouts(root))
    docs = {}
    for rel in tracked + untracked:
        if rel.endswith(".md") and is_live(rel):
            try:
                docs[rel] = (root / rel).read_text(encoding="utf-8", errors="replace")
            except OSError:
                pass
    removed, note = removed_paths(root)
    if removed is None:
        return [], note
    present_names = {posixpath.basename(p) for p in tracked}
    retired = retired_pattern(removed, present_names, index.known)
    return find_problems(docs, index, retired, git_ignored(root), code_names_folder(root), tally, trace), ""


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    counts: Counter = Counter()
    found, why = scan(Path(args[0]).resolve() if args else REPO, counts)
    print("\n".join(map(str, found)) if found else "no dangling paths or retired names")
    if "--classes" in sys.argv:
        print("\nPaths explained, by rule:")
        for name, n in counts.most_common():
            print(f"  {n:5d}  {name}")
    if why:
        print(f"NOT CHECKED: {why}", file=sys.stderr)
        sys.exit(2)
    sys.exit(1 if found else 0)
