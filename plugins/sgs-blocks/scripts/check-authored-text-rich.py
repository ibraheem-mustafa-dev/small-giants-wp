#!/usr/bin/env python3
"""check-authored-text-rich.py: every text setting whose words the author types is rich text (Bean 2026-10-30).

The settings are read from `scripts/computed-route/data/plain-text-review.json`, never from names: the groups
`sentences`, `interface strings`, `clickable labels` and `form controls` are in scope (genuine sentences, interface
strings, clickable labels, form labels). Child-block text, data-bound text, computed or live text, format templates,
values (`mis-tagged values`) and editor-only settings are not. A setting is rich when all four hold:

  1. its editor control is `<SgsFreeTextField type="rich" value={ ...<attr>... } />` (or a `<RichText value={ <attr> }>`
     already editing it on the canvas) in a file of its block;
  2. `scripts/data/rich-text-format-roles.json` `fields` lists it for that file with a format list (the clone reads the
     formats there, scripts/computed-route/lib/inline-text.mjs);
  3. the PHP file that reads it (the reader in plain-text-review.json) prints it through `sgs_rich_text_kses()` and
     any attribute or JS string through `sgs_authored_text_plain()`;
  4. nothing else keeps it plain: a setting with role `glyph` (a symbol copied exactly) is not in scope, and a setting
     left plain on purpose is named, with its reason, in `scripts/data/authored-text-rich.json` `exceptions`.

  --survey [--json]   every in-scope setting, its state and (for a plain one) the control the swap would change
  --fix [--apply] [--only=<slug>:<attr>,...]
                      the mechanical part: the raw TextControl / TextareaControl bound to the setting becomes
                      `SgsFreeTextField type="rich"` (with `noLink` where the text prints inside a link or button) and
                      the setting joins the roles file. Without --apply it prints what it would change. The PHP print
                      sites are read and changed by hand: no tool can tell an HTML context from an attribute.
  --php [--apply]     the print sites: for each plain setting, the variables its reader assigns from it and every use.
                      AUTO ones (only esc_html / esc_attr / emptiness tests) are rewritten with --apply (esc_html ->
                      sgs_rich_text_kses, esc_attr -> esc_attr( sgs_authored_text_plain() )); MANUAL ones are listed
  --check             exit 1 while any in-scope setting is plain, or an exception names no in-scope setting
  --self-test         the rules against built-in fixtures (no repository file is read or written)
"""
import json
import re
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent
REPO = PLUGIN.parent.parent
REVIEW = REPO / "scripts/computed-route/data/plain-text-review.json"
ROLES = PLUGIN / "scripts/data/rich-text-format-roles.json"
DATA = PLUGIN / "scripts/data/authored-text-rich.json"
IN_SCOPE = ["sentences", "interface strings", "clickable labels", "form controls"]
CLICKABLE = "clickable labels"
RICH_LISTS = {"RICH_TEXT_BODY", "RICH_TEXT_BODY_NO_LINK", "RICH_TEXT_EMPHASIS", "RICH_TEXT_LINK_ONLY", "RICH_TEXT_FREE_TEXT", "RICH_TEXT_FREE_TEXT_NO_LINK"}
RAW = ("TextControl", "TextareaControl")
MOUNTS = RAW + ("SgsFreeTextField", "RichText")


def read(path):
    return Path(path).read_text(encoding="utf-8")


ONLY = set()


def settings(review, data):
    """[(group, block, attr, reader)] for every in-scope setting (--only=<slug>:<attr>,... limits --fix and --php)."""
    out = []
    for group in IN_SCOPE:
        for row in review["groups"].get(group, []):
            if ONLY and row["block"].split("/")[1] + ":" + row["attr"] not in ONLY:
                continue
            out.append((group, row["block"], row["attr"], row["reader"]))
    return out


