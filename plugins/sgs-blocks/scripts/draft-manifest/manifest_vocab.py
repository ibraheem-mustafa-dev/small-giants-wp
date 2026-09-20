"""Draft manifest vocabulary: every word-list and lookup the manifest uses, held as data.

Nothing here names a client. Extending a table is a one-line change; a screen or overlay no rule
places is reported as unresolved, never guessed.
"""
from __future__ import annotations

# (fields searched, regex, kind). First rule that matches wins. Fields: label, route, purpose.
SCREEN_KIND_RULES = (
    (("purpose",), r"configurator|wizard|multi-?step", "choice-flow"),
    (("label", "route"), r"order[- ]confirm|order[- ]received|confirmation|/order/", "wc-order-received"),
    (("label", "route"), r"\bcheckout\b", "wc-checkout"),
    (("label", "route"), r"\bcart\b|\bbag\b|\bbasket\b", "wc-cart"),
    (("label",), r"\bproduct\b", "single-template"),
    (("route",), r"\[(?:slug|id)\]$", "single-template"),
    (("label", "route"), r"\bshop\b|catalogue|catalog|\bproducts\b|archive", "wc-archive"),
)
DEFAULT_SCREEN_KIND = "page"

# What each kind is built as. Spec numbers are where the target is defined.
TARGETS = {
    "page": "WordPress page, normal clone",
    "wc-archive": "WooCommerce shop archive template (Spec 30 FR-30-3)",
    "single-template": "single-post-type template (Spec 30 FR-30-2 when the type is product)",
    "wc-cart": "WooCommerce cart template (Spec 30)",
    "wc-checkout": "WooCommerce checkout template (Spec 30)",
    "wc-order-received": "WooCommerce order-received template (Spec 30)",
    "choice-flow": "sgs_choice_flow post (Spec 43)",
    "modal": "sgs_modal post (opened by an sgs/modal trigger)",
    "drawer": "sgs_drawer post (Spec 36)",
    "cart-drawer": "sgs/cart block with displayMode drawer (Spec 36 FR-36-19)",
    "mega": "sgs_mega_menu post (Spec 36)",
    "header": "sgs_header post (Spec 37)",
    "footer": "sgs_footer post (Spec 37)",
    "form": "sgs_form post (Spec 42)",
}

# Words in an overlay's own name (open-flag, handler names, dialog label) that mark a cart drawer.
CART_WORDS = r"bag|cart|basket|trolley"

# Overlay geometry, read from the first element of the region and its dialog child. First match wins.
# (regex over the region's opening markup, kind)
GEOMETRY_RULES = (
    (r"top:\s*100%", "mega"),
    (r"justify-content:\s*flex-(?:end|start)", "drawer"),
    (r"align-items:\s*center;\s*justify-content:\s*center", "modal"),
)
# A full-screen overlay (inset:0) that matched none of the above: a dialog is a modal, otherwise a drawer.
FULLSCREEN_RE = r"inset:\s*0"

# Build-order tiers. Lower builds first. A dependency edge always overrides a tier.
# Page shells (an empty page or template that only reserves a slug) come right after the global
# styles, so every link a modal, menu or header carries has a target that already exists.
TIERS = {
    "global": 0,
    "shell": 1,
    "modal": 2, "form": 2, "choice-flow": 2, "mega": 2, "drawer": 2, "cart-drawer": 2,
    "header": 3, "footer": 3,
    "content": 4,
}

# Handler names that carry a page link: the helper is resolved from the script, this only names the
# `go` verb the prototype's router uses.
ROUTER_CALLS = ("go", "navigate", "push")
