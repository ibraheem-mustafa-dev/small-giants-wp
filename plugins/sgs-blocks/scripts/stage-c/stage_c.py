#!/usr/bin/env python3
"""Stage C detector: where a page's per-instance CSS comes from, and whether a change kept the cascade.

Plan: .claude/plans/archive/2026-11-19-stage-c-per-instance-css.md (Task 1). Method: .claude/skills/migration-method/SKILL.md.

Every SGS block prints the CSS for its own settings as a `<style>` tag in its HTML; the collector
(`includes/class-sgs-css-registry.php`) lifts those tags into one `<style id="sgs-blocks-collected">` per page. This tool
names the code that writes that CSS and how much of it repeats.

  --install <mirror>[,<mirror>]   copy survey-probe.php into each local mirror's mu-plugins (it is inert unless asked)
  --survey [--json]               render each page every sites/<client>/stage-c.json lists, on that client's mirror, with the probe on and report, per page: bytes,
                                  rules, distinct rule bodies, and the emitters ranked by bytes, each with the bytes a
                                  repeated body costs (a body printed again under another selector in the same context)
  --fix                           the worklist: emitters ranked by bytes across every page, with a sample rule for each
  --check                         exit 1 when a page's collected CSS has more bytes, rules or :has() rules than the
                                  baseline recorded in its client's sites/<client>/stage-c.json (a :has() selector makes the browser search the subtree of every
                                  element it could match: one client's product page 4.9 s of style work with them, 1.5 s
                                  without, 2026-11-19)
                                  --record writes the current survey as each client's baseline
  --compare <before> <after>      two snapshot folders (written by --survey --snapshot <dir>): for each page, the value
                                  every element ends up with for every property, at 375, 768 and 1440 px, read from ALL
                                  of the page's `<style>` CSS (inline delivery prints every stylesheet in the page), must
                                  be the same before and after; exit 1 on any difference
  --mirror <client>=<mirror>[,..] with --survey/--fix/--check: render that client's pages on another mirror for this run
                                  (a scratch copy made by scripts/local-wp/scratch-mirror.sh, found through the gitignored
                                  scripts/computed-route/calibration-targets.local.json); its stage-c.json is not changed, and
                                  --record is refused with it
  --self-test                     plants a repeated body and an override pair and asserts both are caught; with
                                  --unplant the plants are removed and the self-test must fail (proves it can fail)

The cascade comparison is a model, not a browser: it reads class, tag, id, `:root` and attribute selectors (presence
and exact value) joined by descendant or child combinators, with pseudo-classes and pseudo-elements kept as part of the
state; it evaluates width, hover, pointer and reduced-motion media queries; a rule it cannot read (:is/:where/:not/:has,
other attribute operators, sibling combinators, @container) is counted as `unread` and left out on both sides, so a
change to such a rule needs the browser proof. The render check (scripts/render-check/) is the browser
proof; this is the fast one.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from collections import Counter, defaultdict
from functools import lru_cache
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parent.parent
ROOT = PLUGIN.parent.parent
PROBE = HERE / "survey-probe.php"
TARGETS_FILE = ROOT / "scripts" / "computed-route" / "calibration-targets.json"

SITES = ROOT / "sites"
SITE_FILE = "stage-c.json"  # sites/<client>/stage-c.json: {"mirror": <local mirror key>, "pages": {label: path}, "baseline": {...}}


def site_files() -> list[Path]:
    """Every client folder that lists pages for this survey."""
    return sorted(SITES.glob(f"*/{SITE_FILE}"))


# Client folder -> mirror for this run, from --mirror; a client not named here uses its stage-c.json mirror.
MIRROR_OVERRIDE: dict[str, str] = {}


def parse_mirror_override(spec: str) -> dict[str, str]:
    """'<client folder>=<mirror>[,...]' -> {client folder: mirror}; refuses a client with no stage-c.json."""
    known = {f.parent.name for f in site_files()}
    out = {}
    for part in filter(None, (p.strip() for p in spec.split(","))):
        client, sep, name = part.partition("=")
        if not sep or not client or not name:
            raise SystemExit(f"--mirror: '{part}' is not <client folder>=<mirror>")
        if client not in known:
            raise SystemExit(f"--mirror: no sites/{client}/{SITE_FILE} (known: {', '.join(sorted(known))})")
        out[client] = name
    return out


def pages() -> list[tuple[str, str, str, Path]]:
    """(label, mirror, path, site file) for every page every client lists; the label is '<client folder>/<page>'."""
    out = []
    for f in site_files():
        d = json.loads(f.read_text(encoding="utf-8"))
        name = MIRROR_OVERRIDE.get(f.parent.name, d["mirror"])
        for label, path in d["pages"].items():
            out.append((f"{f.parent.name}/{label}", name, path, f))
    return out


PROFILES = {  # width px, hover/pointer capability
    "375": {"width": 375, "hover": False},
    "768": {"width": 768, "hover": False},
    "1440": {"width": 1440, "hover": True},
}


# ─── locating mirrors ───────────────────────────────────────────────────────────────────────────────────────────────


def secrets_dir() -> Path:
    env = os.environ.get("SECRETS_DIR")
    if env:
        return Path(env)
    own = ROOT / ".claude" / "secrets"
    if own.is_dir():
        return own
    # A worktree has no secrets folder: use the main checkout's (the parent of git's common directory).
    common = subprocess.run(["git", "rev-parse", "--git-common-dir"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return (ROOT / common).resolve().parent / ".claude" / "secrets"


def mirror(name: str) -> dict:
    targets = json.loads(TARGETS_FILE.read_text(encoding="utf-8"))
    local = TARGETS_FILE.with_name("calibration-targets.local.json")  # gitignored: where scratch-mirror.sh records a scratch copy
    if local.is_file():
        targets.update(json.loads(local.read_text(encoding="utf-8")))
    if name not in targets:
        raise SystemExit(f"{name} is not in calibration-targets.json or calibration-targets.local.json")
    t = targets[name]
    docroot = t["pluginDir"].split("/wp-content/")[0]
    env = (secrets_dir() / Path(t["envFile"]).name).read_text(encoding="utf-8")
    m = re.search(r"^WP_URL_%s\s*=\s*['\"]?([^'\"\s]+)" % re.escape(t["envKey"]), env, re.M)
    if not m:
        raise SystemExit(f"{name}: WP_URL_{t['envKey']} missing from {t['envFile']}")
    return {"docroot": docroot, "url": m.group(1).rstrip("/")}


def install(names: list[str]) -> None:
    for name in names:
        docroot = mirror(name)["docroot"].replace("//wsl.localhost/Ubuntu", "")
        dest = f"{docroot}/wp-content/mu-plugins/sgs-stagec-survey-probe.php"
        src = PROBE.resolve().as_posix()
        src = f"/mnt/{src[0].lower()}{src[2:]}"  # Windows path -> WSL path
        # The mirrors' folders belong to www-data inside WSL: Windows cannot write them, root in WSL can.
        subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "install", "-m", "0644", "-o", "www-data", "-g", "www-data", src, dest], check=True)
        print(f"installed {name}:{dest}")


# ─── CSS parsing ────────────────────────────────────────────────────────────────────────────────────────────────────


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def parse_css(css: str, ctx: tuple = ()) -> list[dict]:
    """Rules in source order: {ctx: (at-rule preludes...), sel: str, body: str}."""
    css = strip_comments(css)
    out: list[dict] = []
    i, n = 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        prelude = css[i:j].strip()
        # find matching close brace (strings ignored: SGS CSS is sanitised, quotes appear only in content/url values)
        depth, k = 1, j + 1
        while k < n and depth:
            c = css[k]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif c in "\"'":
                end = css.find(c, k + 1)
                k = end if end > 0 else k
            k += 1
        inner = css[j + 1 : k - 1]
        if prelude.startswith("@"):
            head = re.sub(r"\s+", " ", prelude)
            if re.match(r"@(media|supports|container|layer|document)\b", head):
                out.extend(parse_css(inner, ctx + (head,)))
            # keyframes, font-face, page: not element rules
        elif prelude:
            # a prelude may carry a stray ';' run left by a previous at-statement (@import/@charset)
            prelude = prelude.split(";")[-1].strip()
            if prelude:
                out.append({"ctx": ctx, "sel": re.sub(r"\s+", " ", prelude), "body": inner.strip()})
        i = k
    return out


def declarations(body: str) -> list[tuple[str, str, bool]]:
    decls = []
    for part in re.split(r";(?![^()]*\))", body):
        if ":" not in part:
            continue
        prop, _, val = part.partition(":")
        prop = prop.strip().lower() if not prop.strip().startswith("--") else prop.strip()
        val = val.strip()
        imp = bool(re.search(r"!\s*important\s*$", val, re.I))
        if imp:
            val = re.sub(r"\s*!\s*important\s*$", "", val, flags=re.I)
        if prop:
            decls.append((prop, re.sub(r"\s+", " ", val), imp))
    return decls


def norm_body(body: str) -> str:
    return ";".join(f"{p}:{v}{'!important' if i else ''}" for p, v, i in declarations(body))


UID = re.compile(r"\.sgs-[a-z0-9-]+?-[0-9a-f]{8}(?![\w-])")


def signature(rule: dict) -> str:
    """The emit site's shape: the selector with instance classes replaced, plus the property names."""
    sel = UID.sub(".{uid}", rule["sel"])
    sel = re.sub(r"#[\w-]+", "#{id}", sel)
    sel = re.sub(r"\(\d+\)", "(n)", sel)
    props = ",".join(sorted({p for p, _, _ in declarations(rule["body"])}))
    ctx = " ".join(rule["ctx"])
    return f"{ctx + ' ' if ctx else ''}{sel} {{{props}}}"


