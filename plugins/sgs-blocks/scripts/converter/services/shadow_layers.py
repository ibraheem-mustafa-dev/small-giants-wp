"""shadow_layers — parse a draft `box-shadow` CSS value into the stored
shape/colour text pair (Task 4f-2, converter split so a multi-layer shadow
carries EVERY layer, not just a single preset slug).

GROUND-TRUTH: spec=31 §13.1 R-31-1 (DB-first, no hardcoded dicts — this
module hardcodes a GRAMMAR, not a per-block/per-value lookup table, so it is
the permitted class of constant, same as ``SKIP_TOP_LEVEL_TAGS``) and R-31-9
(universal, no per-block branch — every block routes through the same
parser). Design: `.claude/reports/2026-09-21-u1-4f-shadow-design.md`,
"4f-2 changes" paragraph + decisions 6 and 10.

This is the ONE-WAY mirror of the PHP composer
(`includes/helpers-shadow-layers.php::sgs_shadow_layers`) and its JS twin
(`src/utils/shadow-layers.js` / `src/utils/shadow-model.js::serialise`):
composer/twin go STORED TEXT -> CSS; this module goes DRAFT CSS -> STORED
TEXT. The grammar (top-level-comma-and-space split, paren-depth aware,
2-4 lengths + optional inset + one colour per layer, px-only lengths, hex
3/4/6/8 + rgb()/rgba() (comma or space) + `transparent` colours) is kept
byte-identical to those two files on purpose — anything they would reject
(`var()`, `calc()`, a non-px unit, an unrecognised colour, more than the
8-layer raw-paste cap) is an honest `ShadowGrammarError` here too, never a
guess (R-31-1: never pass through what cannot be verified against the
grammar).

Colour formatting matches `shadow-model.js::serialise`'s `entryOf`: opaque
colours write as a bare `#RRGGBB`; a translucent colour writes
`#RRGGBB N%` (N = alpha x 100, at most one decimal) — so the converter and
the block editor write IDENTICAL colour-list text for the same input.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Raw-paste layer cap (SGS_SHADOW_MAX_LAYERS in the PHP composer, MAX_LAYERS
# in the JS twin) — a value pasted with more layers than this renders
# nothing at all server-side, so it is an honest gap, never a partial write.
MAX_LAYERS = 8

_LENGTH_RE = re.compile(r"^-?(?:\d{1,4}(?:\.\d{1,3})?|\.\d{1,3})(?:px)?$")
_HEX_RE = re.compile(r"^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
_RGB_RE = re.compile(
    r"^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$",
    re.IGNORECASE,
)


class ShadowGrammarError(Exception):
    """A draft box-shadow value (or one of its layers) does not fit the
    composer's grammar. ``str(exc)`` is the honest, human-readable reason —
    the caller gaps the declaration naming it, never guesses a fallback."""


def split_top(value: str, sep: str) -> list[str]:
    """Split on top-level commas/whitespace only, paren-depth aware — the ONE
    scanner the PHP (`sgs_shadow_split_top`) and JS (`splitTop`) twins share.
    Never a regex split: `rgb(0, 0, 0)` must stay whole.

    Comma splits keep empty entries; whitespace splits drop them (mirrors
    both twins exactly).
    """
    parts: list[str] = []
    depth = 0
    buf = ""
    for char in value:
        if char == "(":
            depth += 1
        elif char == ")" and depth > 0:
            depth -= 1
        is_sep = depth == 0 and (char == "," if sep == "," else char.isspace())
        if is_sep:
            parts.append(buf.strip())
            buf = ""
            continue
        buf += char
    parts.append(buf.strip())
    if sep != ",":
        parts = [part for part in parts if part != ""]
    return parts


def parse_length(token: str) -> "float | None":
    """One length token: optional minus, up to 4 digits + 3 decimals,
    optional `px`. A bare `0` is legal; anything else (em, %, calc(), an
    exponent) is not.
    """
    if not _LENGTH_RE.match(token):
        return None
    return float(token[:-2]) if token.endswith("px") else float(token)


def format_length(value: float) -> str:
    """Format a number as a px length with no trailing zeros — byte-identical
    to `sgs_shadow_format_length()` / `formatLength()`."""
    text = f"{value:.3f}".rstrip("0").rstrip(".")
    if text in ("", "-0"):
        text = "0"
    return f"{text}px"


def _format_pct(alpha: float) -> str:
    text = f"{alpha:.1f}".rstrip("0").rstrip(".")
    return text if text else "0"


def parse_colour_token(token: str) -> "tuple[str, float] | None":
    """One colour LITERAL (no `N%` opacity suffix) -> `(colour, alpha 0-100)`,
    or ``None`` when it is not one of the composer's accepted literals — hex
    3/4/6/8, `rgb()`/`rgba()` (comma or space syntax), or `transparent`.
    Anything wider (a named CSS colour, `var()`, `color-mix()`) is
    deliberately NOT recognised here: R-31-1 forbids guessing at a grammar
    the composer itself has not been proven to accept for a converter-
    emitted value, and none of the task's required fixtures need it.
    """
    token = token.strip()
    if token.lower() == "transparent":
        return ("transparent", 100.0)
    if _HEX_RE.match(token):
        digits = token[1:]
        if len(digits) <= 4:
            digits = "".join(char * 2 for char in digits)
        colour = "#" + digits[0:6].upper()
        alpha = round(int(digits[6:8], 16) / 255 * 100, 1) if len(digits) == 8 else 100.0
        return (colour, alpha)
    match = _RGB_RE.match(token)
    if match:
        r, g, b = (min(255, int(match.group(i))) for i in (1, 2, 3))
        alpha_token = match.group(4)
        if alpha_token is None:
            alpha = 100.0
        elif alpha_token.endswith("%"):
            alpha = min(100.0, round(float(alpha_token[:-1]), 1))
        else:
            alpha = min(100.0, round(float(alpha_token) * 100, 1))
        return ("#%02X%02X%02X" % (r, g, b), alpha)
    return None


def _colour_entry(colour: str, alpha: float) -> str:
    """`entryOf()` — colour + opacity as one colour-list entry."""
    if colour == "transparent" or alpha >= 100.0:
        return colour
    return f"{colour} {_format_pct(alpha)}%"


@dataclass(frozen=True)
class ParsedLayer:
    inset: bool
    x: float
    y: float
    blur: float
    spread: float
    colour: str  # already-formatted colour-list entry ("#RRGGBB N%" / "#RRGGBB" / "transparent")
    colour_token: str  # the ORIGINAL colour token, verbatim, for the folded (no-sibling) path

    @property
    def shape(self) -> str:
        """`[inset ]X Y BLUR SPREAD` — `shapeOf()`."""
        return (
            ("inset " if self.inset else "")
            + f"{format_length(self.x)} {format_length(self.y)} "
            f"{format_length(self.blur)} {format_length(self.spread)}"
        )


def _parse_layer(text: str, index: int) -> ParsedLayer:
    tokens = split_top(text, " ")
    last = len(tokens) - 1
    inset = False
    nums: list[float] = []
    colour_token: "str | None" = None
    for position, token in enumerate(tokens):
        if token.lower() == "inset":
            if inset or (position != 0 and position != last):
                raise ShadowGrammarError(
                    f"layer {index + 1} has 'inset' in the wrong position (must be first or last)"
                )
            inset = True
            continue
        length = parse_length(token)
        if length is not None:
            nums.append(length)
            continue
        if colour_token is not None:
            raise ShadowGrammarError(
                f"layer {index + 1} has more than one non-length token "
                f"({colour_token!r} and {token!r})"
            )
        colour_token = token
    if len(nums) < 2 or len(nums) > 4:
        raise ShadowGrammarError(
            f"layer {index + 1} has {len(nums)} length values "
            f"(need 2 to 4: X Y [BLUR [SPREAD]], units other than px are rejected)"
        )
    if len(nums) >= 3 and nums[2] < 0:
        raise ShadowGrammarError(f"layer {index + 1} has a negative blur ({nums[2]!r})")
    if colour_token is None:
        raise ShadowGrammarError(
            f"layer {index + 1} has no explicit colour (would inherit currentColor)"
        )
    parsed_colour = parse_colour_token(colour_token)
    if parsed_colour is None:
        if colour_token.startswith("var(") or colour_token.startswith("calc("):
            reason = f"{colour_token!r} ({'var()' if colour_token.startswith('var(') else 'calc()'} is not a supported literal)"
        else:
            reason = f"{colour_token!r} is not a supported hex/rgb/rgba/transparent colour"
        raise ShadowGrammarError(f"layer {index + 1} colour {reason}")
    colour, alpha = parsed_colour
    return ParsedLayer(
        inset=inset,
        x=max(-200.0, min(200.0, nums[0])),
        y=max(-200.0, min(200.0, nums[1])),
        blur=max(0.0, min(100.0, nums[2] if len(nums) >= 3 else 0.0)),
        spread=max(-200.0, min(200.0, nums[3] if len(nums) >= 4 else 0.0)),
        colour=_colour_entry(colour, alpha),
        colour_token=colour_token,
    )


@dataclass(frozen=True)
class ParsedShadow:
    is_none: bool
    shape: str  # layer shapes only, joined ', ' ('' when is_none)
    colour: str  # colour-list text: one entry when every layer agrees, else a list ('' when is_none)
    folded_shape: str  # shape with the colour folded into each layer (draft-style; 'none' when is_none)


def parse_draft_box_shadow(raw_value: str) -> ParsedShadow:
    """Parse a single draft CSS `box-shadow` declaration's value into the
    stored shape/colour text pair (Task 4f-2 brief step 1-2).

    Raises `ShadowGrammarError` (its message is the honest reason) when the
    grammar rejects the value or any one of its layers — the caller gaps the
    declaration naming that reason, never emits a partial/guessed write
    (Spec 31 R-31-1).
    """
    value = raw_value.strip()
    if value.lower() == "none":
        return ParsedShadow(is_none=True, shape="", colour="", folded_shape="none")
    layer_texts = split_top(value, ",")
    if len(layer_texts) > MAX_LAYERS:
        raise ShadowGrammarError(
            f"{len(layer_texts)} layers exceeds the {MAX_LAYERS}-layer raw-paste cap"
        )
    layers = [_parse_layer(text, index) for index, text in enumerate(layer_texts)]
    shape = ", ".join(layer.shape for layer in layers)
    entries = [layer.colour for layer in layers]
    uniform = len(entries) > 0 and all(entry == entries[0] for entry in entries)
    colour = entries[0] if uniform else ", ".join(entries)
    # Folded (no colour-sibling) form keeps the ORIGINAL colour token per layer,
    # verbatim — the composer's per-layer grammar resolves a draft-style embedded
    # colour itself (hex/rgb/rgba -> hex, exactly as a genuinely single-attribute
    # draft value would), so no extra normalisation is needed here.
    folded_shape = ", ".join(f"{layer.shape} {layer.colour_token}" for layer in layers)
    return ParsedShadow(is_none=False, shape=shape, colour=colour, folded_shape=folded_shape)
