"""derive.py — Pass B: PROVISIONAL palette derivation for drafts that declare NO :root tokens (FR-33-5).

Pass A (palette.py) emits the draft's DECLARED ``:root`` colours. When a draft declares none (a
token-less scrape), Pass B recovers a palette from the CONCRETE literal colours used in the rules —
role by usage-context (roles.py, NOT raw frequency, which inverts a palette), ranked by RELATIVE SHARE
within a role bucket. Every derived token is PROVISIONAL: tagged ``_source:derived`` + ``confidence`` +
``advisory:true``, and NEVER auto-pushed live (``push-theme-snapshot`` strips advisory entries unless
``--include-advisory``). Nothing usable → ``[]`` (the caller keeps the framework baseline UNCHANGED +
logs a loud skip — never a silent guessed theme).
"""
from __future__ import annotations

from collections import defaultdict

from roles import collect_colour_usages, infer_role, CONFIDENCE_FLOOR

# One representative theme slug per inferred role. Derived output is advisory (a human confirms before
# it goes live), so a coarse role→slug mapping is acceptable here — the trust comes from the advisory
# gate, not slug precision.
_ROLE_SLUG = {
    "surface": "surface", "surface-alt": "surface-alt", "text": "text", "text-muted": "text-muted",
    "primary": "primary", "accent": "accent", "border-subtle": "border-subtle",
    "success": "success", "error": "error", "link-colour": "primary", "on-interactive": "text-inverse",
}


def derive_palette(base_rules: list, trace: list) -> list:
    """Return a list of PROVISIONAL (advisory) palette entries, or ``[]`` when nothing is usable."""
    usages = collect_colour_usages({}, base_rules)  # {} = no :root tokens (Pass A already handled them)
    if not usages:
        trace.append({"kind": "derive-skip", "reason": "Pass B: no concrete colour usages found"})
        return []

    # role → [(colour_key, confidence, count, hex)]
    by_role: dict = defaultdict(list)
    for _key, evs in usages.items():
        col = next((e["colour"] for e in evs if e.get("colour")), None)
        if col is None:
            continue
        if col.alpha < 0.999:
            # translucent → decorative one-off (a tint/shadow rgba), NOT a palette token (FR-33-9).
            trace.append({"kind": "derive-gap", "value": col.hex,
                          "reason": "Pass B: translucent colour → decorative, not the palette"})
            continue
        role, conf, _reason = infer_role([e for e in evs if e.get("colour")])
        if role == "custom" or conf < CONFIDENCE_FLOOR:
            continue  # not confidently role-bearing → skip (conservation, never a mis-slugged guess)
        by_role[role].append((col.key, conf, len(evs), col.hex))

    if not by_role:
        trace.append({"kind": "derive-skip",
                      "reason": "Pass B: no colour reached a confident role — framework baseline kept "
                                "UNCHANGED (never a guessed theme)"})
        return []

    palette = []
    used_slugs: set = set()
    for role in sorted(by_role):
        bucket = by_role[role]
        total = sum(t[2] for t in bucket)
        # relative share WITHIN the role bucket — the dominant colour wins. Deterministic: count desc,
        # then confidence desc, then canonical hex asc.
        _key, conf, count, hexv = min(bucket, key=lambda t: (-t[2], -t[1], t[3]))
        slug = _ROLE_SLUG.get(role, f"derived-{role}")
        while slug in used_slugs:
            slug = f"{slug}-alt"
        used_slugs.add(slug)
        share = round(count / total, 3) if total else 0.0
        palette.append({"slug": slug, "color": hexv, "name": slug.replace("-", " ").title(),
                        "_source": "derived", "confidence": round(conf, 2), "advisory": True})
        trace.append({"kind": "derive", "slug": slug, "_source": "derived", "role": role,
                      "confidence": round(conf, 2), "relative_share": share, "value": hexv,
                      "reason": f"Pass B: derived {role} by usage-context (share {share} within role)"})
    return palette