# ─── survey ─────────────────────────────────────────────────────────────────────────────────────────────────────────


def fetch(url: str, timeout: int = 120) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "sgs-stage-c-survey", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def render_page(label: str, mirror_name: str, path: str) -> tuple[dict, str]:
    m = mirror(mirror_name)
    # The probe accepts only [a-z0-9-]{1,64}: fold the label to that alphabet and keep it short.
    token = f"{re.sub(r'[^a-z0-9-]+', '-', label.lower()).strip('-')[:40]}-{int(time.time() * 1000)}"
    sep = "&" if "?" in path else "?"
    html = fetch(f"{m['url']}{path}{sep}sgs_stagec_survey={token}")
    out = Path(m["docroot"]) / "wp-content" / "uploads" / "sgs-stagec" / f"{token}.json"
    for _ in range(50):
        if out.exists() and out.stat().st_size:
            break
        time.sleep(0.2)
    if not out.exists():
        raise SystemExit(f"{label}: the probe wrote nothing ({out}); run --install {mirror_name} first")
    data = json.loads(out.read_text(encoding="utf-8"))
    try:
        out.unlink()
    except OSError:
        pass  # owned by www-data; the next survey writes a new token
    return data, html


def emitter_of(block: str, stage: str, stages: dict) -> str:
    if stage == "render":
        return f"{block} render"
    names = stages.get(stage[1:], [])
    return f"{block} {stage}:{'+'.join(n.split('\\')[-1] for n in names) or '?'}"


