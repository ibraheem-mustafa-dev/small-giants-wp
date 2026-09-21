"""Group A (2026-09-21): closing the media loop.

After Stage 4i uploads a draft's images, the block markup Stage 10 deploys must carry
the uploaded attachment URL and id instead of the draft's relative path and id 0.
These tests cover media-sideload.py::rewrite_block_markup and ::apply_rewrite_to_run,
network-free (a fake uploader supplies the attachment records).

Why a new step rather than `--media-map` (scripts/converter/resolvers/scalar_content.py):
the media map is consulted at Stage 4 convert time, before anything is uploaded, and
converter/services/lift_helpers.py::resolve_media_url can only return a URL (id stays 0).
"""
from __future__ import annotations

import importlib.util
import json
import re
import tempfile
from pathlib import Path

import pytest

HERE = Path(__file__).parent
_SPEC = importlib.util.spec_from_file_location("media_sideload_rewrite", HERE / "media-sideload.py")
mod = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(mod)

URL_MAP = {
    "assets/brands/ray-ban.jpg": {
        "attachment_id": 77, "source_url": "https://site.example/wp-content/uploads/ray-ban.jpg",
        "local_path": "x",
    },
    "assets/brands/gucci.jpg": {
        "attachment_id": 78, "source_url": "https://site.example/wp-content/uploads/gucci.jpg",
        "local_path": "x",
    },
}

# Emitted exactly as the converter serialises it: compact, core-escaped, alphabetical keys.
STRIP = (
    '<!-- wp:sgs/brand-strip {"logos":[{"media":{"alt":"Ray-Ban","id":0,"url":"assets/brands/ray-ban.jpg"}},'
    '{"media":{"alt":"Gucci","id":0,"url":"assets/brands/gucci.jpg"}},'
    '{"media":{"alt":"Other","id":0,"url":"assets/brands/unmapped.jpg"}}]} /-->'
)
HEADING = '<!-- wp:sgs/heading {"content":"Fish \\u0026 chips \\u003cnow\\u003e \\u002d\\u002d","level":2} /-->'
HERO = (
    '<!-- wp:sgs/hero {"splitImage":{"alt":"Café","id":0,"url":"assets/brands/ray-ban.jpg"},'
    '"logo":{"alt":"Hosted","id":9,"url":"https://cdn.example/a.jpg"}} /-->'
)
MARKUP = "\n\n".join([HEADING, STRIP, HERO])


def test_rewrite_sets_url_and_id_in_emitted_markup() -> None:
    new, stats = mod.rewrite_block_markup(MARKUP, URL_MAP)
    assert '"alt":"Ray-Ban","id":77,"url":"https://site.example/wp-content/uploads/ray-ban.jpg"' in new
    assert '"alt":"Gucci","id":78,"url":"https://site.example/wp-content/uploads/gucci.jpg"' in new
    assert '"splitImage":{"alt":"Café","id":77,"url":"https://site.example/wp-content/uploads/ray-ban.jpg"}' in new
    assert stats["images_rewritten"] == 3
    assert stats["blocks_changed"] == 2
    assert "assets/brands/ray-ban.jpg" not in new


def test_unmapped_relative_url_is_left_alone_and_reported() -> None:
    new, stats = mod.rewrite_block_markup(MARKUP, URL_MAP)
    assert '"alt":"Other","id":0,"url":"assets/brands/unmapped.jpg"' in new
    assert stats["still_relative"] == ["assets/brands/unmapped.jpg"]


def test_hosted_url_and_unrelated_blocks_are_byte_identical() -> None:
    new, _ = mod.rewrite_block_markup(MARKUP, URL_MAP)
    assert HEADING in new, "an untouched block must keep its exact bytes (core escapes included)"
    assert '"logo":{"alt":"Hosted","id":9,"url":"https://cdn.example/a.jpg"}' in new