def opening_tags(source):
    """Every `<Name ...>` opening of a mount component: (name, start, end, text). Braces, quotes and `=>` are balanced."""
    found = []
    for m in re.finditer(r"<(" + "|".join(MOUNTS) + r")(?=[\s/>])", source):
        i, depth, quote = m.end(), 0, None
        while i < len(source):
            c = source[i]
            if quote:
                if c == "\\":
                    i += 1
                elif c == quote:
                    quote = None
            elif c in "\"'`":
                quote = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif c == ">" and depth == 0 and source[i - 1] != "=":
                break
            i += 1
        found.append((m.group(1), m.start(), i + 1, source[m.start():i + 1]))
    return found


def value_expr(tag_text):
    m = re.search(r"\bvalue=\{", tag_text)
    if not m:
        return None
    i, depth = m.end(), 1
    while i < len(tag_text) and depth:
        depth += {"{": 1, "}": -1}.get(tag_text[i], 0)
        i += 1
    return tag_text[m.end():i - 1]


def binds(tag_text, attr):
    expr = value_expr(tag_text)
    if not expr:
        return False
    # The setting itself: a bare name or `attributes.<name>`; `option.label` is another record's field.
    return re.search(r"(?:(?<![\w$.])|(?<=attributes\.))" + re.escape(attr) + r"(?![\w$])", expr) is not None


def block_files(slug, suffix=".js"):
    base = PLUGIN / "src/blocks" / slug
    return sorted(p for p in base.rglob("*" + suffix) if "test" not in p.name and p.name != "save.js")


def mounts_for(slug, attr):
    """Every mount bound to the setting: [(file, name, start, end, text)]."""
    hits = []
    for f in block_files(slug):
        src = read(f)
        if "Control" not in src and "RichText" not in src and "SgsFreeTextField" not in src:
            continue
        for name, s, e, text in opening_tags(src):
            if binds(text, attr):
                hits.append((f, name, s, e, text))
    return hits


def is_rich_mount(name, text):
    return (name == "SgsFreeTextField" and re.search(r"""\btype=["']rich["']""", text) is not None) or name == "RichText"


def roles_has(roles, slug, attr):
    prefix = f"src/blocks/{slug}/"
    for file, fields in roles.get("fields", {}).items():
        if file.startswith(prefix) and fields.get(attr) in RICH_LISTS:
            return file
    return None


def print_ok(reader, block_slug=None, extra=()):
    path = reader.split("::")[0].strip()
    f = PLUGIN / path
    if not path.endswith(".php") or not f.exists():
        return False
    files = [f]
    m = re.match(r"src/blocks/([^/]+)/", path)
    if m:
        files += sorted((PLUGIN / "src/blocks" / m.group(1)).glob("*.php"))
    slug = m.group(1) if m else block_slug
    if slug and not m:
        files += sorted((PLUGIN / "src/blocks" / slug).glob("*.php"))
    if slug:
        files += sorted((PLUGIN / "includes").glob(slug + "*.php")) + sorted((PLUGIN / "includes" / slug).glob("**/*.php") if (PLUGIN / "includes" / slug).is_dir() else [])
    files += [PLUGIN / e for e in extra if (PLUGIN / e).exists()]
    printers = ("sgs_rich_text_kses(", "sgs_authored_text_plain(", "sgs_label_roll_markup(")  # the last prints its label through sgs_rich_text_kses
    return any(any(fn in read(x) for fn in printers) for x in files)


def state_of(group, block, attr, reader, roles, exceptions, print_paths=None, control_files=None):
    slug = block.split("/")[1]
    if f"{block}:{attr}" in exceptions:
        return {"state": "exception", "why": exceptions[f"{block}:{attr}"]}
    mounts = mounts_for(slug, attr)
    for rel in (control_files or {}).get(f"{block}:{attr}", []):
        f = PLUGIN / rel
        mounts += [(f, name, st, en, text) for name, st, en, text in opening_tags(read(f)) if is_rich_mount(name, text)]
    rich = [m for m in mounts if is_rich_mount(m[1], m[4])]
    raw = [m for m in mounts if m[1] in RAW]
    problems = []
    if not rich:
        problems.append("control is plain" if raw else "no control found")
    if not roles_has(roles, slug, attr):
        problems.append("not in rich-text-format-roles.json")
    if not print_ok(reader, slug, (print_paths or {}).get(f"{block}:{attr}", ())):
        problems.append("reader does not print through sgs_rich_text_kses / sgs_authored_text_plain")
    return {"state": "rich" if not problems else "plain", "problems": problems, "raw": [(str(m[0].relative_to(PLUGIN)), m[1]) for m in raw]}


