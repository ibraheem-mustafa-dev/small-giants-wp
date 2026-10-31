"""FR-33-1: the typography, gutter and focus values a Spec 48A export's tokens/*.css declare reach the snapshot,
and verify_against_draft.py reports every snapshot value that disagrees with them.

Built from the three real exports in sites/*/handoff and the committed snapshots (each re-extraction merges onto
it). Before declared_tokens.py, a re-extraction kept the committed gutter (1.5rem on every tier, where the redesign
and wholesale drafts declare 20/32/40px), the committed focus ring (#815311 where the redesign draft declares a 3px
#3A2A22 outline), the rendered first paragraph as the body size (17px / 1.65 where the redesign draft declares 16px
/ 1.55; 16px / 1.6 where the wholesale draft's body rule says 19px / 1.55), black body text on the wholesale draft
(its body rule says #4A5563), single desktop heading sizes, and one heading level's px tracking on every level.

Run:  cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests/test_declared_tokens.py -q
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys

PKG = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PKG))
REPO = PKG.parents[3]

import declared_tokens  # noqa: E402
import verify_against_draft  # noqa: E402

REDESIGN, WHOLESALE, OPTICIAN = "mamas-munches-redesign", "indus-foods", "eye-care-ward-end"


def _handoff(client: str) -> pathlib.Path:
    return REPO / "sites" / client / "handoff"


def _committed(client: str) -> dict:
    return json.loads((REPO / "sites" / client / "theme-snapshot.json").read_text(encoding="utf-8"))


def _expected(client: str) -> dict:
    return {r["path"]: r["value"] for r in declared_tokens.expectations(declared_tokens.read_roles(_handoff(client)))}


def _applied(client: str) -> dict:
    return declared_tokens.apply(copy.deepcopy(_committed(client)), _handoff(client), [])


def _intake(client: str) -> dict:
    return json.loads((REPO / "sites" / client / "build" / "intake" / "intake.json").read_text(encoding="utf-8"))


def test_gutter_per_tier_from_each_export():
    for client, tiers in ((REDESIGN, ("20px", "32px", "40px")), (WHOLESALE, ("20px", "32px", "40px")),
                          (OPTICIAN, ("20px", "52px", "52px"))):  # --gutter holds every tier but --gutter-mobile's
        got = _expected(client)
        assert tuple(got[f"settings.custom.gutter.{t}"] for t in declared_tokens.TIERS) == tiers, client


def test_heading_sizes_scale_from_the_mobile_to_the_desktop_token():
    got = _expected(REDESIGN)
    assert got["styles.elements.h1.typography.fontSize"].startswith("clamp(46px,")
    assert got["styles.elements.h1.typography.fontSize"].endswith(", 82px)")
    assert got["styles.elements.h3.typography.fontSize"].startswith("clamp(26px,")
    assert _expected(WHOLESALE)["styles.elements.h2.typography.fontSize"] == "clamp(28px,3.4vw,40px)"
    # --size-lens-h2 is a lens-section size, not the h2
    assert _expected(OPTICIAN)["styles.elements.h2.typography.fontSize"].endswith(", 46px)")


def test_the_redesign_snapshot_takes_its_declared_body_heading_and_focus_values():
    snap = _applied(REDESIGN)
    custom, styles = snap["settings"]["custom"], snap["styles"]
    assert custom["gutter"] == {"mobile": "20px", "tablet": "32px", "desktop": "40px"}
    assert verify_against_draft.resolve(snap, custom["focus"]["ring"]).upper() == "#3A2A22"
    assert custom["focus"]["width"] == "3px"
    assert verify_against_draft.resolve(snap, styles["typography"]["fontSize"]) == "16px"
    assert styles["typography"]["lineHeight"] == "1.55"
    h = styles["elements"]
    assert h["h1"]["typography"]["letterSpacing"] == "-0.025em" and h["h2"]["typography"]["letterSpacing"] == "-0.015em"
    assert h["h1"]["typography"]["lineHeight"] == "1.02" and h["h2"]["typography"]["lineHeight"] == "1.05"
    assert "letterSpacing" not in h["heading"]["typography"]  # one level's px tracking never spreads to the others


def test_the_wholesale_body_rule_gives_the_body_size_and_text_colour():
    snap = _applied(WHOLESALE)
    assert snap["styles"]["color"]["text"] == "var:preset|color|text"
    assert verify_against_draft.resolve(snap, snap["styles"]["color"]["text"]).upper() == "#4A5563"
    assert verify_against_draft.resolve(snap, snap["styles"]["typography"]["fontSize"]) == "19px"


def test_the_optician_focus_ring_is_its_accent():
    snap = _applied(OPTICIAN)
    assert snap["settings"]["custom"]["focus"]["ring"] == "var(--wp--preset--color--accent)"
    assert verify_against_draft.resolve(snap, snap["settings"]["custom"]["focus"]["ring"]).upper() == "#9C8B78"


def test_the_gate_reports_a_snapshot_without_the_declared_tokens_and_passes_it_once_applied(tmp_path):
    baseline = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
    # a frozen copy of the redesign snapshot as it stood before the draft's declared tokens were read
    stale = json.loads((pathlib.Path(__file__).parent / "fixtures" / "mamas-redesign-pre-reextract.snapshot.json").read_text(encoding="utf-8"))
    before = verify_against_draft.compare(stale, _handoff(REDESIGN), _intake(REDESIGN), {}, baseline)
    open_before = {r["path"] for r in before if r["verdict"] == "mismatch"}
    assert {"settings.custom.gutter.mobile", "settings.custom.focus.ring", "styles.typography.lineHeight"} <= open_before
    after = verify_against_draft.compare(_applied(REDESIGN), _handoff(REDESIGN), _intake(REDESIGN), {}, baseline)
    # the committed snapshot predates the confirmed palette marks (apply_confirmed rewrites the palette on a run)
    open_after = {r["path"] for r in after if r["verdict"] == "mismatch" and not r["path"].startswith("palette.")}
    # the draft's section tokens are the section padding default (FR-32-29), so nothing is left open
    assert open_after == set()
    accepted = {p: "the route writes each section's padding" for p in open_after}
    final = verify_against_draft.compare(_applied(REDESIGN), _handoff(REDESIGN), None, accepted, baseline)
    assert not [r for r in final if r["verdict"] == "mismatch"]


def test_the_gate_exits_non_zero_on_an_open_mismatch_and_zero_when_accepted(tmp_path):
    snap_path = tmp_path / "snap.json"
    snap_path.write_text(json.dumps(_applied(WHOLESALE)), encoding="utf-8")
    none = tmp_path / "none.json"
    none.write_text(json.dumps({"accepted": []}), encoding="utf-8")
    args = ["--client", WHOLESALE, "--snapshot", str(snap_path)]
    assert verify_against_draft.main(args + ["--accepted", str(none)]) == 1
    accepted = tmp_path / "accepted.json"
    accepted.write_text(json.dumps({"accepted": [{"path": f"settings.custom.section.padding.{t}", "reason": "route"}
                                                 for t in declared_tokens.TIERS]}), encoding="utf-8")
    assert verify_against_draft.main(args + ["--accepted", str(accepted)]) == 0


def test_a_palette_colour_that_differs_from_its_confirmed_mark_is_a_mismatch():
    baseline = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
    snap = _applied(OPTICIAN)
    for entry in snap["settings"]["color"]["palette"]:
        if entry["slug"] == "primary":
            entry["color"] = "#1F7A7A"
    rows = verify_against_draft.compare(snap, _handoff(OPTICIAN), _intake(OPTICIAN), {}, baseline)
    assert any(r["path"] == "palette.primary" and r["verdict"] == "mismatch" for r in rows)