def test_changed_block_keeps_core_escaping_and_literal_unicode() -> None:
    markup = ('<!-- wp:sgs/hero {"headline":"A \\u0026 B \\u003c\\u003e \\u002d\\u002d C é",'
              '"splitImage":{"alt":"x","id":0,"url":"assets/brands/gucci.jpg"}} /-->')
    new, stats = mod.rewrite_block_markup(markup, URL_MAP)
    assert stats["images_rewritten"] == 1
    assert '"headline":"A \\u0026 B \\u003c\\u003e \\u002d\\u002d C é"' in new
    assert "-->" not in new.split("{", 1)[1].rsplit("}", 1)[0], "attribute JSON must not close the comment"
    attrs = json.loads(re.search(r"(\{.*\})", new).group(1))
    assert attrs["headline"] == "A & B <> -- C é"
    assert attrs["splitImage"] == {"alt": "x", "id": 78,
                                   "url": "https://site.example/wp-content/uploads/gucci.jpg"}


def test_rewrite_is_idempotent() -> None:
    once, first = mod.rewrite_block_markup(MARKUP, URL_MAP)
    twice, second = mod.rewrite_block_markup(once, URL_MAP)
    assert once == twice
    assert first["images_rewritten"] == 3 and second["images_rewritten"] == 0


def test_no_url_map_or_no_images_changes_nothing() -> None:
    same, stats = mod.rewrite_block_markup(MARKUP, {})
    assert same == MARKUP and stats["images_rewritten"] == 0
    text_only = '<!-- wp:paragraph -->\n<p>Hello</p>\n<!-- /wp:paragraph -->'
    assert mod.rewrite_block_markup(text_only, URL_MAP)[0] == text_only


def test_non_image_object_with_a_matching_url_is_not_touched() -> None:
    """A link object is not an image: without `id`/`alt` it is not even the image-object shape, and WITH a non-zero
    `id` (the shape this test used to skip, so it guarded nothing) it is an attachment reference. Neither is rewritten."""
    plain = '<!-- wp:sgs/button {"link":{"url":"assets/brands/gucci.jpg","opensInNewTab":true}} /-->'
    with_id = '<!-- wp:sgs/button {"link":{"id":7,"opensInNewTab":true,"url":"assets/brands/gucci.jpg"}} /-->'
    with_alt = '<!-- wp:sgs/button {"link":{"alt":"Gucci","id":7,"url":"assets/brands/gucci.jpg"}} /-->'
    for markup in (plain, with_id, with_alt):
        new, stats = mod.rewrite_block_markup(markup, URL_MAP, {})
        assert new == markup and stats["images_rewritten"] == 0, markup
    # Negative control: the same object with id 0 IS an image-object, so it is rewritten (the test can fail).
    rewritten, stats = mod.rewrite_block_markup(with_id.replace('"id":7', '"id":0'), URL_MAP, {})
    assert stats["images_rewritten"] == 1 and '"id":78' in rewritten