def load():
    review = json.loads(read(REVIEW))
    roles = json.loads(read(ROLES))
    data = json.loads(read(DATA))
    return review, roles, data


def dump_roles(d):
    """The roles file in its own layout: one line per file entry, unless it is longer than 150 characters."""
    out = ["{"]
    keys = list(d)
    for ki, k in enumerate(keys):
        v, comma = d[k], "," if ki < len(keys) - 1 else ""
        if k in ("fields", "render") and isinstance(v, dict) and v:
            out.append(f"  {json.dumps(k)}: {{")
            items = list(v.items())
            for i, (f, m) in enumerate(items):
                c = "," if i < len(items) - 1 else ""
                one = f"    {json.dumps(f)}: " + json.dumps(m, ensure_ascii=False).replace('{"', '{ "').replace("}", " }")
                if len(one) <= 150:
                    out.append(one + c)
                    continue
                out.append(f"    {json.dumps(f)}: {{")
                mi = list(m.items())
                for j, (a, b) in enumerate(mi):
                    out.append(f"      {json.dumps(a)}: {json.dumps(b, ensure_ascii=False)}" + ("," if j < len(mi) - 1 else ""))
                out.append("    }" + c)
            out.append("  }" + comma)
        else:
            body = json.dumps(v, indent=2, ensure_ascii=False).replace(chr(10), chr(10) + "  ")
            out.append(f"  {json.dumps(k)}: " + body + comma)
    out.append("}")
    return chr(10).join(out) + chr(10)


def survey():
    review, roles, data = load()
    exceptions = data.get("unconvertible", {})
    rows = []
    for group, block, attr, reader in settings(review, data):
        rows.append((group, block, attr, state_of(group, block, attr, reader, roles, exceptions, data.get("printPaths"), data.get("controlFiles"))))
    return rows, exceptions


def reason_ok(reason):
    """A proof: it says the setting cannot hold markup and cites a source file of the plugin that exists."""
    if not str(reason).startswith("cannot hold markup:"):
        return False
    cited = re.findall(r"((?:src|includes)/[\w./-]+\.(?:php|js))", str(reason))
    return bool(cited) and all((PLUGIN / c).exists() for c in cited)


def check_exceptions(rows, exceptions):
    names = {f"{b}:{a}" for _, b, a, _ in rows}
    bad = [f"unconvertible {k} names no in-scope setting" for k in exceptions if k not in names]
    bad += [f"unconvertible {k}: the reason must start 'cannot hold markup:' and cite existing code (src/ or includes/ path)" for k, v in exceptions.items() if not reason_ok(v)]
    return bad


def cmd_survey(as_json):
    rows, exceptions = survey()
    counts = {}
    for group, _, _, st in rows:
        counts.setdefault(group, {}).setdefault(st["state"], 0)
        counts[group][st["state"]] += 1
    if as_json:
        print(json.dumps([{"group": g, "block": b, "attr": a, **s} for g, b, a, s in rows], indent=1))
        return 0
    for group, c in counts.items():
        print(f"{group}: {c}")
    for group, b, a, s in rows:
        if s["state"] != "rich":
            print(f"  {s['state']:9} {b} {a}: {s.get('why') or '; '.join(s['problems'])} {s.get('raw') or ''}")
    return 0


def cmd_check():
    rows, exceptions = survey()
    bad = [f"{b} {a} ({g}): {'; '.join(s['problems'])}" for g, b, a, s in rows if s["state"] == "plain"]
    bad += check_exceptions(rows, exceptions)
    for line in bad:
        print("FAIL", line)
    total = len(rows)
    rich = sum(1 for r in rows if r[3]["state"] == "rich")
    exc = sum(1 for r in rows if r[3]["state"] == "exception")
    print(f"check-authored-text-rich: {total} in-scope settings, {rich} rich, {exc} named exceptions, {len(bad)} failing")
    return 1 if bad else 0


