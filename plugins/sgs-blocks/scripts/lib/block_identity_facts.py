#!/usr/bin/env python3
"""block_identity_facts -- each SGS block's identification facts, read from code, as `block_identity_facts` rows (Spec 48
F1, plan `.claude/plans/2026-10-30-clone-recognition-fixes.md` "F1: identify blocks by elimination", step A1).

One row per (block, fact, value): `state` yes / no / unknown, `source` 'code', `evidence` the unit and literal that
proves it, or for a `no` every source that was searched. The facts (the A0 vocabulary; meanings in `.claude/dev-setup.md`
"block_identity_facts"):

- renders-tag / renders-role / renders-aria: read by `identity_markup.py` from every source the block's output comes
  from. The values are the HTML and SVG elements, the WAI-ARIA 1.2 roles and the WAI-ARIA 1.2 states and properties
  (`identity_scan.py`), so a value no block prints is a definite `no`.
- open-state (exactly-one, none-or-one, any, none): a tab pattern (role=tab with a one-of-many `aria-selected` write) is
  exactly-one; a disclosure set (`<details>` or `aria-expanded`) is none-or-one when its script closes the others and
  any when a boolean setting the render hands to the script (`data-allow-multiple`) lifts that; a block with neither is
  none. What no reader settles stays unknown.
- self-moving (timer, controls, scroll, none): the view scripts (the block's and every block it renders) moving a track
  (`scrollTo`, `scrollBy`, `scrollLeft =`, a transform or an offset custom property) from `setInterval` (timer), from a
  click or key handler (controls) or from a page scroll listener (scroll); and every motion effect the block qualifies
  for whose `fx_effects.requires` is a track (its triggers: scroll is scroll, load or visible is timer, an Inertia drag
  is controls). none is yes only when all three are no.
- platform: the brands of `includes/data/brand-registry.json` that carry a colour, and one per `sgs/<brand>-reviews`
  block whose brand the registry lacks (`scripts/computed-route/lib/brand-registry.mjs::paletteBrands`). A block belongs
  to a brand when one of the brand's names (`brandNames`) is a word of its block name.
- context (header, footer, drawer, form, commerce:<role>, any): a block with no block.json `parent` / `ancestor` may sit
  anywhere; a restricted block may sit only where its allowed parents may, plus the context a parent names itself (the
  last word of `site-header`, `site-footer`, `nav-drawer`, `form`). The commerce roles are the keys of
  `skeleton-decisions.json` `rules.commerceRegion.roles`, whose `block` / `owner` is that role's piece.
- accepts-kind (`<attr or array.field>=icon:<kind>`, and `*=icon:<kind>` for the block as a whole): the icon kinds are the
  `icon-<kind>` roles; a field whose role is `icon-<kind>` holds that kind; an `icon` / `icon-slug` field holds the kinds
  of the block's `enum-mode` source setting (icon-list `defaultIconSource`), and is unknown for the rest.

Live rows (`source` 'live', step A2b): the renders-tag / renders-role / renders-aria values the code read leaves unknown and
the live read saw on a mirror page, from `scripts/computed-route/data/block-live-facts.json` (`live_rows`; only `yes`, and
only where the code row is `unknown`). `seed()` replaces both sources on every run.

    python plugins/sgs-blocks/scripts/lib/block_identity_facts.py --report [--db P]  # derive, print counts, write nothing
    python plugins/sgs-blocks/scripts/lib/block_identity_facts.py --check [--db P]   # drift gate: re-derive, compare
    python plugins/sgs-blocks/scripts/lib/block_identity_facts.py --self-test        # planted fixtures
The DB is opened read-only here; the only writer is `sgs-update-v2.py` stage 14, which calls `seed()`.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import identity_scan as S  # noqa: E402
from identity_markup import MARKUP, DbInputs, Extractor, Paths, load_db_inputs  # noqa: E402

DEFAULT_DB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")
FACTS = ("renders-tag", "renders-role", "renders-aria", "open-state", "self-moving", "platform", "context", "accepts-kind")
OPEN_STATES = ("exactly-one", "none-or-one", "any", "none")
MOVES = ("timer", "controls", "scroll", "none")
CONTEXT_WORDS = ("header", "footer", "drawer", "form")

_TRACK = re.compile(r"(?<!window)(?<!documentElement)\.(?:scrollTo|scrollBy)\s*\(|\.scrollLeft\s*[+\-]?=(?!=)|\.style\.transform\s*=|"
                    r"setProperty\(\s*'--[\w-]*(?:offset|translate|slide|index|track|shift)")
_HANDLER = re.compile(r"addEventListener\(\s*'(?:click|keydown|pointerdown|pointerup)'")
_PAGE_SCROLL = re.compile(r"(?:window|document)\.addEventListener\(\s*'scroll'")
_ONE_OF_MANY = re.compile(r"setAttribute\(\s*'aria-selected'\s*,\s*[^,;)]*\?\s*'true'\s*:\s*'false'")
_CLOSE_OTHERS = re.compile(r"\.open\s*=\s*false|\.name\s*=(?!=)|removeAttribute\(\s*'open'\s*\)")


def _kebab(name: str) -> str:
    return re.sub(r"(?<!^)([A-Z])", r"-\1", name).lower()


class Rows:
    def __init__(self, x: Extractor, db: DbInputs):
        self.x, self.db = x, db
        self.rows: list[tuple] = []

    def add(self, slug, fact, value, state, evidence):
        self.rows.append((slug, fact, value, state, "code", evidence[:600]))

    # -- markup --------------------------------------------------------------------------------------------------------
    def markup(self, slug: str, universe: dict) -> None:
        m = self.x.markup(slug)
        searched = "searched: " + "; ".join(m.sources)
        for fact in MARKUP:
            for value in universe[fact]:
                if value in m.yes[fact]:
                    self.add(slug, fact, value, "yes", m.yes[fact][value])
                elif value in m.possible[fact]:
                    self.add(slug, fact, value, "unknown", "printed by a source that may apply: " + m.possible[fact][value])
                elif m.unknown_all[fact]:
                    self.add(slug, fact, value, "unknown", m.unknown_all[fact][0] + (f" (+{len(m.unknown_all[fact]) - 1} more)" if len(m.unknown_all[fact]) > 1 else ""))
                elif value in m.unknown_vals[fact]:
                    self.add(slug, fact, value, "unknown", m.unknown_vals[fact][value])
                else:
                    self.add(slug, fact, value, "no", searched)

    def _state_of(self, slug: str, fact: str, value: str) -> str:
        m = self.x.markup(slug)
        if value in m.yes[fact]:
            return "yes"
        if value in m.possible[fact] or m.unknown_all[fact] or value in m.unknown_vals[fact]:
            return "unknown"
        return "no"

    # -- open-state ----------------------------------------------------------------------------------------------------
    def open_state(self, slug: str) -> None:
        m, bj = self.x.markup(slug), self.x.block_json[slug]
        js = m.js_code
        tab = "tab" in m.yes["renders-role"] and "aria-selected" in m.yes["renders-aria"]
        disclosure = {"details", "summary"} & set(m.yes["renders-tag"]) or "aria-expanded" in m.yes["renders-aria"]
        out: dict = {}
        if tab:
            sel = _ONE_OF_MANY.search(js)
            ev = f"role=tab ({m.yes['renders-role']['tab'][:160]}) with aria-selected"
            if sel:
                out = {"exactly-one": ("yes", f"{ev}; the view script selects one tab and deselects the rest: \"{sel.group(0)}\""),
                       "none-or-one": ("no", "the one-of-many aria-selected write leaves exactly one tab selected"),
                       "any": ("no", "the one-of-many aria-selected write leaves exactly one tab selected"),
                       "none": ("no", ev)}
            else:
                out = {"exactly-one": ("yes", ev), "none": ("no", ev)}
        elif disclosure:
            what = "<details>" if {"details", "summary"} & set(m.yes["renders-tag"]) else "aria-expanded"
            out["none"] = ("no", f"a disclosure ({what}) is printed: " + (m.yes["renders-tag"].get("details") or m.yes["renders-aria"].get("aria-expanded", ""))[:200])
            close = _CLOSE_OTHERS.search(js)
            toggle = None
            for attr, spec in (bj.get("attributes") or {}).items():
                if not isinstance(spec, dict) or spec.get("type") != "boolean":
                    continue
                data = "data-" + _kebab(attr)
                if any(data in lit for lit in m.render_lits) and (f"dataset.{attr}" in js or f"'{data}'" in js):
                    toggle = attr
                    break
            if close and toggle:
                ev = f"the view script closes the other panels (\"{close.group(0)}\") unless the boolean setting {toggle} (render {('data-' + _kebab(toggle))}) is on"
                out["none-or-one"] = ("yes", ev)
                out["any"] = ("yes", ev)
            elif close:
                out["none-or-one"] = ("yes", f"the view script closes the other panels: \"{close.group(0)}\"")
            else:
                out["any"] = ("yes", f"a disclosure ({what}) with no script that closes the others")
        else:
            states = [self._state_of(slug, "renders-tag", "details"), self._state_of(slug, "renders-tag", "summary"),
                      self._state_of(slug, "renders-aria", "aria-expanded"), self._state_of(slug, "renders-role", "tab")]
            if all(s == "no" for s in states):
                ev = "prints no <details>, <summary>, aria-expanded or role=tab (renders-tag / renders-aria / renders-role are no)"
                out = {"none": ("yes", ev), "exactly-one": ("no", ev), "none-or-one": ("no", ev), "any": ("no", ev)}
        for value in OPEN_STATES:
            state, ev = out.get(value, ("unknown", "no reader settles it: the disclosure and selection facts above leave it open"))
            self.add(slug, "open-state", value, state, ev)

    # -- self-moving ---------------------------------------------------------------------------------------------------
    def self_moving(self, slug: str) -> None:
        m = self.x.markup(slug)
        js = m.js_code
        track = _TRACK.search(js)
        got: dict = {}
        if track and re.search(r"setInterval\s*\(", js):
            got["timer"] = f"the view script moves a track (\"{track.group(0)}\") from setInterval"
        if track and _HANDLER.search(js):
            got["controls"] = f"the view script moves a track (\"{track.group(0)}\") from \"{_HANDLER.search(js).group(0)}\""
        if track and _PAGE_SCROLL.search(js):
            got["scroll"] = f"the view script moves a track (\"{track.group(0)}\") from a page scroll listener"
        for effect in self.x.qualifying.get(slug, []):
            fx = self.db.fx.get(effect) or {}
            if fx.get("requires") not in ("track", "marquee-track"):
                continue
            kind = "controls" if "Inertia" in fx.get("plugin_set", []) else "scroll" if fx.get("triggers") == ["scroll"] else "timer"
            got.setdefault(kind, f"qualifies for the motion effect {effect} (fx_effects.requires={fx['requires']}, triggers={','.join(fx.get('triggers', []))})")
        outside = sorted(set(m.js_outside))
        for value in MOVES[:3]:
            if value in got:
                self.add(slug, "self-moving", value, "yes", got[value])
            elif outside:
                self.add(slug, "self-moving", value, "unknown", "the view script imports code outside the repo: " + ", ".join(outside))
            else:
                self.add(slug, "self-moving", value, "no", "no view script moves a track from a timer, a handler or the page scroll, and no qualifying motion effect needs a track (fx_effects.requires)")
        if got:
            self.add(slug, "self-moving", "none", "no", "moves: " + ", ".join(sorted(got)))
        elif outside:
            self.add(slug, "self-moving", "none", "unknown", "the view script imports code outside the repo: " + ", ".join(outside))
        else:
            self.add(slug, "self-moving", "none", "yes", "timer, controls and scroll are all no")

    # -- platform ------------------------------------------------------------------------------------------------------
    def platforms(self) -> list[dict]:
        reg = (json.loads(self.x.p.brands.read_text(encoding="utf-8")).get("brands") or []) if self.x.p.brands.is_file() else []
        known = {n for b in reg for n in _brand_names(b)}
        review = sorted(s for s in self.x.block_json if re.fullmatch(r"sgs/[a-z0-9]+-reviews", s))
        extra = []
        for slug in review:
            n = re.fullmatch(r"sgs/([a-z0-9]+)-reviews", slug).group(1)
            if n not in known:
                extra.append({"slug": n, "label": n.capitalize(), "colour": "", "reviewBlock": slug})
        return [b for b in reg + extra if b.get("colour") or b.get("reviewBlock")]

    def platform(self, slug: str, brands: list) -> None:
        words = slug.split("/", 1)[1].split("-")
        for b in brands:
            names = _brand_names(b)
            hit = next((w for w in words if w in names), None)
            if b.get("reviewBlock") == slug or hit:
                self.add(slug, "platform", b["slug"], "yes", f"block name {slug} carries the brand name '{hit or b['slug']}' (brand-registry.json / paletteBrands)")
            else:
                self.add(slug, "platform", b["slug"], "no", f"block name {slug} carries none of {b['slug']}'s names ({', '.join(sorted(names))})")

    # -- context -------------------------------------------------------------------------------------------------------
    def context(self, slug: str, roles: dict, values: list) -> None:
        allowed = self._contexts(slug, set())
        piece = {r for r, spec in roles.items() if slug in (spec.get("block"), spec.get("owner"))}
        bj = self.x.block_json[slug]
        parents = (bj.get("parent") or []) + (bj.get("ancestor") or [])
        for value in values:
            if value in allowed:
                if value.startswith("commerce:") and value[9:] in piece:
                    ev = f"the commerce role {value[9:]}'s piece (skeleton-decisions.json rules.commerceRegion.roles.{value[9:]})"
                else:
                    ev = f"may sit there: {'no parent restriction (block.json parent/ancestor unset)' if not parents else 'inside ' + ', '.join(parents)}"
                self.add(slug, "context", value, "yes", ev)
            else:
                self.add(slug, "context", value, "no", f"block.json restricts it to {', '.join(parents)}, none of which may sit in {value}")

    def _contexts(self, slug: str, seen: set) -> set:
        values = set(CONTEXT_WORDS) | {f"commerce:{r}" for r in self._roles} | {"any"}
        bj = self.x.block_json.get(slug)
        if bj is None:
            return values  # a core or WooCommerce parent: may sit anywhere
        parents = (bj.get("parent") or []) + (bj.get("ancestor") or [])
        if not parents:
            return values
        out = set()
        for p in parents:
            if p in seen:
                continue
            word = p.split("/", 1)[1].split("-")[-1]
            if word in CONTEXT_WORDS and p in self.x.block_json:
                out.add(word)
            out |= self._contexts(p, seen | {slug}) - {"any"}
        return out

    # -- accepts-kind --------------------------------------------------------------------------------------------------
    def accepts(self, slug: str) -> None:
        kinds = self.db.icon_kinds
        fields = self.db.icon_fields.get(slug, [])
        enums = [(a, v) for a, v in self.db.source_enums.get(slug, []) if set(v) & set(kinds)]
        summary = {k: ("no", f"no setting or item field of {slug} holds an icon role (block_attributes / array_item_schema)") for k in kinds}
        for label, role in fields:
            for k in kinds:
                if role == f"icon-{k}":
                    st, ev = "yes", f"{label} has the role {role}"
                elif role.startswith("icon-") and role != "icon-slug":
                    st, ev = "no", f"{label} has the role {role}: it holds one kind"
                elif enums:
                    src = ", ".join(f"{a} {v}" for a, v in enums)
                    st, ev = ("yes", f"{label} ({role}) takes its kind from {src}") if any(k in v for _, v in enums) else ("unknown", f"{label} ({role}): {k} is not in {src}; another path is not traced")
                else:
                    st, ev = "unknown", f"{label} ({role}) has no enum-mode source setting that names its kinds"
                self.add(slug, "accepts-kind", f"{label}=icon:{k}", st, ev)
                cur = summary[k][0]
                if st == "yes" or (st == "unknown" and cur == "no"):
                    summary[k] = (st, f"{label}=icon:{k}: {ev}")
        for k in kinds:
            self.add(slug, "accepts-kind", f"*=icon:{k}", *summary[k])

    # -- all -----------------------------------------------------------------------------------------------------------
    def build(self) -> list[tuple]:
        slugs = sorted(self.x.block_json)
        universe = {
            "renders-tag": sorted(S.HTML_ELEMENTS | {v for s in slugs for v in self.x.markup(s).yes["renders-tag"]}
                                  | {v for s in slugs for v in self.x.markup(s).possible["renders-tag"]}),
            "renders-role": sorted(S.ARIA_ROLES),
            "renders-aria": sorted(S.ARIA_ATTRS),
        }
        decisions = json.loads(self.x.p.decisions.read_text(encoding="utf-8")) if self.x.p.decisions.is_file() else {}
        roles = ((decisions.get("rules") or {}).get("commerceRegion") or {}).get("roles") or {}
        self._roles = sorted(roles)
        ctx_values = list(CONTEXT_WORDS) + [f"commerce:{r}" for r in self._roles] + ["any"]
        brands = self.platforms()
        for slug in slugs:
            self.markup(slug, universe)
            self.open_state(slug)
            self.self_moving(slug)
            self.platform(slug, brands)
            self.context(slug, roles, ctx_values)
            self.accepts(slug)
        return self.rows


def _brand_names(b: dict) -> set:
    """`brand-registry.mjs::brandNames`: the slug and Site Info name (three letters or more), the label's words and the
    registry's aliases."""
    m = re.fullmatch(r"socials\.([a-z0-9-]+)", b.get("siteInfoKey") or "", re.I)
    own = [x for x in [b.get("slug"), *(sorted({b.get("slug"), m.group(1)}) if m else [])] if x and len(x) >= 3]
    label = [w for w in re.split(r"[^a-z0-9]+", str(b.get("label") or "").lower()) if len(w) >= 3]
    return {str(x).lower() for x in own + label + list(b.get("aliases") or [])}