def analyse(data: dict) -> dict:
    """Per-page figures and the emitter table, from a probe record."""
    collected = data["collected"]
    # each collected chunk -> its first emitter (block + stage)
    origin: dict[str, str] = {}
    for rec in data["records"]:
        for ch in rec["chunks"]:
            key = hashlib.md5(ch["css"].strip().encode()).hexdigest()
            origin.setdefault(key, emitter_of(rec["block"], ch["stage"], data.get("stages", {})))
    rules_all: list[dict] = []
    for chunk in collected:
        em = origin.get(hashlib.md5(chunk.strip().encode()).hexdigest(), "unattributed")
        for r in parse_css(chunk):
            r["emitter"] = em
            rules_all.append(r)
    return summarise(rules_all, sum(len(c.strip()) for c in collected))


def rule_bytes(r: dict) -> int:
    return len(r["sel"]) + len(r["body"]) + 2 + sum(len(c) + 2 for c in r["ctx"])


def summarise(rules: list[dict], total_bytes: int) -> dict:
    seen: set = set()
    per = defaultdict(lambda: {"bytes": 0, "rules": 0, "repeat_bytes": 0, "repeat_rules": 0, "sample": "", "sigs": Counter()})
    body_count: Counter = Counter()
    body_owner: dict = {}
    for r in rules:
        key = (r["ctx"], norm_body(r["body"]))
        b = rule_bytes(r)
        e = per[r["emitter"]]
        e["bytes"] += b
        e["rules"] += 1
        e["sigs"][signature(r)] += b
        if not e["sample"]:
            e["sample"] = (" ".join(r["ctx"]) + " " if r["ctx"] else "") + f"{r['sel']}{{{r['body']}}}"
        body_count[key] += 1
        body_owner.setdefault(key, (r["emitter"], signature(r)))
        if key in seen:
            e["repeat_bytes"] += b
            e["repeat_rules"] += 1
        seen.add(key)
    emitters = sorted(
        (
            {
                "emitter": k,
                "bytes": v["bytes"],
                "rules": v["rules"],
                "repeat_bytes": v["repeat_bytes"],
                "repeat_rules": v["repeat_rules"],
                "top_shapes": [{"shape": s, "bytes": b} for s, b in v["sigs"].most_common(3)],
                "sample": v["sample"][:240],
            }
            for k, v in per.items()
        ),
        key=lambda x: -x["bytes"],
    )
    top_bodies = [
        {"count": c, "context": " ".join(k[0]), "body": k[1][:160], "emitter": body_owner[k][0], "shape": body_owner[k][1][:200]}
        for k, c in body_count.most_common(20)
        if c > 1
    ]
    return {
        "bytes": total_bytes,
        "rules": len(rules),
        "distinct_bodies": len(body_count),
        "repeat_bytes": sum(e["repeat_bytes"] for e in emitters),
        "has_rules": sum(1 for r in rules if ":has(" in r["sel"]),
        "has_by_emitter": dict(Counter(r["emitter"] for r in rules if ":has(" in r["sel"]).most_common()),
        "emitters": emitters,
        "top_bodies": top_bodies,
    }