def swap_tag(text, name, no_link):
    """The mount text with its raw control turned into `SgsFreeTextField type="rich"`."""
    out = text.replace("<" + name, "<SgsFreeTextField", 1)
    out = re.sub(r"\s*__nextHasNoMarginBottom(?:=\{[^}]*\})?(?=[\s/>])", "", out)
    out = re.sub(r"\s*__next40pxDefaultSize(?:=\{[^}]*\})?(?=[\s/>])", "", out)
    out = re.sub(r"\s*\brows=\{[^}]*\}", "", out) if name == "TextareaControl" else out
    extra = ' type="rich"' + (" multiline" if name == "TextareaControl" else "") + (" noLink" if no_link else "")
    return out.replace("<SgsFreeTextField", "<SgsFreeTextField" + extra, 1)


def unused_import(src, name):
    """The source without `name` in its `@wordpress/components` import (the import line goes when it was the only name)."""
    m = re.search(r"import\s*\{([^}]*)\}\s*from\s*'@wordpress/components';\n?", src)
    if not m or name not in m.group(1):
        return src
    names = [n.strip() for n in m.group(1).split(",") if n.strip() and n.strip() != name]
    if not names:
        return src[:m.start()] + src[m.end():]
    tail = chr(10) if m.group(0).endswith(chr(10)) else ""
    return src[:m.start()] + "import { " + ", ".join(names) + " } from '@wordpress/components';" + tail + src[m.end():]


def import_line(file):
    rel = Path(*[".."] * (len(file.relative_to(PLUGIN / "src").parts) - 1)) / "components" / "SgsFreeTextField"
    return f"import SgsFreeTextField from '{rel.as_posix()}';"


def cmd_fix(apply):
    review, roles, data = load()
    exceptions = data.get("unconvertible", {})
    allowed_links = set(data.get("linksAllowed", []))
    edits = {}
    new_roles = []
    for group, block, attr, reader in settings(review, data):
        slug = block.split("/")[1]
        st = state_of(group, block, attr, reader, roles, exceptions, data.get("printPaths"), data.get("controlFiles"))
        if st["state"] != "plain" or "control is plain" not in st["problems"]:
            continue
        raw = [m for m in mounts_for(slug, attr) if m[1] in RAW]
        if len(raw) != 1:
            print(f"SKIP {block} {attr}: {len(raw)} raw controls bound to it (read by hand)")
            continue
        f, name, s, e, text = raw[0]
        no_link = ((group == CLICKABLE or group == "form controls") and f"{block}:{attr}" not in allowed_links) or f"{block}:{attr}" in data.get("noLink", [])
        edits.setdefault(f, []).append((s, e, swap_tag(text, name, no_link)))
        new_roles.append((f, attr, "RICH_TEXT_FREE_TEXT_NO_LINK" if no_link else "RICH_TEXT_FREE_TEXT"))
    for f, items in edits.items():
        src = read(f)
        for s, e, text in sorted(items, reverse=True):
            src = src[:s] + text + src[e:]
        if not re.search(r"^import[^;]*SgsFreeTextField[^;]*;", src, re.M):
            imports = list(re.finditer(r"^import[\s\S]*?;\s*$", src, re.M))
            at = imports[-1].end() if imports else 0
            src = src[:at] + "\n" + import_line(f) + src[at:]
        for name in RAW:
            if not re.search(r"(?<![\w])" + name + r"(?![\w])", re.sub(r"import[^;]*;", "", src)):
                src = unused_import(src, name)
        print(("WRITE " if apply else "WOULD ") + str(f.relative_to(PLUGIN)), len(items), "control(s)")
        if apply:
            f.write_text(src, encoding="utf-8", newline="")
    if apply and new_roles:
        roles_obj = json.loads(read(ROLES))
        for f, attr, const in new_roles:
            roles_obj["fields"].setdefault(f.relative_to(PLUGIN).as_posix(), {})[attr] = const
        ROLES.write_text(dump_roles(roles_obj), encoding="utf-8", newline="")
    return 0