def _derive(conn: sqlite3.Connection, paths: Paths | None = None) -> tuple[list[tuple], Extractor]:
    db = load_db_inputs(conn)
    x = Extractor(paths, db)
    return Rows(x, db).build(), x


def derive_rows(conn: sqlite3.Connection, paths: Paths | None = None) -> list[tuple]:
    return _derive(conn, paths)[0]


def open_ro(db: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True, timeout=10)


# The causes a live read settles (plan A2b), matched on the code read's unknown reasons.
LIVE_CAUSES = (
    ("woocommerce", re.compile(r"WooCommerce|nested woocommerce/")),
    ("core-image", re.compile(r"wp_get_attachment_image|get_the_post_thumbnail")),
    ("wrapper-aria-label", re.compile(r"get_block_wrapper_attributes")),
    ("gsap-modules", re.compile(r"gsap|vendor code", re.I)),
)


def unknown_causes(x: Extractor, slug: str, fact: str, value: str) -> list[str]:
    """The A2b causes behind a code `unknown` for (slug, fact, value); `other` when none of them is."""
    m = x.markup(slug)
    reasons = list(m.unknown_all[fact]) + [d[value] for d in (m.unknown_vals[fact], m.possible[fact]) if value in d]
    found = [name for name, rx in LIVE_CAUSES if any(rx.search(r) for r in reasons)]
    return found or ["other"]