def survey(snapshot: Path | None, only: str | None) -> dict:
    report = {}
    for label, mname, path, site in pages():
        if only and label not in only.split(",") and site.parent.name not in only.split(","):
            continue
        data, html = render_page(label.replace("/", "-"), mname, path)
        report[label] = {"mirror": mname, "path": path, "site_file": str(site), **analyse(data)}
        if snapshot:
            snapshot.mkdir(parents=True, exist_ok=True)
            (snapshot / f"{label.replace('/', '--')}.html").write_text(html, encoding="utf-8")
    return report


def print_survey(report: dict) -> None:
    for label, p in report.items():
        print(f"\n== {label} ({p['mirror']} {p['path']}): {p['bytes']:,} bytes, {p['rules']:,} rules, "
              f"{p['distinct_bodies']:,} distinct bodies, {p['repeat_bytes']:,} bytes in repeated bodies, {p['has_rules']} :has() rules")
        for em, n in list(p["has_by_emitter"].items())[:8]:
            print(f"   {n:>4} :has()  {em}")
        print(f"   {'bytes':>9} {'rules':>6} {'repeat':>9}  emitter")
        for e in p["emitters"][:15]:
            print(f"   {e['bytes']:>9,} {e['rules']:>6} {e['repeat_bytes']:>9,}  {e['emitter']}")
        print("   top repeated bodies:")
        for t in p["top_bodies"][:10]:
            print(f"   {t['count']:>5}x  {t['emitter']}  {t['shape'][:110]}")


def worklist(report: dict) -> list[dict]:
    agg = defaultdict(lambda: {"bytes": 0, "repeat_bytes": 0, "rules": 0, "pages": [], "shapes": Counter(), "sample": ""})
    for label, p in report.items():
        for e in p["emitters"]:
            a = agg[e["emitter"]]
            a["bytes"] += e["bytes"]
            a["repeat_bytes"] += e["repeat_bytes"]
            a["rules"] += e["rules"]
            a["pages"].append(label)
            for s in e["top_shapes"]:
                a["shapes"][s["shape"]] += s["bytes"]
            a["sample"] = a["sample"] or e["sample"]
    return sorted(
        ({"emitter": k, **{kk: vv for kk, vv in v.items() if kk != "shapes"}, "shapes": v["shapes"].most_common(3)} for k, v in agg.items()),
        key=lambda x: -x["bytes"],
    )


# ─── cascade model (for --compare and the override-pair self-test) ────────────────────────────────────────────────