SAFE_TEST = re.compile(r"""^(?:!\s*)?(?:empty|isset)\s*\(\s*\$V\s*\)|^''\s*[!=]==?\s*(?:trim\(\s*)?\$V|\$V\s*[!=]==?\s*''|^\$V\s*(?:\?\?|\?:)""")
ASSIGN_CLEAN = re.compile(r"""^\s*(?:\(string\)\s*)?(?:trim\(\s*)?(?:\(string\)\s*)?""")


def php_uses(src, attr):
    """[(var, [(kind, start, end, text)], assignments)] for each variable assigned from the attribute in a PHP file."""
    out = []
    pat = re.compile(r"\$(\w+)\s*=\s*([^;]*?\[\s*['\"]" + re.escape(attr) + r"['\"]\s*\][^;]*);")
    for m in pat.finditer(src):
        var, rhs = m.group(1), m.group(2)
        if any(var == o[0] for o in out):
            continue
        clean = re.search(r"sanitize_|esc_|wp_kses|strip_tags|wp_strip|strtoupper|mb_strtoupper|ucfirst|__\(", rhs) is None
        uses = []
        for u in re.finditer(r"(?<![\w$])\$" + var + r"(?!\s*\[|->|\()", src):
            if u.start() >= m.start() and u.end() <= m.end():
                continue
            ctx = src[max(0, u.start() - 12):u.start()]
            tail = src[u.end():u.end() + 3]
            if re.search(r"esc_html\(\s*$", ctx) and re.match(r"\s*\)", tail):
                uses.append(("html", u.start(), u.end()))
            elif re.search(r"esc_attr\(\s*$", ctx) and re.match(r"\s*\)", tail):
                uses.append(("attr", u.start(), u.end()))
            elif SAFE_TEST.match(src[u.start():u.end() + 20].replace("$" + var, "$V", 1)) or re.search(r"""(?:''\s*[!=]==?\s*(?:trim\(\s*)?|!\s*empty\(\s*|isset\(\s*|!\s*)$""", ctx):
                uses.append(("test", u.start(), u.end()))
            else:
                line = src.count(chr(10), 0, u.start()) + 1
                uses.append(("other", u.start(), u.end(), line, src.splitlines()[line - 1].strip()[:110]))
        out.append((var, uses, clean, m))
    return out


def cmd_php(apply):
    review, roles, data = load()
    exceptions = data.get("unconvertible", {})
    allowed_links = set(data.get("linksAllowed", []))
    for group, block, attr, reader in settings(review, data):
        if f"{block}:{attr}" in exceptions:
            continue
        path = reader.split("::")[0].strip()
        f = PLUGIN / path
        if not path.endswith(".php") or not f.exists() or print_ok(reader):
            continue
        src = read(f)
        found = php_uses(src, attr)
        if not found:
            print(f"MANUAL {block} {attr}: no variable assigned from the attribute in {path}")
            continue
        no_link = (group == CLICKABLE or group == "form controls") and f"{block}:{attr}" not in allowed_links
        edits, notes = [], []
        for var, uses, clean, m in found:
            others = [u for u in uses if u[0] == "other"]
            if not clean:
                notes.append(f"${var} assignment sanitises")
            for u in others:
                notes.append(f"${var} l{u[3]}: {u[4]}")
            for kind, s, e, *_ in uses:
                if kind == "html":
                    edits.append((s - len("esc_html( ") if src[s - 10:s] == "esc_html( " else s, e, f"sgs_rich_text_kses( ${var}{', false' if no_link else ''}", "html"))
        if notes or not edits and not any(u[0] == "attr" for _, us, _, _ in found for u in us):
            print(f"MANUAL {block} {attr} [{path}]: " + " | ".join(notes or ["no print use found"]))
            continue
        print(f"AUTO   {block} {attr} [{path}]: {sum(len(u) for _, u, _, _ in found)} use(s)")
        if apply:
            new = src
            spans = []
            for var, uses, clean, m in found:
                for kind, s, e, *_ in uses:
                    if kind == "html":
                        a = src.rfind("esc_html(", 0, s)
                        b = src.find(")", e)
                        spans.append((a, b + 1, f"sgs_rich_text_kses( ${var}{', false' if no_link else ''} )"))
                    elif kind == "attr":
                        a = src.rfind("esc_attr(", 0, s)
                        b = src.find(")", e)
                        spans.append((a, b + 1, f"esc_attr( sgs_authored_text_plain( ${var} ) )"))
            for a, b, t in sorted(set(spans), reverse=True):
                new = new[:a] + t + new[b:]
            f.write_text(new, encoding="utf-8", newline="")
            src = new
    return 0