def live_rows(code_rows: list[tuple], path: Path) -> tuple[list[tuple], dict]:
    """The source='live' rows of `scripts/computed-route/data/block-live-facts.json` (written by
    `scripts/computed-route/tools/block-live-facts.mjs`): a value seen live becomes a `yes` row only where the code row
    for the same block, fact and value is `unknown`. A live `yes` beside a code `no` is a conflict for gate A, counted and
    never imported; beside a code `yes` it adds nothing. `read_conflict` lists the file's own `conflicts` (a code `no` the
    read saw, recorded by the reader against the DB it read). No file: no live rows."""
    stats = {"file": path.is_file(), "imported": 0, "conflict": [], "read_conflict": [], "already_yes": 0, "no_code_row": 0}
    if not path.is_file():
        return [], stats
    data = json.loads(path.read_text(encoding="utf-8"))
    stats["read_conflict"] = [f"{slug} {k}" for slug, c in sorted((data.get("conflicts") or {}).items()) for k in sorted(c)]
    code = {r[:3]: r[3] for r in code_rows}
    out = []
    for slug, entry in sorted((data.get("blocks") or {}).items()):
        for fact, values in sorted((entry.get("facts") or {}).items()):
            for value, v in sorted(values.items()):
                if v.get("state") != "yes":
                    continue
                state = code.get((slug, fact, value))
                if state == "unknown":
                    ev = "seen live (block-live-facts.json, read " + str(data.get("readOn", "")) + "): " + "; ".join(v.get("evidence") or [])
                    out.append((slug, fact, value, "yes", "live", ev[:600]))
                elif state == "no":
                    stats["conflict"].append(f"{slug} {fact}={value}")
                elif state == "yes":
                    stats["already_yes"] += 1
                else:
                    stats["no_code_row"] += 1
    stats["imported"] = len(out)
    return out, stats


