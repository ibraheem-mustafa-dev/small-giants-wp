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