def self_test():
    fails = []

    def expect(ok, label):
        print(("ok   " if ok else "FAIL ") + label)
        if not ok:
            fails.append(label)

    raw = '<TextControl label={ __( "Label" ) } value={ attributes.label } onChange={ ( v ) => setAttributes( { label: v } ) } __nextHasNoMarginBottom __next40pxDefaultSize />'
    tags = opening_tags("x " + raw + " y")
    expect(len(tags) == 1 and tags[0][0] == "TextControl", "an opening tag with an arrow function and braces is found whole")
    expect(binds(tags[0][3], "label"), "value={ attributes.label } binds the label setting")
    expect(not binds(tags[0][3], "labelPosition"), "a longer name does not bind (labelPosition is not label)")
    expect(not binds(tags[0][3], "bel"), "a fragment does not bind")
    swapped = swap_tag(tags[0][3], "TextControl", True)
    expect('type="rich"' in swapped and "noLink" in swapped and "__next" not in swapped and swapped.startswith("<SgsFreeTextField"), "the swap makes a rich no-link field and drops the wrapper-owned props")
    area = swap_tag('<TextareaControl label="x" value={ intro } rows={ 3 } onChange={ f } />', "TextareaControl", False)
    expect("multiline" in area and "rows" not in area and "noLink" not in area, "a textarea becomes a multiline rich field")
    expect(is_rich_mount("SgsFreeTextField", swapped) and not is_rich_mount("TextControl", raw) and not is_rich_mount("SgsFreeTextField", '<SgsFreeTextField label="a" />'), "only type=rich counts as a rich mount")
    expect(roles_has({"fields": {"src/blocks/a/edit.js": {"label": "RICH_TEXT_FREE_TEXT"}}}, "a", "label") == "src/blocks/a/edit.js", "a roles entry with a format list counts")
    expect(roles_has({"fields": {"src/blocks/a/edit.js": {"label": "RICH_TEXT_PLAIN"}}}, "a", "label") is None, "RICH_TEXT_PLAIN (no formats) does not count")
    bad = check_exceptions([("g", "sgs/a", "x", {})], {"sgs/a:x": "pending", "sgs/b:y": "cannot hold markup: src/blocks/form/render.php"})
    expect(bad == ["unconvertible sgs/b:y names no in-scope setting", "unconvertible sgs/a:x: the reason must start 'cannot hold markup:' and cite existing code (src/ or includes/ path)"], "an entry naming no in-scope setting, or giving a reason with no cited code, fails")
    expect(reason_ok("cannot hold markup: src/blocks/choice-flow/render.php writes it as aria-label") and not reason_ok("not converted yet") and not reason_ok("cannot hold markup: src/blocks/nope/none.php"), "a proof cites code that exists")
    sample = json.loads(read(ROLES))
    expect(dump_roles(sample) == read(ROLES), "dump_roles reproduces the roles file byte for byte (a write changes only its entries)")
    print("self-test:", "FAILED" if fails else "passed")
    return 1 if fails else 0


def main(argv):
    for a in argv:
        if a.startswith("--only="):
            ONLY.update(a[7:].split(","))
    if "--self-test" in argv:
        return self_test()
    if "--survey" in argv:
        return cmd_survey("--json" in argv)
    if "--php" in argv:
        return cmd_php("--apply" in argv)
    if "--fix" in argv:
        return cmd_fix("--apply" in argv)
    if "--check" in argv:
        return cmd_check()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