def seed(conn: sqlite3.Connection, dry_run: bool = False, paths: Paths | None = None) -> dict:
    """Replace every row with a fresh derivation (the seeder's stage 14): the source='code' rows from the code read, the
    source='live' rows from the live read's file (`live_rows`)."""
    rows, x = _derive(conn, paths)
    live, stats = live_rows(rows, x.p.live)
    counts = Counter((r[1], r[3]) for r in rows)
    unknown_by_cause, settled_by_cause = Counter(), Counter()
    for r in rows:
        if r[3] == "unknown" and r[1] in MARKUP:
            for c in unknown_causes(x, r[0], r[1], r[2]):
                unknown_by_cause[c] += 1
    for r in live:
        for c in unknown_causes(x, r[0], r[1], r[2]):
            settled_by_cause[c] += 1
    if not dry_run:
        conn.execute("DELETE FROM block_identity_facts WHERE source IN ('code', 'live')")
        conn.executemany("INSERT INTO block_identity_facts (block_slug, fact, value, state, source, evidence) VALUES (?,?,?,?,?,?)", rows + live)
        conn.commit()
    return {"rows": len(rows), "blocks": len({r[0] for r in rows}), "by_fact_state": {f"{f}:{s}": n for (f, s), n in sorted(counts.items())},
            "live": {**stats, "blocks": len({r[0] for r in live}),
                     "settled_by_cause": {c: f"{settled_by_cause[c]} of {unknown_by_cause[c]}" for c in [n for n, _ in LIVE_CAUSES] + ["other"]}}}


