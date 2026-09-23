#!/usr/bin/env python3
"""extract.py — the Spec 33 draft global-styles extractor (CLI orchestrator).

Reads a draft mockup, MEASURES computed values on the rendered page (measure.js), parses the
DECLARED CSS for names/roles (token_map/roles), reconciles them (COMPUTED VALUE WINS — the iron
law), and emits a complete, valid ``theme-snapshot.json`` (theme.json v3) + a provenance
``theme-extract-trace.json``. Proves on Mama's; kills the D303 base-inheritance drift.

Usage:
  python extract.py --client mamas-munches --draft <index.html> [--facts <computed-facts.json>]
                    [--out <snapshot.json>] [--repo-root <path>]

If ``--facts`` is omitted, measure.js is run live (needs Playwright). Passing a cached facts file
makes the run deterministic + browser-free (used by the golden/determinism tests).
"""
from __future__ import annotations

import argparse
import copy
import json
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

# Exact hostnames this module is allowed to fetch from — Google Fonts' CSS endpoint and its
# font-file CDN. A DRAFT MOCKUP is external input (client-supplied, or scraped from a live site
# per this project's own uimax-sgs-scrape-pattern tooling), so any URL derived from it (its own
# <link> tags, or a src: url(...) inside the CSS that link returns) is a security boundary, not a
# trusted value. Host validation MUST be exact-match on the parsed hostname — a substring check
# (e.g. "fonts.googleapis.com" in url) is bypassable by a crafted URL that merely CONTAINS the
# substring (as a subdomain suffix, a path segment, or a query value) while pointing anywhere else,
# including an internal/metadata address. Never widen this to a substring or regex "contains" check.
_ALLOWED_FONT_CSS_HOSTS = {"fonts.googleapis.com"}
_ALLOWED_FONT_FILE_HOSTS = {"fonts.gstatic.com"}


def _is_allowed_https_url(url: str, allowed_hosts: set[str]) -> bool:
    """True only for an https:// URL whose exact hostname is in ``allowed_hosts`` — never a
    substring/contains check (see the module-level comment above)."""
    try:
        parsed = urllib.parse.urlparse(url)
    except ValueError:
        return False
    return parsed.scheme == "https" and parsed.hostname in allowed_hosts

import declared_sources
import derive as derive_mod
import font_weights
import heading_weight
import palette as palette_mod
import presets as presets_mod
import palette_refs
import site_palette
import usage_census
import used_fonts
import used_layout
import variant_sets as variant_sets_mod
import typography as typo_mod
from schema_validate import validate_theme_json
from token_map import build_draft_root_token_map, parse_base_rules

HERE = pathlib.Path(__file__).resolve().parent

# scripts/ (HERE.parent) holds shared_utils — the SINGLE source of the CSS-extraction
# + hashing the FR-33-12 freshness gate depends on (both this extractor and the
# orchestrator call it, so the two hashes can never drift). See shared_utils.py.
if str(HERE.parent) not in sys.path:
    sys.path.insert(0, str(HERE.parent))
from shared_utils import (  # noqa: E402
    css_sha256, draft_source_sha256, extract_css, is_part_draft, read_readme_text,
)

# Version of THIS extractor's emit logic — stamped into the snapshot's `_sgsExtractor`
# provenance block. Bump when palette/typography/preset extraction changes materially
# (independent of shared_utils' hash-helper version, which rarely moves).
EXTRACTOR_VERSION = "1.0"


def _repo_root(arg: str | None) -> pathlib.Path:
    if arg:
        return pathlib.Path(arg).resolve()
    # scripts/theme-extractor → repo root is 4 up
    return HERE.parents[3]


def run_measure(draft: pathlib.Path) -> dict:
    # Explicit UTF-8: node writes UTF-8, and text=True alone decodes with the console code page
    # (cp1252 on Windows), which kills the reader thread and leaves stdout as None.
    out = subprocess.run(
        ["node", str(HERE / "measure.js"), "--draft", str(draft)],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120,
    )
    if out.returncode != 0:
        raise RuntimeError(f"measure.js failed (exit {out.returncode}): {(out.stderr or '')[:500]}")
    if not out.stdout or not out.stdout.strip():
        raise RuntimeError(f"measure.js produced no output: {(out.stderr or '')[:500]}")
    return json.loads(out.stdout)


# Google Fonts serves woff/ttf to the DEFAULT urllib User-Agent and only serves woff2 (the format
# every self-hosted framework font uses) to a modern-browser UA — proven live 2026-09-10 (a
# Python-urllib UA on the same URL that returns woff2 for a Chrome UA silently returns a different
# format). Every fetch in this module MUST send this header, same class of gotcha as Hostinger's
# WAF UA-sniff documented in push-theme-snapshot.py.
_FONT_FETCH_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