def _run_dir_with_extract(tmp: str, markup: str) -> Path:
    run_dir = Path(tmp) / "run"
    run_dir.mkdir()
    payload = {
        "extracted_attributes": {"hero": {"splitImage": {"id": 0, "alt": "x", "url": "assets/brands/gucci.jpg"}}},
        "block_markup": markup,
        "per_section_results": [{"block_markup": markup}],
    }
    (run_dir / "extract.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return run_dir


def test_apply_rewrite_to_run_updates_the_file_stage_10_reads() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        run_dir = _run_dir_with_extract(tmp, MARKUP)
        extract_out = {"block_markup": MARKUP}
        stats = mod.apply_rewrite_to_run(run_dir, extract_out, URL_MAP)
        on_disk = json.loads((run_dir / "extract.json").read_text(encoding="utf-8"))
        assert stats["images_rewritten"] == 3
        assert 'https://site.example/wp-content/uploads/gucci.jpg' in on_disk["block_markup"]
        assert on_disk["block_markup"] == extract_out["block_markup"], "in-memory copy must match the file"
        # The per-section record and the extracted attributes stay as the converter emitted them.
        assert on_disk["per_section_results"][0]["block_markup"] == MARKUP
        assert on_disk["extracted_attributes"]["hero"]["splitImage"]["url"] == "assets/brands/gucci.jpg"
        report = json.loads((run_dir / "media-rewrite-report.json").read_text(encoding="utf-8"))
        assert report["images_rewritten"] == 3 and "assets/brands/gucci.jpg" in report["url_map"]


def test_apply_rewrite_with_nothing_to_rewrite_leaves_extract_json_untouched() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        run_dir = _run_dir_with_extract(tmp, HEADING)
        before = (run_dir / "extract.json").read_bytes()
        stats = mod.apply_rewrite_to_run(run_dir, {"block_markup": HEADING}, URL_MAP)
        assert stats["images_rewritten"] == 0
        assert (run_dir / "extract.json").read_bytes() == before


def test_apply_rewrite_fails_loudly_when_extract_json_is_missing() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        empty = Path(tmp) / "run"
        empty.mkdir()
        with pytest.raises(mod.SideloadRewriteError) as info:
            mod.apply_rewrite_to_run(empty, {"block_markup": MARKUP}, URL_MAP)
        assert "extract.json" in str(info.value)


def test_upload_then_rewrite_end_to_end_with_a_fake_uploader() -> None:
    """sideload_batch (fake uploader) -> apply_rewrite_to_run: the deployed markup carries url + id."""
    with tempfile.TemporaryDirectory() as tmp:
        draft = Path(tmp) / "draft"
        (draft / "assets" / "brands").mkdir(parents=True)
        for name in ("ray-ban.jpg", "gucci.jpg"):
            (draft / "assets" / "brands" / name).write_bytes(b"img")
        secrets = Path(tmp) / "secrets"
        secrets.mkdir()
        (secrets / "fake.env").write_text(
            "WP_URL_FAKE=https://site.example\nWP_USER_FAKE=u\nWP_APP_PWD_FAKE=p\n", encoding="utf-8")
        run_dir = _run_dir_with_extract(tmp, MARKUP)
        extract_out = json.loads((run_dir / "extract.json").read_text(encoding="utf-8"))
        ids = {"ray-ban.jpg": 301, "gucci.jpg": 302}

        def fake_upload(file_path: Path, wp_site: str, auth_header: str):
            return {"id": ids[file_path.name], "source_url": f"{wp_site}/wp-content/uploads/{file_path.name}"}, False

        # collect_image_slots walks the extracted tree, so give it the slots the markup carries.
        slots = {"a": {"id": 0, "alt": "Ray-Ban", "url": "assets/brands/ray-ban.jpg"},
                 "b": {"id": 0, "alt": "Gucci", "url": "assets/brands/gucci.jpg"}}
        report = mod.sideload_batch(slots, mockup_root=draft, upload=True, site="fake",
                                    secrets_dir=secrets, uploader=fake_upload)
        stats = mod.apply_rewrite_to_run(run_dir, extract_out, report["url_map"])
        deployed = json.loads((run_dir / "extract.json").read_text(encoding="utf-8"))["block_markup"]
        assert '"id":301,"url":"https://site.example/wp-content/uploads/ray-ban.jpg"' in deployed
        assert '"id":302,"url":"https://site.example/wp-content/uploads/gucci.jpg"' in deployed
        assert stats["images_rewritten"] == 3
        # Stage 10's only rewrite pattern (`../../research/...`) has nothing left to match.
        assert not re.findall(r"\.\./\.\./research/", deployed)


# ---------------------------------------------------------------------------------------------------------------
# QC fix wave: nested image-objects, attachment references, scalar media attributes
# ---------------------------------------------------------------------------------------------------------------

HERO_URL = "assets/hero.webp"
HERO_MAP = {HERO_URL: {"attachment_id": 99, "source_url": "https://s.example/uploads/hero.webp", "local_path": "x"}}


def _one_block(attrs: dict, name: str = "sgs/x") -> str:
    return f"<!-- wp:{name} " + json.dumps(attrs, separators=(",", ":")) + " /-->"


def _attrs_of(markup: str) -> dict:
    return json.loads(re.search(r"(\{.*\})", markup).group(1))


def test_an_image_object_nested_inside_another_is_rewritten_and_the_outer_one_is_still_reported() -> None:
    """The old walk returned at the first image-object: the nested mapped image was neither rewritten nor reported."""
    markup = _one_block({"image": {"url": "assets/other.webp", "id": 0,
                                   "inner": {"url": HERO_URL, "id": 0}}})
    new, stats = mod.rewrite_block_markup(markup, HERO_MAP, {})
    attrs = _attrs_of(new)
    assert attrs["image"]["inner"] == {"url": "https://s.example/uploads/hero.webp", "id": 99}
    assert attrs["image"]["url"] == "assets/other.webp"
    assert stats["images_rewritten"] == 1 and stats["still_relative"] == ["assets/other.webp"]


def test_every_unmapped_relative_url_is_reported_not_only_the_first_one_of_each_nest() -> None:
    markup = _one_block({"a": {"url": "assets/1.webp", "id": 0, "b": {"url": "assets/2.webp", "alt": "", "c": {"url": "assets/3.webp", "id": 0}}}})
    _, stats = mod.rewrite_block_markup(markup, {}, {})
    assert stats["still_relative"] == ["assets/1.webp", "assets/2.webp", "assets/3.webp"]


def test_a_nested_image_object_is_also_collected_for_upload() -> None:
    slots = mod.collect_image_slots({"image": {"url": "a.webp", "id": 0, "inner": {"url": "b.webp", "id": 0}}}, {})
    assert [(s["path"], s["url"]) for s in slots] == [("image", "a.webp"), ("image.inner", "b.webp")]


def test_an_object_with_a_non_zero_id_is_an_attachment_reference_and_is_not_rewritten() -> None:
    """`{link: {url, id: 7}}` has the image-object shape; its id was clobbered 7 -> 99 by the old rewrite."""
    markup = _one_block({"link": {"url": HERO_URL, "id": 7}})
    new, stats = mod.rewrite_block_markup(markup, HERO_MAP, {})
    assert new == markup and stats["images_rewritten"] == 0 and stats["blocks_changed"] == 0
    assert stats["attachment_refs_kept"] == [HERO_URL] and stats["still_relative"] == [HERO_URL]


def test_negative_control_the_same_object_with_id_zero_is_rewritten() -> None:
    """The shape test above is only meaningful because the SAME object with id 0 (the converter's emit) is rewritten."""
    new, stats = mod.rewrite_block_markup(_one_block({"link": {"url": HERO_URL, "id": 0}}), HERO_MAP, {})
    assert _attrs_of(new)["link"] == {"url": "https://s.example/uploads/hero.webp", "id": 99}
    assert stats["images_rewritten"] == 1 and stats["attachment_refs_kept"] == []


def test_an_alt_only_object_and_a_null_id_are_still_rewritten() -> None:
    new, stats = mod.rewrite_block_markup(
        _one_block({"a": {"url": HERO_URL, "alt": "x"}, "b": {"url": HERO_URL, "id": None}}), HERO_MAP, {})
    assert stats["images_rewritten"] == 2 and new.count("https://s.example/uploads/hero.webp") == 2


def test_a_non_zero_id_object_is_not_collected_for_upload_but_is_reported_as_skipped() -> None:
    extracted = {"keep": {"url": HERO_URL, "id": 7}, "new": {"url": "assets/n.webp", "id": 0}}
    slots = mod.collect_image_slots(extracted, {})
    assert {s["url"]: s.get("attachment_id") for s in slots} == {HERO_URL: 7, "assets/n.webp": None}
    with tempfile.TemporaryDirectory() as tmp:
        draft = Path(tmp) / "draft" / "assets"
        draft.mkdir(parents=True)
        (draft / "hero.webp").write_bytes(b"1")
        (draft / "n.webp").write_bytes(b"2")
        secrets = Path(tmp) / "secrets"
        secrets.mkdir()
        (secrets / "fake.env").write_text("WP_URL_FAKE=https://s.example\nWP_USER_FAKE=u\nWP_APP_PWD_FAKE=p\n", encoding="utf-8")
        seen: list[str] = []

        def fake(file_path, wp_site, auth_header):
            seen.append(file_path.name)
            return {"id": 5, "source_url": f"{wp_site}/{file_path.name}"}, False

        report = mod.sideload_batch(extracted, mockup_root=draft.parent, upload=True, site="fake", secrets_dir=secrets,
                                    uploader=fake)
    assert seen == ["n.webp"] and [r["reason"] for r in report["skipped"]] == [
        "already an attachment reference (id 7); not uploaded and not rewritten"]


SCALAR = {"sgs/media": frozenset({"imageUrl"}), "core/cover": frozenset({"poster"})}


def test_a_scalar_media_attribute_is_rewritten_by_the_databases_list_of_them() -> None:
    markup = _one_block({"imageUrl": HERO_URL, "imageAlt": "x"}, "sgs/media")
    new, stats = mod.rewrite_block_markup(markup, HERO_MAP, SCALAR)
    assert _attrs_of(new) == {"imageUrl": "https://s.example/uploads/hero.webp", "imageAlt": "x"}
    assert stats["images_rewritten"] == 1 and stats["scalar_rewritten"] == 1 and stats["blocks_changed"] == 1


def test_negative_control_the_same_attribute_on_a_block_the_database_does_not_list_is_left_alone() -> None:
    """The set is per block: `imageUrl` on a block with no such media attribute is just a string."""
    markup = _one_block({"imageUrl": HERO_URL}, "sgs/other")
    new, stats = mod.rewrite_block_markup(markup, HERO_MAP, SCALAR)
    assert new == markup and stats["images_rewritten"] == 0 and stats["still_relative"] == []


def test_an_unmapped_scalar_media_path_is_counted_and_named_with_its_attribute() -> None:
    _, stats = mod.rewrite_block_markup(_one_block({"imageUrl": "assets/nope.webp"}, "sgs/media"), HERO_MAP, SCALAR)
    assert stats["still_relative"] == ["assets/nope.webp"]
    assert stats["still_relative_detail"] == ["sgs/media.imageUrl: assets/nope.webp"]


def test_a_core_block_is_matched_by_its_comment_name_without_the_namespace() -> None:
    new, stats = mod.rewrite_block_markup(_one_block({"poster": HERO_URL}, "cover"), HERO_MAP, SCALAR)
    assert _attrs_of(new)["poster"].startswith("https://s.example/") and stats["scalar_rewritten"] == 1


def test_a_scalar_media_attribute_inside_block_markup_is_collected_for_upload() -> None:
    extracted = {"block_markup": _one_block({"imageUrl": HERO_URL}, "sgs/media") + "\n" + _one_block({"imageUrl": "assets/o.webp"}, "sgs/other"),
                 "per_section_results": [{"block_markup": _one_block({"imageUrl": HERO_URL}, "sgs/media")}]}
    slots = mod.collect_image_slots(extracted, SCALAR)
    assert [s["url"] for s in slots] == [HERO_URL, HERO_URL]
    assert slots[0]["path"] == "block_markup.sgs/media.imageUrl"


def test_the_live_database_lists_the_scalar_media_attributes_it_calls_image_object_strings() -> None:
    scalar = mod.scalar_media_attrs()
    db = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
    if not db.exists():
        pytest.skip("needs the framework database")
    assert "imageUrl" in scalar.get("sgs/media", ()) and "logoUrl" in scalar.get("sgs/responsive-logo", ())
    assert "backgroundImage" not in scalar.get("sgs/hero", ())          # an OBJECT attribute: found by its shape instead