def report(rows: list[tuple]) -> str:
    out = [f"blocks {len({r[0] for r in rows})}, rows {len(rows)}"]
    by = Counter((r[1], r[3]) for r in rows)
    for f in FACTS:
        out.append(f"  {f:14} " + "  ".join(f"{s} {by.get((f, s), 0)}" for s in ("yes", "no", "unknown")))
    missing = [(s, f) for s in sorted({r[0] for r in rows}) for f in FACTS if not any(r[0] == s and r[1] == f for r in rows)]
    out.append(f"  blocks missing a fact: {len(missing)} {missing[:5]}")
    why = Counter()
    for r in rows:
        if r[3] == "unknown" and r[1] in MARKUP:
            why[re.sub(r" at .*| \(\+\d+ more\)|: .*", "", r[5])[:90]] += 1
    out.append("  unknown markup rows by first reason:")
    out += [f"    {n:6} {k}" for k, n in why.most_common(12)]
    return "\n".join(out)


def check(db: Path) -> int:
    if not db.is_file():
        print(f"[block-identity-facts] FAIL: no DB at {db}")
        return 1
    conn = open_ro(db)
    try:
        if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='block_identity_facts'").fetchone():
            print("[block-identity-facts] FAIL: the table block_identity_facts is absent; apply migration "
                  "2026-10-30-block-identity-facts-table.py and reseed (sgs-update-v2.py --stage 14)")
            return 1
        stored = {r[:4]: r[4] for r in conn.execute("SELECT block_slug, fact, value, state, evidence FROM block_identity_facts WHERE source = 'code'")}
        stored_live = {r[:4] for r in conn.execute("SELECT block_slug, fact, value, state FROM block_identity_facts WHERE source = 'live'")}
        rows, x = _derive(conn)
        fresh = {r[:4]: r[5] for r in rows}
        fresh_live = {r[:4] for r in live_rows(rows, x.p.live)[0]}
    finally:
        conn.close()
    gone, new = sorted(set(stored) - set(fresh)), sorted(set(fresh) - set(stored))
    moved = sum(1 for k in set(stored) & set(fresh) if stored[k] != fresh[k])
    live_gone, live_new = sorted(stored_live - fresh_live), sorted(fresh_live - stored_live)
    if not gone and not new and not live_gone and not live_new:
        print(f"[block-identity-facts] OK: {len(fresh)} rows match the code and {len(fresh_live)} live rows match block-live-facts.json ({moved} evidence citations moved, not a drift)")
        return 0
    if not gone and not new:
        print(f"[block-identity-facts] DRIFT: the live rows differ from scripts/computed-route/data/block-live-facts.json ({len(live_new)} to add, {len(live_gone)} to remove). Reseed: python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 14")
        for k in live_new[:15]:
            print("  + live " + " | ".join(k))
        for k in live_gone[:15]:
            print("  - live " + " | ".join(k))
        return 1
    print(f"[block-identity-facts] DRIFT: {len(new)} rows the code now gives are not in the DB, {len(gone)} DB rows the code no longer gives. Reseed: python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 14")
    for k in new[:15]:
        print("  + " + " | ".join(k))
    for k in gone[:15]:
        print("  - " + " | ".join(k))
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB, help="framework DB, opened read-only (default: the shared DB or $SGS_FRAMEWORK_DB)")
    ap.add_argument("--check", action="store_true", help="re-derive from code and compare with the DB; exit 1 on drift")
    ap.add_argument("--report", action="store_true", help="derive and print counts; write nothing")
    ap.add_argument("--block", action="append", default=[], help="with --report: print this block's rows")
    ap.add_argument("--self-test", action="store_true", help="planted fixtures; exit 1 on a wrong fact")
    args = ap.parse_args()
    if args.self_test:
        from identity_facts_selftest import run  # noqa: PLC0415
        return run()
    if args.check:
        return check(args.db)
    if args.report:
        conn = open_ro(args.db)
        try:
            rows = derive_rows(conn)
        finally:
            conn.close()
        print(report(rows))
        for slug in args.block:
            for r in rows:
                if r[0] == slug and (r[3] != "no" or r[1] not in MARKUP):
                    print(f"  {r[1]:13} {r[2]:22} {r[3]:8} {r[5][:200]}")
        return 0
    ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
