"""composer_fallback — atomic-pattern fallback emitter for /sgs-clone Stage 7.

Walks a section's DOM and emits a wp:sgs/container pattern composition built
from core/heading, core/paragraph, sgs/button, sgs/decorative-image. Used for
deferred / scaffold-only sections where the extract.py harvest produces nothing
usable.

Hard Rule 3: every clone-pipeline emission is a pattern composition, not a
bare single-block dump. This module is the safety net for cases where the
autonomy chain itself fails or errors. After Phase 6 the autonomy chain should
cover most cases; this becomes truly cold-path code.

Extracted from sgs-clone-orchestrator.py 2026-05-14 (Phase 6 v2 Step 6c) per
the deterministic-not-inline rule. Function name + signature unchanged so the
orchestrator's lazy-load dispatch is the only edit at the call site.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

_BUTTON_HINT_RE = re.compile(r"\b(button|btn|cta)\b", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Lazy-load trace.Trace; soft-fail to None if unavailable.
# ---------------------------------------------------------------------------
def _load_trace():
    """Locate and load trace.Trace; return None on any failure."""
    import importlib.util as _ilu
    from pathlib import Path as _Path
    here = _Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / "orchestrator" / "trace.py"
        if candidate.exists():
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
        candidate2 = parent / "trace.py"
        if candidate2.exists() and parent.name == "orchestrator":
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate2)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
    return None

_Trace = _load_trace()


def _emit_block(name: str, attrs: dict, inner_html: str | None = None,
                self_closing: bool = True) -> str:
    """Emit a single Gutenberg block-comment + (optional) inner HTML."""
    attr_json = json.dumps(attrs, ensure_ascii=False, separators=(",", ":")) if attrs else ""
    head = f"<!-- wp:{name}{(' ' + attr_json) if attr_json else ''}"
    if self_closing:
        return head + " /-->"
    return head + " -->" + (inner_html or "") + f"<!-- /wp:{name} -->"


def _emit_core_heading(text: str, level: int) -> str:
    tag = f"h{max(1, min(6, level))}"
    inner = f"<{tag} class=\"wp-block-heading\">{text}</{tag}>"
    attrs = {"level": level} if level != 2 else {}
    return _emit_block("core/heading", attrs, inner_html=inner, self_closing=False)


def _emit_core_paragraph(text: str) -> str:
    inner = f"<p>{text}</p>"
    return _emit_block("core/paragraph", {}, inner_html=inner, self_closing=False)


def _emit_sgs_button(label: str, url: str) -> str:
    return _emit_block("sgs/button", {"label": label, "url": url or "#"})


def _emit_sgs_decorative_image(src: str, alt: str) -> str:
    return _emit_block(
        "sgs/decorative-image",
        {"imageUrl": src, "imageAlt": alt or ""},
    )


def compose_atomic_pattern(mockup_path: Path, selector: str,
                           section_id: str, class_signature: list[str],
                           run_dir=None) -> str | None:
    """Compose a wp:sgs/container atomic-pattern from a section in the mockup.

    Returns Gutenberg markup string or None if the section cannot be resolved
    or yields no useful inner content.
    """
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return None
    if not mockup_path.exists():
        return None
    soup = BeautifulSoup(mockup_path.read_text(encoding="utf-8"), "html.parser")
    try:
        node = soup.select_one(selector)
    except Exception:  # noqa: BLE001 -- malformed selector
        return None
    if node is None:
        return None

    tr = (_Trace.for_run(run_dir) if _Trace else None)
    if tr:
        try:
            tr.event(
                stage="stage_7_fallback_composer_start",
                selector=selector,
                section_id=section_id,
                class_signature=class_signature,
                mockup_exists=mockup_path.exists(),
                node_found=True,
            )
        except Exception:
            pass

    inner_blocks: list[str] = []
    seen_texts: set[str] = set()
    seen_urls: set[str] = set()
    seen_imgs: set[str] = set()

    # Walk descendants in document order, emitting atomic blocks.
    for el in node.descendants:
        name = getattr(el, "name", None)
        if not name:
            continue
        if name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            text = el.get_text(" ", strip=True)
            if text and text not in seen_texts:
                seen_texts.add(text)
                inner_blocks.append(_emit_core_heading(text, int(name[1])))
        elif name == "p":
            text = el.get_text(" ", strip=True)
            if text and text not in seen_texts and len(text) > 1:
                seen_texts.add(text)
                inner_blocks.append(_emit_core_paragraph(text))
        elif name == "button" or (name == "a" and _BUTTON_HINT_RE.search(" ".join(el.get("class", [])) or "")):
            label = el.get_text(" ", strip=True)
            url = el.get("href", "") if name == "a" else ""
            key = f"{label}|{url}"
            if label and key not in seen_urls:
                seen_urls.add(key)
                inner_blocks.append(_emit_sgs_button(label, url))
        elif name == "img":
            src = el.get("src", "") or ""
            alt = el.get("alt", "") or ""
            if src and src not in seen_imgs:
                seen_imgs.add(src)
                inner_blocks.append(_emit_sgs_decorative_image(src, alt))

    if not inner_blocks:
        return None

    # Pick the most descriptive sgs- class (skip BEM children with -- or __).
    section_class = ""
    for cls in class_signature or []:
        if cls.startswith("sgs-") and "--" not in cls and "__" not in cls:
            section_class = cls
            break

    container_attrs: dict = {}
    if section_id:
        container_attrs["anchor"] = section_id
    if section_class:
        container_attrs["className"] = section_class

    inner_html = "\n  ".join(inner_blocks)
    container_attrs_json = json.dumps(container_attrs, ensure_ascii=False, separators=(",", ":")) if container_attrs else ""
    head = f"<!-- wp:sgs/container{(' ' + container_attrs_json) if container_attrs_json else ''} -->"
    if tr:
        try:
            tr.event(
                stage="stage_7_fallback_composer_result",
                section_id=section_id,
                inner_block_count=len(inner_blocks),
                inner_block_types=[b.split("<!--")[0].strip() for b in inner_blocks],
                section_class=section_class,
                composed=len(inner_blocks) > 0,
            )
        except Exception:
            pass
    return head + "\n  " + inner_html + "\n<!-- /wp:sgs/container -->"