def _bundled_faces_by_family(baseline: dict) -> dict:
    """LOWERCASED font-family name -> its self-hosted fontFace entry, read straight off the
    framework's OWN theme.json — the single source of "already bundled", so this can never drift
    against a hand-maintained list or the real assets/fonts/ folder contents (R-31-1 no hardcoded
    dicts, applied to fonts)."""
    out: dict = {}
    for fam in (baseline.get("settings", {}).get("typography", {}).get("fontFamilies") or []):
        for face in (fam.get("fontFace") or []):
            name = (face.get("fontFamily") or "").strip().strip("'\"")
            if name:
                out[name.lower()] = face
    return out


def _primary_family_name(stack: str) -> str:
    """First entry of a CSS font-family stack, quotes stripped. 'Fraunces, serif' -> 'Fraunces'."""
    return (stack or "").split(",")[0].strip().strip("'\"")


def _fetch_bytes(url: str) -> bytes:
    """The ONE network read in this module (CSS and .woff2 alike) — tests replace it."""
    req = urllib.request.Request(url, headers={"User-Agent": _FONT_FETCH_UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def _face_weight(block: str) -> str:
    m_weight = re.search(r"font-weight:\s*([^;]+);", block)
    return m_weight.group(1).strip() if m_weight else "400"


def _declares_weight_range(css_text: str, family: str) -> bool:
    return any(font_weights.parse_range(_face_weight(body))
               for _subset, body in font_weights.face_blocks(css_text, family))


def _variable_axis_css(family: str, links: list) -> tuple[str, str] | None:
    """``(css_text, url)`` from the first variable-axis request Google accepts, or None when the
    family is STATIC. A refusal (HTTP 400) only means THAT extent lies outside the family's axis, so
    the extents in ``font_weights.axis_probe_ranges`` are tried in turn (full axis, the draft link's
    ``<min>..<max>``, ``400..900``, ``300..700``); only when every one is refused is it static. A
    network failure (not an HTTP refusal) stops the probing. Only URLs built by
    ``font_weights.variable_axis_url`` are fetched — host-allowlisted by construction; the draft
    link contributes numbers only, never a URL."""
    for axis in font_weights.axis_probe_ranges(links, family):
        url = font_weights.variable_axis_url(family, axis)
        try:
            text = _fetch_bytes(url).decode("utf-8")
        except urllib.error.HTTPError:
            continue
        except (urllib.error.URLError, TimeoutError):
            return None
        if font_weights.face_blocks(text, family):
            return text, url
    return None


def _self_host_google_font(family: str, links: list, repo: pathlib.Path, trace: list,
                           facts: dict | None = None) -> list | None:
    """Fetch + self-host a font family the framework does NOT already bundle — the SAME code path
    for every font, whether it happens to be one the framework ships (Inter/DM Sans/DM Serif
    Display, resolved via ``_bundled_faces_by_family`` instead) or one a client draft introduces
    first (e.g. Fraunces for Mama's Munches). No special-casing "fonts we happened to bundle"
    (R-31-9). Root cause fixed here: previously only bundled fonts got a working fontFace at all —
    a fresh font's NAME was written with nothing loading it, so the browser silently fell back to
    its default serif/sans-serif stack.

    Reuses the EXACT Google Fonts CSS2 URL the draft itself declared (its ``<link>`` href), when one
    names this family, so the fetched weight/axis range matches what the draft actually renders
    rather than a guessed default. Falls back to a generic 300-900 weight request otherwise.

    A VARIABLE font must declare a weight RANGE or the browser synthesises bold above the declared
    weight. When that response is not already a range, the variable axis is requested
    (``family=<Name>:wght@100..900``, then narrower extents while Google refuses with HTTP 400,
    because a family whose axis is 400..900 refuses 100..900): a range answer is used as is; a
    variable family that still yields one weight takes its range from the draft's link, then the
    measured weights (``font_weights.choose_weight``); a family refusing EVERY extent is STATIC and
    keeps its single weight. The weight is decided on every run, whether or not the file exists.

    Returns a WP theme.json ``fontFace`` array pointing at a newly-saved local .woff2, or ``None``
    if nothing could be fetched — callers MUST treat ``None`` as "could not self-host" and leave the
    family with no fontFace, which the FR-33-14 gate below then fails the run closed on, rather than
    silently shipping a name with nothing to load it.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", family.lower()).strip("-")
    css_url = next(
        (u for u in links if _is_allowed_https_url(u, _ALLOWED_FONT_CSS_HOSTS)
         and font_weights.link_names_family(u, family)),
        None,
    )
    if not css_url:
        css_url = (
            f"https://fonts.googleapis.com/css2?family={family.replace(' ', '+')}"
            ":wght@300;400;500;600;700;800;900&display=swap"
        )
    elif not _is_allowed_https_url(css_url, _ALLOWED_FONT_CSS_HOSTS):
        # Belt-and-braces — the generator expression above already filters on this, but a future
        # edit to that expression must not silently reopen the SSRF hole this guards against.
        trace.append({"kind": "gap", "what": f"font-face:{family}",
                      "reason": "draft-declared font-css link failed host validation — refusing "
                                "to fetch a URL outside the Google Fonts allowlist",
                      "attempted_url": css_url})
        return None

    try:
        css_text = _fetch_bytes(css_url).decode("utf-8")
    except (urllib.error.URLError, TimeoutError) as exc:
        trace.append({"kind": "gap", "what": f"font-face:{family}",
                      "reason": f"could not fetch Google Fonts CSS to self-host this family ({exc}) "
                                "— declared with NO fontFace; the FR-33-14 gate will fail this run "
                                "closed rather than ship a silent fallback",
                      "attempted_url": css_url})
        return None

    variable = _declares_weight_range(css_text, family)
    if not variable:
        axis = _variable_axis_css(family, links)
        if axis:
            css_text, css_url = axis
            variable = True

    dest_dir = repo / "theme" / "sgs-theme" / "assets" / "fonts" / slug
    dest_file = dest_dir / f"{slug}-variable-latin.woff2"

    faces: list = []
    weight_source = "google-css"
    # face_blocks keeps only this family's blocks (a multi-family CSS2 response carries others) and,
    # when Google lists a `latin` subset, only that one — it lists cyrillic / latin-ext FIRST, and
    # self-hosting the first block saved the latin-ext file under the "-latin" name.
    for _subset, block in font_weights.face_blocks(css_text, family):
        m_family = re.search(r"font-family:\s*['\"]?([^;'\"]+)['\"]?\s*;", block)
        m_style = re.search(r"font-style:\s*([^;]+);", block)
        m_src = re.search(r"src:\s*url\(([^)]+)\)", block)
        if not m_src:
            continue

        if not dest_file.exists():
            src_url = m_src.group(1).strip("'\"")
            if not _is_allowed_https_url(src_url, _ALLOWED_FONT_FILE_HOSTS):
                # The CSS response's src: url(...) is itself untrusted — validate its host before
                # fetching, same reasoning as the CSS URL above (see module-level comment).
                trace.append({"kind": "gap", "what": f"font-face:{family}",
                              "reason": "font-face CSS parsed but its src: url() failed host "
                                        "validation — refusing to fetch a URL outside the Google "
                                        "Fonts CDN allowlist",
                              "attempted_url": src_url})
                continue
            try:
                font_bytes = _fetch_bytes(src_url)
            except (urllib.error.URLError, TimeoutError) as exc:
                trace.append({"kind": "gap", "what": f"font-face:{family}",
                              "reason": f"font-face CSS parsed but the .woff2 download failed "
                                        f"({exc})"})
                continue
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_file.write_bytes(font_bytes)

        weight, weight_source = font_weights.choose_weight(
            _face_weight(block), variable, links, facts, family)
        faces.append({
            "fontFamily": m_family.group(1).strip(),
            "fontWeight": weight,
            "fontStyle": (m_style.group(1).strip() if m_style else "normal"),
            "fontDisplay": "swap",
            "src": [f"file:./assets/fonts/{slug}/{dest_file.name}"],
        })
        break  # theme.json fontFace carries no unicode-range slot — one self-hosted latin face
               # per family matches every other bundled font in the framework (D-precedent:
               # inter-variable-latin.woff2, dm-sans-v15-latin-regular.woff2, etc.)

    if not faces:
        trace.append({"kind": "gap", "what": f"font-face:{family}",
                      "reason": "Google Fonts CSS returned no usable @font-face block for this "
                                "family — declared with NO matching fontFace",
                      "attempted_url": css_url})
        return None

    entry = {"kind": "font-loading", "what": f"font-face:{family}",
             "reason": "self-hosted a font not already bundled in the framework",
             "saved_to": faces[0]["src"][0], "source_css_url": css_url}
    if weight_source != "google-css":
        entry["weight_source"] = weight_source  # absent when Google's own range was used
    trace.append(entry)
    return faces


def _resolve_family_face(name: str, bundled: dict, links: list, repo: pathlib.Path, trace: list,
                         facts: dict) -> list | None:
    """A fontFace array for this family — from the framework's own bundled library when the
    family is already self-hosted there, else fetched + self-hosted fresh. Same code path for
    every font (R-31-9): no branch for "fonts we happened to bundle" vs "fonts a client draft
    introduces". Shared by the role slots and the rendered families (FR-33-18)."""
    if not name:
        return None
    bundled_face = bundled.get(name.lower())
    if bundled_face:
        return [dict(bundled_face)]
    return _self_host_google_font(name, links, repo, trace, facts)


def _overlay_font_families(baseline: dict, facts: dict, links: list, trace: list,
                            repo: pathlib.Path) -> None:
    fams = baseline.setdefault("settings", {}).setdefault("typography", {}).setdefault("fontFamilies", [])
    by_slug = {f.get("slug"): f for f in fams}
    body_stack = typo_mod.representative_paragraph(facts)
    body_fam = (body_stack or facts.get("body", {})).get("fontFamily") or "sans-serif"
    head_fam = facts.get("headings", {}).get("h1", {}).get("fontFamily") \
        or facts.get("headings", {}).get("h2", {}).get("fontFamily") or body_fam

    bundled = _bundled_faces_by_family(baseline)

    def _resolve_face(family_stack: str) -> list | None:
        return _resolve_family_face(_primary_family_name(family_stack), bundled, links, repo, trace, facts)

    if "body" in by_slug:
        by_slug["body"]["fontFamily"] = body_fam
        by_slug["body"]["_source"] = "declared"
        face = _resolve_face(body_fam)
        if face:
            by_slug["body"]["fontFace"] = face
        else:
            by_slug["body"].pop("fontFace", None)
    for slug in ("heading", "display"):
        if slug in by_slug:
            by_slug[slug]["fontFamily"] = head_fam
            by_slug[slug]["name"] = f"{slug.title()} ({head_fam.split(',')[0].strip()})"
            by_slug[slug]["_source"] = "declared"
            face = _resolve_face(head_fam)
            if face:
                by_slug[slug]["fontFace"] = face
            else:
                by_slug[slug].pop("fontFace", None)


def _declared_design(draft_dir, html: str, pass_a_found: bool) -> tuple[dict, dict] | None:
    """The draft's declared design system (README token table, script variant sets) when Pass A found
    no palette and there is something to read; None keeps today's behaviour exactly."""
    if draft_dir is None or pass_a_found:
        return None
    declared = declared_sources.read_readme_tokens(draft_dir)
    variant_sets = variant_sets_mod.read_script_variant_sets(html)
    has_colours = declared["found"] and any(r.get("hexes") for r in declared.get("colours", []))
    return (declared, variant_sets) if has_colours or variant_sets else None


def build_snapshot(client: str, css: str, facts: dict, html: str, baseline: dict, trace: list,
                    repo: pathlib.Path, draft_dir: pathlib.Path | None = None,
                    draft_name: str | None = None) -> dict:
    root_tokens = build_draft_root_token_map(css)
    base_rules = parse_base_rules(css)

    snap = copy.deepcopy(baseline)
    settings = snap.setdefault("settings", {})
    styles = snap.setdefault("styles", {})

    # PALETTE — Pass A (declared :root, FR-33-1/2/9); Pass B advisory fallback when the draft declares
    # no tokens (FR-33-5). Nothing usable → keep the deep-copied framework baseline palette UNCHANGED.
    pal = palette_mod.build_palette(root_tokens, base_rules, facts, trace)
    design = _declared_design(draft_dir, html, bool(pal))
    if not pal:
        # Pass B runs FIRST whenever Pass A found nothing, even when a README declares colours: it
        # supplies what the declared path does not (the page surface and text the README rows could
        # not prove), advisory, and the declared design is laid on top so declared entries win by slug.
        derived = derive_mod.derive_palette(base_rules, trace)  # Pass B (advisory) or []
        if derived:
            pal = derive_mod.overlay_on_baseline(
                ((settings.get("color", {}) or {}).get("palette", [])) or [], derived, trace)
    if pal:
        settings.setdefault("color", {})["palette"] = pal
    if design:
        # Declared outside <style> (README tokens / script variant sets): overlay, validated by usage.
        declared, variant_sets = design
        site_palette.apply_declared_design(snap, declared, variant_sets, usage_census.census_colours(html),
                                           facts, trace)
        pal = snap["settings"]["color"]["palette"]
    elif not pal:
        pal = ((settings.get("color", {}) or {}).get("palette", [])) or []  # baseline (from deepcopy)
        trace.append({"kind": "derive-skip", "reason": "Pass A + Pass B recovered nothing usable → "
                      "framework baseline palette kept UNCHANGED (never a guessed theme)"})
    slug_by_hex = palette_refs.slug_by_hex(pal) if design else {
        e["color"].lower(): e["slug"] for e in pal
        if isinstance(e.get("color"), str) and e["color"].startswith("#")}

    # BASE TYPOGRAPHY (FR-33-3 — the drift-killer)
    styles["typography"] = typo_mod.base_typography(facts, trace)
    # ...then route the measured size through a NON-FLUID preset, or WP's fluid engine
    # recomputes it behind our back (FR-33-4). See register_base_font_size_preset().
    typo_mod.register_base_font_size_preset(settings, styles["typography"], trace)

    # styles.color: computed content-background + body text → slugs (FR-33-6)
    body = facts.get("body", {})
    bg_hex = _hex(_theme_background(facts, trace))
    txt_hex = _hex(body.get("color", ""))
    styles["color"] = {
        "background": _var_or_hex(bg_hex, slug_by_hex, "color"),
        "text": _var_or_hex(txt_hex, slug_by_hex, "color"),
    }

    # HEADING base (regenerated from computed — no fabricated 1.15). MERGE onto the framework
    # baseline's existing elements.heading dict — never overwrite wholesale. The baseline (deepcopy'd
    # at the top of this function) already carries properties this extractor does not measure
    # (heading.color.text, heading.typography.fontWeight); replacing the dict instead of merging into
    # it silently drops them from every heading on the live site — the same destructive-overwrite
    # class as the D319 palette lesson, just one level down the tree.
    hbase = typo_mod.heading_base(facts, trace)
    elements = styles.setdefault("elements", {})
    heading_typ = elements.setdefault("heading", {}).setdefault("typography", {})
    heading_typ["lineHeight"] = hbase["lineHeight"]
    heading_typ["fontFamily"] = "var:preset|font-family|heading"
    if "letterSpacing" in hbase:
        heading_typ["letterSpacing"] = hbase["letterSpacing"]
    # Per-level h1..h6 overrides. A tag with NO non-chrome measurement is a BLIND SPOT, not a
    # measurement of absence — the framework baseline for that tag SURVIVES UNTOUCHED. This is the
    # same principle as the buttonPresets merge below: the extractor may only overwrite what it has
    # actually measured. Deleting the baseline instead would STRIP that heading level from the live
    # site, because push-theme-snapshot replaces theme.json wholesale — proven against the live
    # palestine-lives theme.json, which carries h5 (medium/700) + h6 (small/700/uppercase/0.08em)
    # that the Indus draft never renders and therefore cannot speak for.
    #
    # Chrome exclusion still holds, and is the POINT: Mama's renders h5 ONLY in its footer at 11px,
    # and that chrome value must never drive the global h5 scale. Skipping the override achieves that
    # WITHOUT deleting the baseline — the two are independent, and conflating them was the bug.
    #
    # For a MEASURED tag, merge rather than replace: fontSize/fontFamily/lineHeight are derived (they
    # win), while properties the extractor never derives (h6's fontWeight/letterSpacing/textTransform)
    # are blind spots that must survive.
    hsizes = typo_mod.heading_sizes(facts, trace)
    skipped = []
    for tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        h = facts.get("headings", {}).get(tag)
        if not h or h.get("inChrome"):
            skipped.append(tag)
            continue
        tag_typ = elements.setdefault(tag, {}).setdefault("typography", {})
        tag_typ["fontFamily"] = "var:preset|font-family|heading"
        tag_typ["lineHeight"] = hbase["lineHeight"]
        if tag in hsizes:
            tag_typ["fontSize"] = hsizes[tag]
    if design:  # declared-design path only: a draft that lands elsewhere keeps its snapshot byte-identical
        heading_weight.apply_heading_weights(elements, facts, baseline, trace)
    if skipped:
        trace.append({"kind": "base", "what": "styles.elements.h1..h6",
                      "reason": "no non-chrome measurement for these levels — framework baseline "
                                "PRESERVED untouched (blind spot, not measured-absent; deleting it "
                                "would strip the level from the live site)",
                      "baseline_preserved": ",".join(skipped)})

    # FONT FAMILIES + font loading (FR-33-14 — every declared family must resolve to a working
    # self-hosted @font-face, whether already bundled in the framework or introduced fresh by
    # this draft)
    links = presets_mod.font_links(html)
    _overlay_font_families(snap, facts, links, trace, repo)
    # FR-33-18 — every family the draft loads AND renders gets its own entry beside the role slots.
    bundled = _bundled_faces_by_family(baseline)
    used_fonts.add_rendered_families(
        snap, facts, links, css, trace,
        lambda name: _resolve_family_face(name, bundled, links, repo, trace, facts), set(bundled))

    # BUTTON PRESETS (FR-33-4 open bag) — MERGED onto the framework baseline, never replaced.
    #
    # Two distinct non-destructive requirements, both proven necessary on Indus:
    #   (a) SLOT level — the draft defines only the slots it happens to use (Indus derives `outline`
    #       alone). A wholesale replace DELETED the baseline's `primary` + `secondary` presets; since
    #       push-theme-snapshot REPLACES the live theme.json, that strips them from the site — and
    #       Indus's buttons use exactly those.
    #   (b) KEY level — even for a slot the draft DOES define, `_rest_entry` only ever derives
    #       background/text/border/border-width/border-radius/font-size/font-weight/min-height
    #       (presets.py). `padding` is NOT in that vocabulary at all, so a slot-level replace drops
    #       the baseline padding from a slot the extractor never measured padding for. A key the
    #       extractor cannot derive is a blind spot, not a measurement of absence — the baseline must
    #       survive it.
    #
    # A derived key always WINS over the baseline key (it is the measured client value, the FR-33-1
    # iron law). This is ordinary theme.json layering (baseline → client override), and it is the
    # same destructive-replace class as the D319 palette lesson + the elements.heading fix above.
    bp = presets_mod.build_button_presets(facts, trace, settings.get("color", {}).get("palette"))
    if bp:
        presets = settings.setdefault("custom", {}).setdefault("buttonPresets", {})
        for slot, derived in bp.items():
            base_slot = presets.setdefault(slot, {})
            kept = [k for k in base_slot if k not in derived]
            base_slot.update(derived)
            trace.append({"kind": "merge", "what": f"buttonPresets.{slot}",
                          "reason": "derived keys overlaid onto the framework baseline preset; "
                                    "baseline keys the extractor cannot derive are preserved",
                          "overridden": ",".join(sorted(derived)) or "(none)",
                          "preserved_from_baseline": ",".join(sorted(kept)) or "(none)"})
        untouched = [s for s in presets if s not in bp]
        if untouched:
            trace.append({"kind": "merge", "what": "buttonPresets",
                          "reason": "baseline preset slots the draft does not define are preserved "
                                    "whole (a wholesale replace would delete them from the live site)",
                          "preserved_slots": ",".join(sorted(untouched))})

    if design:
        palette_refs.tokenise_button_presets(snap, trace, bp)

    # LAYOUT contentSize (scan beyond :root); a width the README declares already won above
    cs = presets_mod.content_size(base_rules, trace)
    if cs and not (design and design[0].get("layout", {}).get("max_content_width")):
        settings.setdefault("layout", {})["contentSize"] = cs
    # FR-33-19: the RENDERED content box wins over both declared widths above (FR-33-1).
    used_layout.apply_rendered_layout(settings, facts, trace)

    # FR-33-13 — RESERVE the header/footer COMPONENT namespace for Part 2 (Spec 17). Part 1 owns
    # GLOBAL/base + generic presets only; Part 2's header/footer tokens (sticky/scrolled header bg,
    # header height, logo max-height, nav-link hover, mobile-nav breakpoint, footer tokens) land in
    # settings.custom.header / .footer so Part 2 does not force a Part 1 re-spec. Reserved as empty
    # objects (WP emits no CSS var from an empty custom object — inert).
    # RECONCILIATION NOTE (Bean-directed 2026-07-13): Spec 17's BUILT header/footer styling drives
    # those values via the Customiser (wp_options) + inline wp_head CSS + a JS-measured
    # --sgs-header-height, NOT this theme.json namespace. So Part 2 must DECIDE tokenise-vs-Customiser
    # before populating this — the header height in particular is dynamic and would contend with a
    # static token. This reservation is a claim of the namespace, not an adoption of a delivery model.
    _custom = settings.setdefault("custom", {})
    _custom.setdefault("header", {})
    _custom.setdefault("footer", {})

    snap["title"] = f"{client} (generated by Spec 33 extractor)"
    snap["description"] = "Draft-generated global styles — DO NOT hand-edit; regenerate via extract.py."

    # FR-33-12 — embed the freshness key INSIDE the snapshot itself (not a sibling file).
    # The /sgs-clone orchestrator reads THIS block from the exact `theme-snapshot.json` the
    # converter's colour-snap loads, so the gate proves the file-that-is-used is fresh for the
    # current draft (a sibling record could drift from the deployed file). WP ignores this
    # unknown top-level key; push-theme-snapshot pushes only styles+settings, never this block;
    # `merge_onto` keeps it (the generated snapshot is the merge base). Deterministic (no timestamp).
    snap["_sgsExtractor"] = {
        "draft_css_sha256": css_sha256(css),
        "extractor_version": EXTRACTOR_VERSION,
    }
    # A Claude Design draft keeps its design in inline styles, its script and a README, none of
    # which the CSS hash sees. Static drafts get no extra key, so their snapshots are unchanged.
    source_hash = draft_source_sha256(html, read_readme_text(draft_dir))
    if source_hash:
        snap["_sgsExtractor"]["draft_source_sha256"] = source_hash
    # Which draft this snapshot describes: any other draft of the client inherits it (FR-33-12).
    if draft_name:
        snap["_sgsExtractor"]["source_draft"] = draft_name
    return snap


def validate_font_faces(snapshot: dict):
    """Return ``(ok, [error strings])`` — FR-33-14 font-loading gate.

    Every ``settings.typography.fontFamilies[]`` entry's PRIMARY family name (the first token of
    its CSS font-family stack, e.g. ``'Fraunces, serif'`` -> ``Fraunces``) must have a matching
    ``fontFace[].fontFamily`` entry SOMEWHERE in the array — not necessarily on the SAME entry
    (one entry's fontFace legitimately covers every OTHER entry sharing the exact same family
    name; the framework baseline's own ``heading`` slug reuses ``body``'s Inter @font-face this
    way, and that pairing is fine — see the framework's own ``theme/sgs-theme/theme.json``).

    Lives here rather than in ``schema_validate.py`` (this module's neighbour) deliberately — this
    is a cross-reference check ("does a name have a matching face anywhere in the array"), not a
    structural JSON-shape check, and it is specific to this extractor's own fail-closed contract.

    Catches the bug class a live Mama's Munches clone shipped with: a font-family NAME written
    into theme.json with nothing anywhere in the file to load it. WP emits the family into the
    generated CSS regardless (``font-family: Fraunces, serif``); the browser silently falls back
    to its own default serif stack (Times New Roman) with no error, no warning, nothing in the
    rendered page to say the intended font never loaded.
    """
    fams = ((snapshot.get("settings") or {}).get("typography") or {}).get("fontFamilies") or []
    declared_faces = set()
    for fam in fams:
        for face in (fam.get("fontFace") or []):
            name = (face.get("fontFamily") or "").strip().strip("'\"")
            if name:
                declared_faces.add(name.lower())

    errors = []
    for fam in fams:
        stack = fam.get("fontFamily") or ""
        primary = stack.split(",")[0].strip().strip("'\"")
        if not primary:
            continue
        if primary.lower() not in declared_faces:
            errors.append(
                f"settings.typography.fontFamilies (slug={fam.get('slug')!r}): font family "
                f"'{primary}' has NO matching fontFace entry anywhere in fontFamilies[] — the "
                f"browser will silently fall back to its default font for this family."
            )
    return (not errors, errors)


def merge_onto(snap: dict, existing: dict, trace: list) -> dict:
    """ADDITIVELY merge the generated ``snap`` onto an EXISTING client snapshot (FR-33-11 non-destruct).

    The generated globals/base/palette WIN (they carry the drift fix); but every EXISTING slug the
    generated palette does NOT cover is PRESERVED (warm-axis / aliases / colours the draft can't
    provide), as is the client's hand-authored component CSS + pattern refs. This is what makes a
    deploy to an already-cloned site non-breaking (the D318 pink regression = a destructive replace).
    """
    gen_slugs = {e.get("slug") for e in snap.get("settings", {}).get("color", {}).get("palette", [])}
    ex_pal = existing.get("settings", {}).get("color", {}).get("palette", []) or []
    added = 0
    for e in ex_pal:
        if e.get("slug") and e.get("slug") not in gen_slugs:
            snap.setdefault("settings", {}).setdefault("color", {}).setdefault("palette", []).append(e)
            added += 1
    ex_styles, ex_custom = existing.get("styles", {}), existing.get("settings", {}).get("custom", {})
    for key in ("css", "blocks"):
        if ex_styles.get(key) and not snap.get("styles", {}).get(key):
            snap.setdefault("styles", {})[key] = ex_styles[key]
    for key in ("sgs", "maxWidth"):
        if key in ex_custom:
            snap.setdefault("settings", {}).setdefault("custom", {})[key] = ex_custom[key]

    # styles.elements — preserve the client's hand-authored element keys the extractor never derives
    # (e.g. `button.typography.textDecoration`, which exists only in the client snapshot and was
    # dropped on every re-run). Fill-only: an existing leaf is carried across ONLY where the generated
    # snapshot has no value, so a generated (measured) value always wins.
    #
    # No h-tag exception is needed here: build_snapshot no longer deletes a heading level it cannot
    # measure (it leaves the framework baseline standing), so there is no "popped" state for a prior
    # snapshot to resurrect. Fill-only is safe for every element uniformly.
    ex_elements = ex_styles.get("elements", {}) or {}
    gen_elements = snap.setdefault("styles", {}).setdefault("elements", {})

    def _fill_only(dst: dict, src: dict) -> int:
        """Recursively add keys from ``src`` that ``dst`` lacks. Never overwrites. Returns count."""
        n = 0
        for k, v in src.items():
            if isinstance(v, dict):
                if not isinstance(dst.get(k), dict):
                    if k in dst:
                        continue        # a non-dict generated value stands
                    dst[k] = {}
                n += _fill_only(dst[k], v)
            elif k not in dst:
                dst[k] = v
                n += 1
        return n

    el_filled = 0
    for name, val in ex_elements.items():
        if isinstance(val, dict):
            el_filled += _fill_only(gen_elements.setdefault(name, {}), val)
    trace.append({"kind": "merge", "what": "styles.elements",
                  "reason": "fill-only carry of client element keys the extractor does not derive "
                            "(generated/measured values always win)",
                  "keys_preserved": el_filled})

    trace.append({"kind": "merge", "reason": f"additive merge onto existing snapshot: {added} extra "
                  f"palette slug(s) preserved + component css/blocks/patterns carried forward"})
    return snap


def _theme_background(facts: dict, trace: list) -> str:
    """FR-33-6 — the theme background = the COMPUTED background of the widest block-level ancestor that
    CONTAINS the main content flow, NOT ``<body>`` blindly.

    A dark background is discarded ONLY on a POSITIVE preview-shell signal (a matched marker element,
    with its DOM path): the shell wrapper + everything enclosing it (body/html) are excluded, so the
    widest CONTENT region INSIDE the shell wins. With no marker, the widest content-containing
    candidate wins even if dark — a legit dark-branded site keeps its dark background (never discarded
    by darkness alone). Ambiguous / no candidate → fall back to the body background (gap-logged).
    """
    body_bg = (facts.get("body", {}) or {}).get("backgroundColor", "")
    sections = facts.get("sections", []) or []
    marker_paths = [m.get("path", "") for m in (facts.get("previewShellMarkers", []) or [])
                    if isinstance(m, dict) and m.get("path")]

    def _transparent(bg: str) -> bool:
        b = (bg or "").strip().lower().replace(" ", "")
        return b in ("", "transparent", "rgba(0,0,0,0)")

    def _shell_or_ancestor(path: str) -> bool:
        # path IS a shell marker, or an ANCESTOR of one (its path is a '>'-segment prefix of a marker
        # path) → the dark shell wrapper and the body/html enclosing it are not the theme background.
        return any(path == mp or mp.startswith(path + ">") for mp in marker_paths)

    cands = [s for s in sections
             if (s.get("hasParagraph") or s.get("hasHeading")) and not s.get("inChrome")
             and not _transparent(s.get("backgroundColor", ""))]
    if marker_paths:
        cands = [s for s in cands if not _shell_or_ancestor(s.get("path", ""))]
    cands.sort(key=lambda s: -(s.get("area") or 0))

    if cands:
        chosen = cands[0]
        trace.append({"kind": "base", "what": "styles.color.background", "_source": "declared",
                      "reason": f"widest content-containing ancestor '{chosen.get('path','')}' "
                                f"(area {chosen.get('area')}"
                                + (f", {len(marker_paths)} preview-shell marker(s) excluded" if marker_paths else "")
                                + ")",
                      "value": chosen.get("backgroundColor", "")})
        return chosen.get("backgroundColor", body_bg)
    trace.append({"kind": "gap", "what": "styles.color.background",
                  "reason": "no content-containing background candidate — fell back to body background",
                  "value": body_bg})
    return body_bg


def _hex(v: str):
    from colour import parse_colour
    c = parse_colour(v)
    return c.hex if c else None


def _var_or_hex(hexv, slug_by_hex, kind):
    if hexv and hexv in slug_by_hex:
        return f"var:preset|color|{slug_by_hex[hexv]}"
    return hexv or ""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Spec 33 draft global-styles extractor")
    ap.add_argument("--client", required=True)
    ap.add_argument("--draft", required=True)
    ap.add_argument("--facts", default=None, help="cached computed-facts.json (skips measure.js)")
    ap.add_argument("--out", default=None)
    ap.add_argument("--trace", default=None)
    ap.add_argument("--repo-root", default=None)
    ap.add_argument("--replace-source", action="store_true",
                    help="allow this draft to replace a snapshot recorded as extracted from a DIFFERENT draft")
    ap.add_argument("--merge-onto", default=None,
                    help="path to an EXISTING client snapshot — additively preserve its extra palette "
                         "slugs + component CSS (non-destructive deploy to an already-cloned site)")
    args = ap.parse_args(argv)

    repo = _repo_root(args.repo_root)
    draft = pathlib.Path(args.draft).resolve()
    html = draft.read_text(encoding="utf-8")
    css = extract_css(html)
    if not css.strip():
        print("HALT: no CSS found in draft (parser/empty).", file=sys.stderr)
        return 3

    if not args.replace_source:
        for existing in filter(None, (args.out, args.merge_onto)):
            existing_path = pathlib.Path(existing)
            if existing_path.is_file() and is_part_draft(json.loads(existing_path.read_text(encoding="utf-8")), draft):
                print(f"HALT: {existing_path} was extracted from a different draft. Spec 33 runs on the client's "
                      "source draft only; other drafts inherit the saved snapshot. Pass --replace-source to make "
                      f"'{draft.name}' the source draft.", file=sys.stderr)
                return 6

    facts = json.loads(pathlib.Path(args.facts).read_text(encoding="utf-8")) if args.facts \
        else run_measure(draft)

    baseline = json.loads((repo / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))

    trace: list = []
    snap = build_snapshot(args.client, css, facts, html, baseline, trace, repo, draft_dir=draft.parent,
                          draft_name=draft.name)

    if args.merge_onto:
        existing_path = pathlib.Path(args.merge_onto)
        if existing_path.is_file():
            snap = merge_onto(snap, json.loads(existing_path.read_text(encoding="utf-8")), trace)

    ok, errors = validate_theme_json(snap)
    if not ok:
        print("HALT: emitted snapshot failed theme.json v3 schema validation:", file=sys.stderr)
        for e in errors[:10]:
            print("  -", e, file=sys.stderr)
        return 4

    # FR-33-14 — fail-closed unless every declared typography.fontFamilies[] entry has a matching
    # fontFace SOMEWHERE in the array. A name with nothing loading it silently falls back to the
    # browser default font on every element that declares it — this is the root cause a live
    # Mama's Munches clone shipped with (Fraunces on 14 elements silently rendering Times New
    # Roman). Same pattern as the FR-33-12 freshness gate: fail the run closed, name the fix.
    ok_faces, face_errors = validate_font_faces(snap)
    if not ok_faces:
        print("HALT (FR-33-14 font-face gate): a declared font family has no fontFace anywhere in "
              "settings.typography.fontFamilies[] — it would silently fall back to the browser's "
              "default font:", file=sys.stderr)
        for e in face_errors[:10]:
            print("  -", e, file=sys.stderr)
        print("This usually means the Google Fonts self-host fetch failed (network error, or the "
              "family name in the draft's <link> URL doesn't match the computed font-family). "
              "Re-run once connectivity is available, or hand-add a fontFace entry.",
              file=sys.stderr)
        return 5

    out_path = pathlib.Path(args.out) if args.out else (repo / "sites" / args.client / "theme-snapshot.generated.json")
    trace_path = pathlib.Path(args.trace) if args.trace else out_path.with_name("theme-extract-trace.json")
    out_path.write_text(json.dumps(snap, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    trace_path.write_text(json.dumps(trace, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")
    print(f"Wrote {trace_path}  ({len(trace)} rows)")
    print(f"  _sgsExtractor.draft_css_sha256={snap['_sgsExtractor']['draft_css_sha256'][:12]}… "
          f"(FR-33-12 freshness key embedded in the snapshot)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
