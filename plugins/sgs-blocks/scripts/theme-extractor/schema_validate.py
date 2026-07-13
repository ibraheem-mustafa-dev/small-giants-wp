"""schema_validate.py — theme.json v3 structural validation (Spec 33 FR-33-7).

A pragmatic SUBSET of the WP theme.json v3 schema — enough to catch a malformed emit BEFORE it
reaches ``push-theme-snapshot.py`` (a bad emit must fail here, not at the REST push). Validates the
slots this extractor writes: version, palette entry shape, fontFamilies, and the styles subtree.
"""
from __future__ import annotations

import jsonschema

_THEME_V3_SUBSET = {
    "type": "object",
    "required": ["version", "settings", "styles"],
    "properties": {
        "version": {"const": 3},
        "settings": {
            "type": "object",
            "properties": {
                "color": {
                    "type": "object",
                    "properties": {
                        "palette": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["slug", "color"],
                                "properties": {
                                    "slug": {"type": "string", "minLength": 1},
                                    "color": {"type": "string", "minLength": 1},
                                    "name": {"type": "string"},
                                    "_source": {"enum": ["declared", "derived"]},
                                },
                            },
                        }
                    },
                },
                "typography": {
                    "type": "object",
                    "properties": {
                        "fontFamilies": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["fontFamily", "slug"],
                                "properties": {
                                    "fontFamily": {"type": "string", "minLength": 1},
                                    "slug": {"type": "string", "minLength": 1},
                                },
                            },
                        }
                    },
                },
            },
        },
        "styles": {
            "type": "object",
            "properties": {
                "typography": {
                    "type": "object",
                    "properties": {
                        "fontSize": {"type": "string"},
                        "lineHeight": {"type": "string"},
                    },
                },
                "elements": {"type": "object"},
                "color": {"type": "object"},
            },
        },
    },
}


def validate_theme_json(snapshot: dict):
    """Return ``(ok, [error strings])`` for a theme.json v3 subset check."""
    validator = jsonschema.Draft202012Validator(_THEME_V3_SUBSET)
    errors = [f"{'/'.join(str(p) for p in e.path)}: {e.message}"
              for e in sorted(validator.iter_errors(snapshot), key=lambda e: list(e.path))]
    return (not errors, errors)
