"""Vocabulary and shape tables for the business-details extractor. DATA only, no behaviour.

Every lookup the extractor needs (which key names mean which Site Info key, which label texts
introduce a value, which hosts belong to which network) lives here, so adding a word is a table
edit and never a new branch.
"""
from __future__ import annotations

import re

# host substring → Site Info social key. First match wins per network.
SOCIAL_DOMAINS: dict[str, str] = {
    "facebook.com": "facebook",
    "fb.com": "facebook",
    "instagram.com": "instagram",
    "twitter.com": "twitter",
    "x.com": "twitter",
    "linkedin.com": "linkedin",
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "tiktok.com": "tiktok",
    "wa.me": "whatsapp",
    "whatsapp.com": "whatsapp",
}

# Vocabulary for the declared-data-object and labelled-text sources. DATA, not branches:
# lower-cased key (link suffix removed) -> (Site Info key or None, value shape).
# A None Site Info key is a KNOWN key with no Site Info equivalent (a map link needs a
# numeric CID for `maps_cid`); it is reported as unmapped, never invented.
VOCABULARY: dict[str, tuple[str | None, str]] = {
    "phone": ("phone", "phone"), "tel": ("phone", "phone"),
    "email": ("email", "email"),
    "address": ("address", "address"),
    "instagram": ("socials.instagram", "social"), "ig": ("socials.instagram", "social"),
    "facebook": ("socials.facebook", "social"), "fb": ("socials.facebook", "social"),
    "twitter": ("socials.twitter", "social"),
    "linkedin": ("socials.linkedin", "social"),
    "youtube": ("socials.youtube", "social"),
    "tiktok": ("socials.tiktok", "social"),
    "whatsapp": ("socials.whatsapp", "social"), "wa": ("socials.whatsapp", "social"),
    "google": ("socials.google", "social"), "gmb": ("socials.google", "social"),
    "reviews": ("socials.google", "social"),
    "hours": ("opening_hours", "hours"), "openinghours": ("opening_hours", "hours"),
    "map": (None, "url"), "maps": (None, "url"),
}
LINK_SUFFIXES = ("href", "url", "link")
# Element text (exactly, case-insensitive, at most LABEL_MAX_CHARS) -> (Site Info key, shape).
LABELS: dict[str, tuple[str, str]] = {
    "phone": ("phone", "phone"),
    "email": ("email", "email"),
    "address": ("address", "address"),
    "clinic": ("address", "address"),
    "hours": ("opening_hours", "hours"),
    "opening hours": ("opening_hours", "hours"),
}
LABEL_MAX_CHARS = 20
# A label is ignored when any ancestor is one of these tags / roles, or carries one of these words
# in a class token or id (split on non-alphanumerics: `review-row` -> review, row), or when the
# value beside it holds a form control. Those are a visitor's sample input, not the business's own
# details. Words are deliberately whole-word matches, so `information` never matches `form`.
EXCLUDED_ANCESTOR_TAGS = ("form", "dialog", "details")
EXCLUDED_ANCESTOR_ROLES = ("dialog", "alertdialog", "form")
EXCLUDED_ANCESTOR_WORDS = frozenset(
    {"form", "review", "checkout", "wizard", "step", "modal", "dialog", "popup"}
)
FORM_CONTROL_TAGS = ("input", "textarea", "select")
# Google review/profile hosts (the network SOCIAL_DOMAINS has no entry for).
GOOGLE_HOSTS = ("share.google", "g.page", "google.com", "goo.gl")
DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
HREF_RE = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
MAILTO_RE = re.compile(r"""mailto:([^"'\s?>]+)""", re.IGNORECASE)
TEL_RE = re.compile(r"""tel:([^"'\s>]+)""", re.IGNORECASE)
EMAIL_SHAPE_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Copyright line: a © or &copy; followed by the rest of that text run. Stop only
# at an HTML tag boundary (< >), a newline, or a JS-template backtick — so real
# text with apostrophes/quotes ("Mama's Munches.") is kept intact.
COPYRIGHT_RE = re.compile(r"""(?:©|&copy;)\s*([^<>\n`]{2,160})""", re.IGNORECASE)

PHONE_SHAPE_RE = re.compile(r"\+?[0-9][0-9\s().\-]{5,23}")
POSTCODE_RE = re.compile(r"\b[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}\b", re.IGNORECASE)
DAY_RE = r"(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?"
TIME_RE = r"[0-9]{1,2}(?:[.:][0-9]{2})?\s*(?:am|pm)?"
HOURS_RE = re.compile(
    rf"\b{DAY_RE}(?:\s*[-–—]\s*{DAY_RE})?\s*[:,]?\s+({TIME_RE}\s*[-–—]\s*{TIME_RE})",
    re.IGNORECASE,
)
# `key: 'value'` or `key: "value"` (JS object literal), escapes allowed inside the string.
PAIR_RE = re.compile(
    r"""(?<![\w$.])([A-Za-z_$][\w$]*)\s*:\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")"""
)
ESCAPE_RE = re.compile(r"""\\(['"\\])""")
SCRIPT_RE = re.compile(r"<script\b[^>]*>(.*?)</script>", re.IGNORECASE | re.DOTALL)
BINDING_RE = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")
