"""Tier 4d -- operator-confirmed WebGL reference-file pulling.

`.claude/plans/phase-r8-motion-recognition.md` Step 13 +
`.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 4d
section. Read in full before touching this module: `.claude/decisions.md`
D1019 (the legal framing this module is required to carry verbatim in
intent -- see "THE D1019 FRAMING" below) and D880 (the one-off Stripe
precedent this generalises).

WHAT THIS DOES
----------------
When Tier 4c's style-approximation (`webgl_style_classifier.py`) can't
match a source's WebGL visual style to either of SGS's two shipped Tier W
effects -- or the operator simply prefers the real starting point over an
approximation -- this module offers pulling the actual public reference
file(s) behind the detected effect (shader source, the JS driving it) from
the source's own publicly-served assets. Same shape as the Stripe
precedent (D880): a starting point to be reworked into SGS's own
attribute/control system, never shipped verbatim.

THE HARD GATE (mandatory pre-flight on every entry point below)
----------------------------------------------------
This tier NEVER fires without Tier 4a's confirmed-WebGL-presence signal
(`webgl_style_classifier.py::check_tier4a_confirmed_webgl()`'s own gate
dict, passed straight through -- this module does not re-derive it). On
top of that presence gate, this tier is only ELIGIBLE when EITHER Tier 4c
reported no match (`matched_effect is None`) OR the operator explicitly
said they prefer the real file over an approximation
(`operator_prefers_pull=True`). `check_tier4d_eligible()` is the ONE call
site every caller should use -- `build_pull_offer()` calls it first and
raises `Tier4dNotEligibleError` rather than proceeding when either
condition fails. Mirrors `webgl_style_classifier.py`'s own
`_require_gate()` pattern exactly.

THE D1019 FRAMING (mandatory, non-softenable -- see Step 13's own On-Fail
field: "If the D1019 legal framing text gets simplified or dropped during
implementation ... that is a hard stop")
----------------------------------------------------
`LEGAL_FRAMING_TEXT` below is not UI copy invented for this module -- it
reproduces `.claude/decisions.md` D1019's own framing IN INTENT: this
capability is Bean's own risk-tolerance decision, NOT a legal clearance;
rebuilding pulled material into SGS's own modular system is what makes it
a *derivative work*, which still generally needs the original owner's
permission under UK/US copyright absent a specific exception; the
solicitor's-hour question from D880 remains genuinely unresolved and is
NOT resolved by this feature existing. `build_pull_offer()` embeds this
text VERBATIM into every offer it returns -- there is no code path that
returns an offer without it, and no parameter to shorten or omit it.

NEVER AUTOMATIC (verify by grep before calling this module "done")
----------------------------------------------------
`execute_pull()` is the ONLY function that performs a network fetch, and
it refuses (`operator_confirmed is not True`) unless the caller passes an
explicit `operator_confirmed=True` -- there is no default that fetches.
`build_pull_offer()` itself never fetches anything; it only builds the
data the operator is shown before deciding. A caller cannot reach the
fetch path without first holding a real offer dict this module produced
(`execute_pull()` checks for the offer's own eligibility markers and
refuses a hand-built or stale dict) AND passing the confirmation flag
itself -- two independent checks, not one.

NO NEW ASSET-FETCH MECHANISM INVENTED
----------------------------------------------------
Confirmed by grep (2026-09-11): no existing `download`/`fetch_asset`
helper exists anywhere under `plugins/sgs-blocks/scripts/` to reuse. This
module uses the Python standard library's `urllib.request` directly (no
new third-party dependency) -- the same "no CDN, minimal dependency"
discipline the rest of this codebase's Tier 4 modules follow.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional

from tier4a_gate_verification import reverify_gate

# Windows consoles default to cp1252; force UTF-8 so a cosmetic encoding
# fault can never masquerade as a failed pull (same fix as
# capture-tier-fixture.py / webgl_draw_call_probe.py / webgl_style_classifier.py).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

# ---------------------------------------------------------------------------
# THE D1019 FRAMING -- verbatim in intent, never softened, never omitted.
# ---------------------------------------------------------------------------
LEGAL_FRAMING_TEXT = (
    "This is your own risk-tolerance decision, NOT a legal clearance. "
    "Reworking a pulled reference file into SGS's own attribute/control "
    "system is what makes it a derivative work -- under UK/US copyright "
    "that still generally needs the original owner's permission, absent a "
    "specific exception (fair use/fair dealing, fact-specific, not "
    "automatic). The rebuild step changes what ships; it does not "
    "retroactively license the initial copy. The UK IP solicitor's-hour "
    "question raised for the original Stripe precedent (decisions.md D880) "
    "was never obtained and remains genuinely unresolved -- this feature "
    "existing as a repeatable capability does not resolve that flag, and "
    "if anything raises the stakes, since exposure is no longer bounded to "
    "one considered source. Full reasoning: .claude/decisions.md D1019."
)

DECISION_REFERENCE = ".claude/decisions.md D1019"


class Tier4dNotEligibleError(RuntimeError):
    """Raised when `build_pull_offer()` is called without both the Tier 4a
    presence confirmation and (a Tier 4c no-match OR an explicit operator
    preference). This is the phase's core safety property for this tier --
    it must be impossible to bypass by construction, not just by
    convention. Mirrors `webgl_style_classifier.ClassifierNotGatedError`.
    """


class Tier4dOfferInvalidError(RuntimeError):
    """Raised when `execute_pull()` is handed something that isn't a real
    offer this module produced (missing eligibility/framing markers) --
    prevents a caller from hand-building a shortcut dict that skips the
    gate + legal-framing requirements."""


# ---------------------------------------------------------------------------
# THE HARD GATE
# ---------------------------------------------------------------------------

def check_tier4d_eligible(
    tier4a_gate: dict,
    tier4c_suggestion: Optional[dict] = None,
    operator_prefers_pull: bool = False,
) -> dict:
    """Decide whether Tier 4d may even be OFFERED for this source.

    `tier4a_gate` -- the exact dict
        `webgl_style_classifier.py::check_tier4a_confirmed_webgl()` (or the
        underlying `motion_library_signals`/`webgl_draw_call_probe`
        evidence it was built from) returns. `tier4a_gate["confirmed"]`
        must be True -- this is a HARD requirement with no override; if it
        is not True, this tier is never even offered, regardless of the
        other two parameters.
    `tier4c_suggestion` -- the dict `webgl_style_classifier.py::
        build_operator_suggestion()` returned for this source, or None if
        Tier 4c was never run for it. Eligible when
        `tier4c_suggestion.get("matched_effect") is None` (Tier 4c's own
        honest no-match shape).
    `operator_prefers_pull` -- True when the operator has explicitly said,
        for THIS source, they want the real file over an approximation
        even though Tier 4c found one. Never defaults True.

    Returns `{"eligible": bool, "reason": str}`.

    The `tier4a_gate["confirmed"]` claim is INDEPENDENTLY RE-VERIFIED via
    `tier4a_gate_verification.py::reverify_gate()` (QC-council hardening,
    2026-09-11) rather than trusted as a bare boolean -- a hand-built
    `{"confirmed": True}` dict with no real Tier 4a evidence behind it is
    refused here even though it reads truthy.
    """
    if not reverify_gate(tier4a_gate):
        return {
            "eligible": False,
            "reason": (
                "Tier 4a has not confirmed genuine WebGL presence for this "
                "source (or the gate failed independent re-verification). "
                "Tier 4d must never fire on a guess -- see this module's "
                "docblock, 'THE HARD GATE'."
            ),
        }

    no_style_match = bool(tier4c_suggestion) and tier4c_suggestion.get("matched_effect") is None

    if no_style_match:
        return {
            "eligible": True,
            "reason": "Tier 4c reported no confident match to either shipped Tier W effect.",
        }

    if operator_prefers_pull:
        return {
            "eligible": True,
            "reason": "Operator explicitly prefers the real reference file over an approximation.",
        }

    return {
        "eligible": False,
        "reason": (
            "Tier 4a confirmed WebGL presence, but Tier 4c already found a "
            "confident style match and the operator has not asked for the "
            "real file instead -- Tier 4d has nothing to offer here."
        ),
    }


def _require_eligible(gate: dict) -> None:
    if not gate.get("eligible"):
        raise Tier4dNotEligibleError(
            "Tier 4d refused to build an offer: " + gate.get("reason", "not eligible")
        )


# ---------------------------------------------------------------------------
# Building the offer (never fetches anything)
# ---------------------------------------------------------------------------

def build_pull_offer(
    source_urls: dict[str, str],
    tier4a_gate: dict,
    tier4c_suggestion: Optional[dict] = None,
    operator_prefers_pull: bool = False,
) -> dict:
    """Build the ONE explicit, per-source offer the operator is shown --
    never a fetch, never applied without a subsequent, separate
    `execute_pull(offer, operator_confirmed=True, ...)` call.

    `source_urls` -- `{"label": "https://public-asset-url", ...}`, e.g.
        `{"vertex_shader": "https://example.com/shaders/68467.glsl"}`. Only
        the source's own publicly-served asset URLs -- this module does
        not discover them; the caller (the pipeline's existing asset
        harvesting) supplies what it already found on the page.

    Raises `Tier4dNotEligibleError` if `check_tier4d_eligible()` refuses.
    """
    eligibility = check_tier4d_eligible(tier4a_gate, tier4c_suggestion, operator_prefers_pull)
    _require_eligible(eligibility)

    if not source_urls:
        raise ValueError("build_pull_offer() needs at least one source URL to offer")

    return {
        "eligible": True,
        "eligibility_reason": eligibility["reason"],
        "tier4a_gate": tier4a_gate,
        "tier4c_suggestion": tier4c_suggestion,
        "source_urls": dict(source_urls),
        "legal_framing": LEGAL_FRAMING_TEXT,
        "decision_reference": DECISION_REFERENCE,
        "requires_operator_confirmation": True,
        "message": (
            "Tier 4d can pull the following public reference file(s) as a "
            "starting point to rework into SGS's own attribute/control "
            "system. This is not applied automatically -- confirm per "
            "source to fetch."
        ),
    }


# ---------------------------------------------------------------------------
# Fetching (the ONLY function that touches the network -- confirmation-gated)
# ---------------------------------------------------------------------------

def _validate_offer(offer: dict) -> None:
    """Refuse anything that isn't a real offer this module produced --
    prevents a caller skipping `build_pull_offer()`'s gate + framing by
    hand-assembling a shortcut dict."""
    required_markers = ("eligible", "legal_framing", "requires_operator_confirmation", "source_urls")
    missing = [key for key in required_markers if key not in offer]
    if missing:
        raise Tier4dOfferInvalidError(
            f"execute_pull() was handed a dict missing required offer markers {missing!r} "
            "-- build the offer via build_pull_offer() first."
        )
    if not offer.get("eligible"):
        raise Tier4dOfferInvalidError("execute_pull() was handed an offer that was never eligible.")
    if offer.get("legal_framing") != LEGAL_FRAMING_TEXT:
        raise Tier4dOfferInvalidError(
            "execute_pull() was handed an offer whose legal_framing text does not match "
            "LEGAL_FRAMING_TEXT -- the D1019 framing must never be edited out or altered."
        )


def _fetch_one(url: str, dest_path: Path, timeout: int = 20) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "sgs-blocks-tier4d-reference-puller/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - public asset URL, operator-confirmed
        data = resp.read()
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_bytes(data)
    return {
        "url": url,
        "path": str(dest_path),
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    }


def execute_pull(offer: dict, operator_confirmed: bool, dest_dir: "Path | str") -> dict:
    """Fetch every URL in `offer["source_urls"]`, but ONLY when
    `operator_confirmed is True`. Declining leaves zero residual state --
    no partial fetch, no half-written files, no directory created.

    `offer` must be a real dict `build_pull_offer()` returned (see
    `_validate_offer()`) -- this is a second, independent check on top of
    the confirmation flag, so a caller cannot reach a fetch via either a
    skipped gate OR a missing confirmation alone.
    """
    _validate_offer(offer)

    if operator_confirmed is not True:
        return {
            "fetched": [],
            "skipped": True,
            "reason": "Operator declined the offered pull -- nothing was fetched.",
        }

    dest_dir = Path(dest_dir)
    fetched: list[dict] = []
    errors: list[dict] = []
    for label, url in offer["source_urls"].items():
        dest_path = dest_dir / label
        try:
            fetched.append({"label": label, **_fetch_one(url, dest_path)})
        except (urllib.error.URLError, OSError, ValueError) as exc:
            errors.append({"label": label, "url": url, "error": str(exc)})

    return {
        "fetched": fetched,
        "skipped": False,
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# CLI harness (mirrors the sibling Tier 4 modules' argparse shape)
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tier4a-gate-json", required=True, help="Path to a JSON file matching check_tier4a_confirmed_webgl()'s return shape")
    parser.add_argument("--tier4c-suggestion-json", help="Path to a JSON file matching build_operator_suggestion()'s return shape")
    parser.add_argument("--operator-prefers-pull", action="store_true")
    parser.add_argument("--source-urls-json", required=True, help="Path to a JSON file of {label: url}")
    parser.add_argument("--confirm", action="store_true", help="Actually fetch (omit to only print the offer)")
    parser.add_argument("--dest-dir", default=".")
    args = parser.parse_args()

    tier4a_gate = json.loads(Path(args.tier4a_gate_json).read_text(encoding="utf-8"))
    tier4c_suggestion = (
        json.loads(Path(args.tier4c_suggestion_json).read_text(encoding="utf-8"))
        if args.tier4c_suggestion_json
        else None
    )
    source_urls = json.loads(Path(args.source_urls_json).read_text(encoding="utf-8"))

    try:
        offer = build_pull_offer(
            source_urls,
            tier4a_gate,
            tier4c_suggestion=tier4c_suggestion,
            operator_prefers_pull=args.operator_prefers_pull,
        )
    except Tier4dNotEligibleError as exc:
        print(json.dumps({"error": str(exc)}, indent=2))
        return 1

    if not args.confirm:
        print(json.dumps(offer, indent=2, ensure_ascii=False))
        return 0

    result = execute_pull(offer, operator_confirmed=True, dest_dir=args.dest_dir)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