class Doc(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.els: list[dict] = []
        self.stack: list[int] = []
        self.child_count: list[Counter] = [Counter()]
        self.styles: list[str] = []
        self._in_style = False
        self._skip = 0  # inside <template>/<noscript>/<svg>: styles there do not apply

    UNRENDERED = {"script", "link", "meta", "title", "base"}  # never drawn: not compared, so adding one shifts nothing

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("template", "noscript"):
            self._skip += 1
        if tag == "style" and not self._skip:
            self._in_style = True
            self.styles.append("")
            return
        if tag in self.UNRENDERED:
            return
        parent = self.stack[-1] if self.stack else -1
        counts = self.child_count[-1]
        counts[tag] += 1
        path = (self.els[parent]["path"] if parent >= 0 else "") + f"/{tag}[{counts[tag]}]"
        el = {"tag": tag, "id": a.get("id") or "", "classes": set((a.get("class") or "").split()), "parent": parent, "path": path,
              "attrs": {k.lower(): (v if v is not None else "") for k, v in attrs}}
        self.els.append(el)
        if tag not in self.VOID:
            self.stack.append(len(self.els) - 1)
            self.child_count.append(Counter())

    def handle_endtag(self, tag):
        if tag == "style":
            self._in_style = False
            return
        if tag in self.UNRENDERED:
            return
        if tag in ("template", "noscript"):
            self._skip = max(0, self._skip - 1)
        # pop to the matching open tag (tolerant of unclosed elements)
        for k in range(len(self.stack) - 1, -1, -1):
            if self.els[self.stack[k]]["tag"] == tag:
                del self.stack[k:]
                del self.child_count[k + 1 :]
                return

    def handle_data(self, data):
        if self._in_style:
            self.styles[-1] += data


COMPOUND = re.compile(r"^(?P<tag>[a-zA-Z][\w-]*|\*)?(?P<rest>(?:[.#][\w-]+|\[[^\]]*\]|::?[a-zA-Z-]+(?:\([^()]*\))?)*)$")
UNREAD_PSEUDO = re.compile(r":(is|where|not|has|nth-|first-|last-|only-|empty|lang|dir)\b")
ATTR = re.compile(r"""\[\s*([\w-]+)\s*(?:(=)\s*("[^"]*"|'[^']*'|[^\]\s]+))?\s*\]""")


def parse_selector(sel: str):
    """[(compound, combinator_to_left)], state key, specificity; or None when the model cannot read it."""
    if re.search(r"[+~]", sel) or UNREAD_PSEUDO.search(sel):
        return None
    if re.search(r"\[[^\]]*\s[^\]]*\]", sel):  # an attribute value with a space would split the compound
        return None
    tokens = re.split(r"\s*(>)\s*|\s+", sel.strip())
    parts, comb = [], " "
    for t in tokens:
        if t is None or t == "":
            continue
        if t == ">":
            comb = ">"
            continue
        m = COMPOUND.match(t)
        if not m:
            return None
        rest = m.group("rest") or ""
        classes = set(re.findall(r"\.([\w-]+)", rest))
        ids = set(re.findall(r"#([\w-]+)", rest))
        raw_attrs = re.findall(r"\[[^\]]*\]", rest)
        attrs = []
        for ra in raw_attrs:
            am = ATTR.fullmatch(ra)
            if not am:
                return None  # ^= $= *= ~= |= and case flags: not modelled
            attrs.append((am.group(1).lower(), am.group(3).strip("\"'") if am.group(2) else None))
        rest = re.sub(r"\[[^\]]*\]", "", rest)
        pseudo = re.findall(r"::?[a-zA-Z-]+(?:\([^()]*\))?", rest)
        root = ":root" in pseudo
        pseudo = [x for x in pseudo if x != ":root"]
        tag = m.group("tag") if m.group("tag") and m.group("tag") != "*" else ""
        parts.append({"tag": "html" if root else tag.lower(), "classes": classes, "ids": ids, "attrs": attrs,
                      "pseudo": pseudo, "root": root, "comb": comb})
        comb = " "
    if not parts:
        return None
    a = sum(len(p["ids"]) for p in parts)
    b = sum(len(p["classes"]) + len(p["attrs"]) + p["root"] + sum(1 for x in p["pseudo"] if not x.startswith("::")) for p in parts)
    c = sum((1 if p["tag"] and not p["root"] else 0) + sum(1 for x in p["pseudo"] if x.startswith("::")) for p in parts)
    state = "|".join(f"{i}{''.join(sorted(p['pseudo']))}" for i, p in enumerate(parts) if p["pseudo"])
    # pseudo-classes on an ancestor change whether the rule applies (state); pseudo-elements make a different box
    return parts, state, (a, b, c)


def compound_matches(el: dict, p: dict) -> bool:
    if p["root"] and el["parent"] != -1:
        return False
    if not ((not p["tag"] or el["tag"] == p["tag"]) and p["classes"] <= el["classes"] and (not p["ids"] or el["id"] in p["ids"])):
        return False
    return all(name in el["attrs"] and (val is None or el["attrs"][name] == val) for name, val in p["attrs"])


def selector_matches(els: list[dict], idx: int, parts: list[dict]) -> bool:
    if not compound_matches(els[idx], parts[-1]):
        return False

    def walk(i: int, k: int) -> bool:  # parts[k] must match an ancestor of els[i] per parts[k+1]['comb']
        if k < 0:
            return True
        comb = parts[k + 1]["comb"]
        a = els[i]["parent"]
        while a >= 0:
            if compound_matches(els[a], parts[k]) and walk(a, k - 1):
                return True
            if comb == ">":
                return False
            a = els[a]["parent"]
        return False

    return walk(idx, len(parts) - 2)


@lru_cache(maxsize=None)
def media_applies(ctx: tuple, pname: str) -> bool | None:
    """True/False for each at-rule context at this profile; None when it cannot be evaluated. Cached: the answer
    depends only on the context and the profile, and the cascade asks it once per candidate rule per element."""
    profile = PROFILES[pname]
    for head in ctx:
        if head.startswith("@supports") or head.startswith("@layer"):
            continue
        if not head.startswith("@media"):
            return None
        q = head[len("@media") :].strip().lower()
        any_ok = False
        for alt in q.split(","):
            alt = alt.strip()
            neg = alt.startswith("not ")
            alt = re.sub(r"^(only|not)\s+", "", alt)
            ok = True
            for f in re.split(r"\s+and\s+", alt):
                f = f.strip()
                if f in ("screen", "all", ""):
                    continue
                if f == "print":
                    ok = False
                    continue
                mm = re.match(r"\(\s*(min|max)-width\s*:\s*([\d.]+)(px|em|rem)\s*\)", f)
                if mm:
                    v = float(mm.group(2)) * (16 if mm.group(3) != "px" else 1)
                    ok &= profile["width"] >= v if mm.group(1) == "min" else profile["width"] <= v
                    continue
                mm = re.match(r"\(\s*width\s*([<>]=?)\s*([\d.]+)px\s*\)", f)
                if mm:
                    v = float(mm.group(2))
                    ok &= {"<": profile["width"] < v, "<=": profile["width"] <= v, ">": profile["width"] > v, ">=": profile["width"] >= v}[mm.group(1)]
                    continue
                mm = re.match(r"\(\s*(hover|any-hover)\s*:\s*(hover|none)\s*\)", f)
                if mm:
                    ok &= (mm.group(2) == "hover") == profile["hover"]
                    continue
                mm = re.match(r"\(\s*(pointer|any-pointer)\s*:\s*(fine|coarse|none)\s*\)", f)
                if mm:
                    ok &= (mm.group(2) == "fine") == profile["hover"] if mm.group(2) != "none" else False
                    continue
                mm = re.match(r"\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)", f)
                if mm:
                    ok &= mm.group(1) == "no-preference"
                    continue
                mm = re.match(r"\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)", f)
                if mm:
                    ok &= mm.group(1) == "light"
                    continue
                if f.startswith("(orientation"):
                    ok &= ("landscape" in f) == (profile["width"] >= 1024)
                    continue
                return None
            any_ok |= (not ok) if neg else ok
        if not any_ok:
            return False
    return True


def cascade(html: str) -> tuple[dict, dict]:
    """{profile: {(path, state, prop): value}} for every element, and counts of rules read and left out."""
    doc = Doc()
    doc.feed(html)
    rules = []
    for s in doc.styles:
        rules.extend(parse_css(s))
    stats = Counter()
    index: dict[str, list] = defaultdict(list)
    for order, r in enumerate(rules):
        decls = declarations(r["body"])
        if not decls:
            continue
        for sel in re.split(r",(?![^()]*\))", r["sel"]):
            parsed = parse_selector(sel)
            if parsed is None:
                stats["unread"] += 1
                continue
            stats["read"] += 1
            parts, state, spec = parsed
            last = parts[-1]
            key = ("." + sorted(last["classes"])[0]) if last["classes"] else ("#" + sorted(last["ids"])[0]) if last["ids"] else (last["tag"] or "*")
            index[key].append((parts, state, spec, order, r["ctx"], decls))
    result = {}
    for pname, prof in PROFILES.items():
        win: dict = {}
        for i, el in enumerate(doc.els):
            cands = list(index.get(el["tag"], [])) + list(index.get("*", []))
            for c in el["classes"]:
                cands.extend(index.get("." + c, []))
            if el["id"]:
                cands.extend(index.get("#" + el["id"], []))
            for parts, state, spec, order, ctx, decls in cands:
                ap = media_applies(ctx, pname)
                if ap is None:
                    stats["unread-media"] += 1
                    continue
                if not ap or not selector_matches(doc.els, i, parts):
                    continue
                for prop, val, imp in decls:
                    k = (el["path"], state, prop)
                    rank = (imp, spec, order)
                    if k not in win or rank >= win[k][0]:
                        win[k] = (rank, val)
        result[pname] = {k: v[1] for k, v in win.items()}
    return result, dict(stats)


def compare_html(before: str, after: str, limit: int = 40) -> list[str]:
    a, sa = cascade(before)
    b, sb = cascade(after)
    diffs = []
    for prof in PROFILES:
        keys = set(a[prof]) | set(b[prof])
        for k in sorted(keys):
            if a[prof].get(k) != b[prof].get(k):
                diffs.append(f"{prof}px {k[0]} {k[1] or ''} {k[2]}: {a[prof].get(k)!r} -> {b[prof].get(k)!r}")
                if len(diffs) >= limit:
                    return diffs
    return diffs


# ─── self-test ──────────────────────────────────────────────────────────────────────────────────────────────────────


def self_test(unplant: bool) -> int:
    fails = []
    # 1. a planted repeated body: the same hover colour printed under three instance classes
    plant = "" if unplant else (
        "@media (hover:hover){.sgs-nav-item-aaaaaaaa .sgs-nav__link:hover{color:var(--x)}}"
        ".sgs-nav-item-bbbbbbbb .sgs-nav__link:hover{color:var(--x)}"
        "@media (hover:hover){.sgs-nav-item-cccccccc .sgs-nav__link:hover{color:var(--x)}}"
        "@media (hover:hover){.sgs-nav-item-dddddddd .sgs-nav__link:hover{color:var(--x)}}"
    )
    css = ".sgs-text-11111111{color:red}" + plant
    rules = [dict(r, emitter="sgs/nav-item render") for r in parse_css(css)]
    s = summarise(rules, len(css))
    top = s["top_bodies"][0] if s["top_bodies"] else None
    if not (top and top["count"] == 3 and top["context"] == "@media (hover:hover)" and top["emitter"] == "sgs/nav-item render"):
        fails.append(f"planted repeat (3 in @media (hover:hover)) not reported as the top repeated body: {top}")
    nav = next((e for e in s["emitters"] if e["emitter"] == "sgs/nav-item render"), None)
    if not (nav and nav["repeat_rules"] == 2):
        fails.append(f"planted repeat: expected 2 repeated rules charged to sgs/nav-item render, got {nav and nav['repeat_rules']}")
    if not any(sh["shape"].endswith(".{uid} .sgs-nav__link:hover {color}") for sh in (nav or {}).get("top_shapes", [])):
        fails.append("planted repeat: the instance classes were not folded into one emit-site shape")

    # 2. a planted override pair: the second element carries its own later rule that beats the shared value
    html_before = (
        "<style>.i1{color:red}.i2{color:red}.o2{color:blue}</style>"
        "<div class='i1'></div><div class='i2 o2'></div>"
    )
    html_good = "<style>.s{color:red}.o2{color:blue}</style><div class='s'></div><div class='s o2'></div>"
    html_flip = "<style>.o2{color:blue}.s{color:red}</style><div class='s'></div><div class='s o2'></div>"
    if unplant:
        html_flip = html_good  # with the plant removed there is no flipped order to catch
    if compare_html(html_before, html_good):
        fails.append(f"override pair kept in order reported as a difference: {compare_html(html_before, html_good)}")
    flip = compare_html(html_before, html_flip)
    if not any("/div[2]" in d and "'blue' -> 'red'" in d for d in flip):
        fails.append(f"override pair with its order flipped was not caught: {flip}")

    if compare_html(html_before, html_good.replace("<div class='s'>", "<script src='x.js'></script><div class='s'>", 1)):
        fails.append("an added <script> (never drawn) reported as a difference")

    # 3. model sanity: media at three widths, child combinator, unread selectors left out on both sides
    h = ("<style>.a>.b{margin:0}@media (min-width:768px){.a .b{margin:4px}}.a + .b{margin:9px}"
         ".b[data-on]{color:red}:root .b{padding:1px}.b[data-on=\"no\"]{border:0}</style>"
         "<div class='a'><p class='b' data-on='yes'></p></div>")
    r2, _ = cascade("<html><body>" + h + "</body></html>")
    r, st = cascade(h)
    if r["375"].get(("/div[1]/p[1]", "", "margin")) != "0" or r["1440"].get(("/div[1]/p[1]", "", "margin")) != "4px":
        fails.append(f"media/combinator model wrong: {r['375']} / {r['1440']}")
    if st.get("unread") != 1:
        fails.append(f"sibling selector should be counted unread once: {st}")
    if r2["375"].get(("/html[1]/body[1]/div[1]/p[1]", "", "color")) != "red" or r2["375"].get(("/html[1]/body[1]/div[1]/p[1]", "", "padding")) != "1px":
        fails.append(f"attribute presence or :root not read: {r['375']}")
    if ("/html[1]/body[1]/div[1]/p[1]", "", "border") in r2["375"]:
        fails.append("attribute value mismatch matched")

    for f in fails:
        print("FAIL", f)
    print("self-test:", "FAIL" if fails else "PASS", f"({3 - len(fails) if len(fails) < 3 else 0} groups clean)" if fails else "")
    return 1 if fails else 0


# ─── CLI ────────────────────────────────────────────────────────────────────────────────────────────────────────────


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--install")
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--record", action="store_true", help="with --check: write the current survey as the baseline")
    ap.add_argument("--compare", nargs=2, metavar=("BEFORE", "AFTER"))
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--unplant", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--snapshot", type=Path, help="with --survey: save each page's HTML here (for --compare)")
    ap.add_argument("--pages", help="comma-separated client folders or <client>/<page> labels (default: all)")
    ap.add_argument("--mirror", help="<client folder>=<mirror>[,...]: render that client's pages on another mirror (a scratch copy) this run")
    args = ap.parse_args()
    if args.mirror:
        if args.record:
            # A baseline is a client's committed figure; a scratch copy's render must never replace it.
            raise SystemExit("--record cannot be used with --mirror: a baseline is recorded from the client's own mirror only")
        MIRROR_OVERRIDE.update(parse_mirror_override(args.mirror))

    if args.self_test:
        return self_test(args.unplant)
    if args.install:
        install(args.install.split(","))
        return 0
    if args.compare:
        before, after = Path(args.compare[0]), Path(args.compare[1])
        bad = 0
        for f in sorted(before.glob("*.html")):
            g = after / f.name
            if not g.exists():
                print(f"{f.stem}: missing after")
                bad += 1
                continue
            d = compare_html(f.read_text(encoding="utf-8"), g.read_text(encoding="utf-8"))
            print(f"{f.stem}: {'same' if not d else f'{len(d)}+ differences'}")
            for x in d:
                print("   ", x)
            bad += bool(d)
        return 1 if bad else 0
    if args.survey or args.fix or args.check:
        report = survey(args.snapshot, args.pages)
        if args.check:
            if args.record:
                for f in sorted({v["site_file"] for v in report.values()}):
                    d = json.loads(Path(f).read_text(encoding="utf-8"))
                    for k, v in report.items():
                        if v["site_file"] == f:
                            d.setdefault("baseline", {})[k.split("/", 1)[1]] = {kk: v[kk] for kk in ("bytes", "rules", "distinct_bodies", "has_rules")}
                    Path(f).write_text(json.dumps(d, indent=1) + "\n", encoding="utf-8", newline="\n")
                    print(f"recorded {f}")
                return 0
            bad = 0
            for k, v in report.items():
                b = json.loads(Path(v["site_file"]).read_text(encoding="utf-8")).get("baseline", {}).get(k.split("/", 1)[1])
                if not b:
                    continue
                over = v["bytes"] > b["bytes"] or v["rules"] > b["rules"] or v["has_rules"] > b.get("has_rules", v["has_rules"])
                bad += over
                print(f"{k}: {v['bytes']:,} bytes (baseline {b['bytes']:,}), {v['rules']:,} rules (baseline {b['rules']:,}), "
                      f"{v['has_rules']} :has() rules (baseline {b.get('has_rules', '-')}) {'OVER' if over else 'ok'}")
            return 1 if bad else 0
        if args.fix:
            wl = worklist(report)
            if args.json:
                print(json.dumps(wl, indent=1))
            else:
                for w in wl[:25]:
                    print(f"{w['bytes']:>9,} bytes {w['repeat_bytes']:>9,} repeated  {w['emitter']}  [{', '.join(w['pages'])}]")
                    for s, b in w["shapes"]:
                        print(f"            {b:>8,}  {s[:130]}")
            return 0
        if args.json:
            print(json.dumps(report, indent=1))
        else:
            print_survey(report)
        return 0
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
