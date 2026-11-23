#!/usr/bin/env python3
"""Tests for mirror_precheck.py: the old-shape audit and the media check run on a mirror before push-to-remote.sh copies it.

Run: python -m pytest scripts/local-wp/test_mirror_precheck.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mirror_precheck as mp  # noqa: E402

REPO = Path(__file__).resolve().parents[2]


def test_referenced_attachment_ids_from_classes_and_block_attributes():
    posts = [{"ID": 10, "post_content": '<!-- wp:sgs/hero {"mediaId":55,"columns":3} --><img class="wp-image-77" src="x"/>'}]
    assert mp.referenced_attachment_ids(posts, {55, 77, 3, 99}) == {55, 77}


def test_a_number_that_is_not_an_id_key_is_not_a_reference():
    posts = [{"ID": 10, "post_content": '<!-- wp:sgs/x {"columns":3,"width":55} -->'}]
    assert mp.referenced_attachment_ids(posts, {3, 55}) == set()


def test_missing_media_names_the_attachment_the_post_and_the_file():
    posts = [{"ID": 10, "post_content": '<!-- wp:sgs/hero {"mediaId":55} -->'}]
    attachments = {55: "2026/11/a.jpg", 56: "2026/11/b.jpg"}
    assert mp.missing_media(posts, attachments, {}, {"2026/11/b.jpg"}) == ["post 10 uses attachment 55: uploads/2026/11/a.jpg is missing"]
    assert mp.missing_media(posts, attachments, {}, {"2026/11/a.jpg"}) == []


def test_a_featured_image_counts_and_an_attachment_with_no_file_record_is_reported():
    posts = [{"ID": 10, "post_content": ""}, {"ID": 11, "post_content": '<img class="wp-image-60">'}]
    attachments = {55: "a.jpg", 60: ""}
    problems = mp.missing_media([posts[0]], attachments, {10: 55}, set())
    assert problems == ["post 10 uses attachment 55: uploads/a.jpg is missing"]
    assert mp.missing_media([posts[1]], attachments, {}, set()) == ["post 11 uses attachment 60: it has no file record"]


def test_an_uploads_url_in_content_must_exist():
    posts = [{"ID": 10, "post_content": '<img src="http://localhost:8081/wp-content/uploads/2026/11/c.png"><img src="/wp-content/uploads/d.png">'}]
    assert mp.missing_media(posts, {}, {}, {"d.png"}) == ["post 10 links /wp-content/uploads/2026/11/c.png: the file is missing"]


def test_parse_posts_skips_warning_noise_before_the_json():
    assert mp.parse_posts('Warning: x\n[{"ID":1,"post_content":"a"}]') == [{"ID": 1, "post_content": "a"}]


def test_audit_refuses_a_high_finding_and_passes_clean_content(tmp_path):
    # A block the schema does not declare an attribute for is a HIGH undeclared-attr finding; plain text is clean.
    bad = [{"ID": 1, "post_content": '<!-- wp:sgs/hero {"thisAttributeDoesNotExistAnywhere":"x"} /-->'}]
    clean = [{"ID": 2, "post_content": "<p>hello</p>"}]
    assert mp.run_audit(bad, "eye-care-clone-test", tmp_path / "bad") != 0
    assert mp.run_audit(clean, "eye-care-clone-test", tmp_path / "clean") == 0


def test_a_srcset_entry_is_read_without_its_descriptor():
    content = '<img srcset="https://s.test/wp-content/uploads/2026/a.jpg 300w, https://s.test/wp-content/uploads/2026/a-768.jpg 768w">'
    posts = [{"ID": 5, "post_content": content}]
    assert mp.missing_media(posts, {}, {}, {"2026/a.jpg", "2026/a-768.jpg"}) == []
    assert mp.missing_media(posts, {}, {}, {"2026/a.jpg"}) == ["post 5 links /wp-content/uploads/2026/a-768.jpg: the file is missing"]


def test_a_query_string_a_fragment_and_a_css_url_end_the_uploads_path():
    content = '<img src="/wp-content/uploads/b.png?ver=3"><a href="/wp-content/uploads/c.pdf#page=2">x</a><div style="background:url(/wp-content/uploads/d.webp)">'
    posts = [{"ID": 5, "post_content": content}]
    assert mp.missing_media(posts, {}, {}, {"b.png", "c.pdf", "d.webp"}) == []


def test_a_percent_encoded_uploads_url_is_compared_decoded():
    posts = [{"ID": 5, "post_content": '<img src="/wp-content/uploads/2026/my%20photo.jpg">'}]
    assert mp.missing_media(posts, {}, {}, {"2026/my photo.jpg"}) == []
    assert mp.missing_media(posts, {}, {}, set()) == ["post 5 links /wp-content/uploads/2026/my photo.jpg: the file is missing"]


def test_a_term_or_user_id_is_not_an_attachment_reference():
    posts = [{"ID": 6, "post_content": '<!-- wp:sgs/archive {"termId":7,"userId":8,"productId":9} -->'}]
    assert mp.referenced_attachment_ids(posts, {7, 8, 9}) == set()
    assert mp.missing_media(posts, {7: "2026/zz.jpg"}, {}, set()) == []


def test_media_ids_are_read_from_media_named_attributes_and_media_objects():
    content = (
        '<!-- wp:sgs/audio {"audioId":21} /-->'
        '<!-- wp:sgs/hero {"heroImageId":22,"backgroundImage":{"url":"https://s.test/wp-content/uploads/a.jpg","id":23,"alt":"x"}} /-->'
        '<!-- wp:cover {"url":"https://s.test/wp-content/uploads/b.jpg","id":24} /-->'
        '<!-- wp:navigation-link {"id":25,"url":"https://s.test/about/"} /-->'
    )
    posts = [{"ID": 6, "post_content": content}]
    assert mp.referenced_attachment_ids(posts, {21, 22, 23, 24, 25}) == {21, 22, 23, 24}
