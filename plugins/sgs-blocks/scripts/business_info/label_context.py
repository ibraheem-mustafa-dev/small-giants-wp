"""Where a label is allowed to sit. A label inside a form, dialog, wizard or review summary is
someone's sample input, not the business's own details, so its value is never a candidate."""
from __future__ import annotations

import re

from bs4 import Tag

from .vocabulary import EXCLUDED_ANCESTOR_ROLES, EXCLUDED_ANCESTOR_TAGS, EXCLUDED_ANCESTOR_WORDS, FORM_CONTROL_TAGS

_WORD_SPLIT_RE = re.compile(r"[^a-z0-9]+")


def _words(tag: Tag) -> set[str]:
    """Lower-case words of an element's class tokens and id (`review-row` -> review, row)."""
    classes = tag.get("class") or []
    raw = " ".join(classes if isinstance(classes, list) else [str(classes)]) + " " + str(tag.get("id") or "")
    return {w for w in _WORD_SPLIT_RE.split(raw.lower()) if w}


def _excluded_container(tag: Tag) -> bool:
    if tag.name in EXCLUDED_ANCESTOR_TAGS:
        return True
    if str(tag.get("aria-modal", "")).lower() == "true":
        return True
    if str(tag.get("role", "")).lower() in EXCLUDED_ANCESTOR_ROLES:
        return True
    return bool(_words(tag) & EXCLUDED_ANCESTOR_WORDS)


def _has_form_control(tag: Tag) -> bool:
    return tag.name in FORM_CONTROL_TAGS or tag.find(FORM_CONTROL_TAGS) is not None


def label_is_usable(label: Tag) -> bool:
    """False when the label sits inside an excluded container, holds a control itself, or is
    followed by a sibling that is or contains a form control."""
    if _has_form_control(label):
        return False
    if any(_excluded_container(parent) for parent in label.parents if isinstance(parent, Tag)):
        return False
    return not any(isinstance(sib, Tag) and _has_form_control(sib) for sib in label.next_siblings)
