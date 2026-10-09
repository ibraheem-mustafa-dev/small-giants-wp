#!/usr/bin/env python3
"""
Tests for plugins/sgs-blocks/scripts/provision-site-info-from-draft.py

Pure functions only: the placeholder filter, the never-overwrite rule, the conflict rule,
the handover reader and the table. The SSH calls are replaced by fakes (a FakeSite).
Run: python -m pytest scripts/tests/test_provision_site_info_from_draft.py
"""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "plugins/sgs-blocks/scripts/provision-site-info-from-draft.py"
spec = importlib.util.spec_from_file_location("provision_site_info", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def entry(key, address, ref="n1"):
    return {"owner": "site-info", "kind": "link", "key": key, "address": address, "ref": ref}


def rows_by_key(rows):
    return {(r["key"], r["address"]): r for r in rows}


class PlaceholderFilter(unittest.TestCase):
    def reason(self, key, address):
        return mod.address_problem(key, address)

    def test_good_instagram_passes(self):
        self.assertIsNone(self.reason("socials.instagram", "https://instagram.com/eyecarebham"))

    def test_your_page_segment_skipped(self):
        self.assertIn("placeholder", self.reason("socials.instagram", "https://instagram.com/yourpage"))

    def test_other_placeholder_segments_skipped(self):
        for seg in ("yourname", "yourbusiness", "username", "handle", "your-page", "@username"):
            with self.subTest(seg=seg):
                self.assertIsNotNone(self.reason("socials.facebook", f"https://facebook.com/{seg}"))

    def test_example_hosts_skipped(self):
        self.assertIn("example", self.reason("socials.facebook", "https://example.com/x"))
        self.assertIn("example", self.reason("socials.facebook", "https://www.example.org/x"))

    def test_javascript_and_data_skipped(self):
        self.assertIsNotNone(self.reason("socials.instagram", "javascript:alert(1)"))
        self.assertIsNotNone(self.reason("socials.instagram", "data:text/html;base64,AAAA"))
        self.assertIsNotNone(self.reason("phone", "javascript:alert(1)"))
        self.assertIsNotNone(self.reason("email", "data:text/plain,hi"))

    def test_hash_and_empty_skipped(self):
        self.assertIn("empty", self.reason("socials.instagram", ""))
        self.assertIn("empty", self.reason("socials.instagram", "   "))
        self.assertIn("empty", self.reason("socials.instagram", "#"))

    def test_bare_social_host_skipped(self):
        self.assertIn("no profile path", self.reason("socials.instagram", "https://instagram.com/"))
        self.assertIn("no profile path", self.reason("socials.instagram", "https://www.instagram.com"))

    def test_social_must_be_web_scheme(self):
        self.assertIsNotNone(self.reason("socials.instagram", "ftp://instagram.com/x"))
        self.assertIsNotNone(self.reason("socials.instagram", "mailto:a@b.co.uk"))
        self.assertIsNotNone(self.reason("socials.instagram", "tel:+441234567890"))

    def test_phone_and_email_schemes_allowed(self):
        self.assertIsNone(self.reason("phone", "tel:+44 121 729 8233"))
        self.assertIsNone(self.reason("email", "mailto:hello@eyecare.co.uk"))

    def test_placeholder_phone_and_email(self):
        self.assertIsNotNone(self.reason("phone", "tel:0000000000"))
        self.assertIsNotNone(self.reason("phone", "tel:"))
        self.assertIsNotNone(self.reason("email", "mailto:you@example.com"))
        self.assertIsNotNone(self.reason("email", "mailto:yourname@business.co.uk"))

    def test_whatsapp_needs_digits(self):
        self.assertIsNone(self.reason("socials.whatsapp", "https://wa.me/447123456789"))
        self.assertIsNotNone(self.reason("socials.whatsapp", "https://wa.me/"))
        self.assertIsNotNone(self.reason("socials.whatsapp", "https://wa.me/yournumber"))

    def test_control_characters_and_length_rejected(self):
        self.assertIn("control", self.reason("socials.instagram", "https://instagram.com/a\r\nX-Evil: 1"))
        self.assertIn("long", self.reason("socials.instagram", "https://instagram.com/" + "a" * 3000))

    def test_unknown_key_rejected(self):
        self.assertIn("not a Site Info key", self.reason("socials.myspace", "https://myspace.com/x"))
        self.assertIn("not a Site Info key", self.reason("sgs_framework_version", "1"))


class NormaliseValue(unittest.TestCase):
    def test_prefixes_stripped_for_phone_and_email(self):
        self.assertEqual(mod.stored_value("phone", "tel:0121 729 8233"), "0121 729 8233")
        self.assertEqual(mod.stored_value("email", "mailto:hello@eyecare.co.uk?subject=Hi"), "hello@eyecare.co.uk")

    def test_social_url_kept(self):
        self.assertEqual(mod.stored_value("socials.instagram", " https://instagram.com/eyecare "), "https://instagram.com/eyecare")


class Planning(unittest.TestCase):
    def test_good_address_is_proposed(self):
        rows = mod.plan([entry("socials.instagram", "https://instagram.com/eyecarebham")], {})
        self.assertEqual(rows[0]["action"], "WRITE")
        self.assertEqual(rows[0]["value"], "https://instagram.com/eyecarebham")

    def test_filled_key_is_never_overwritten(self):
        current = {"socials.instagram": "https://instagram.com/already"}
        rows = mod.plan([entry("socials.instagram", "https://instagram.com/different")], current)
        self.assertEqual(rows[0]["action"], "SKIP")
        self.assertIn("already set", rows[0]["reason"])

    def test_whitespace_only_current_counts_as_empty(self):
        rows = mod.plan([entry("socials.instagram", "https://instagram.com/eyecare")], {"socials.instagram": "  "})
        self.assertEqual(rows[0]["action"], "WRITE")

    def test_placeholder_skipped_in_plan(self):
        rows = mod.plan([entry("socials.instagram", "https://instagram.com/yourpage")], {})
        self.assertEqual(rows[0]["action"], "SKIP")
        self.assertIn("placeholder", rows[0]["reason"])

    def test_conflicting_entries_both_skipped(self):
        rows = mod.plan([entry("socials.facebook", "https://facebook.com/a", "n1"),
                         entry("socials.facebook", "https://facebook.com/b", "n2")], {})
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(r["action"] == "SKIP" and "conflicting addresses" in r["reason"] for r in rows))

    def test_identical_duplicates_collapse_to_one_write(self):
        rows = mod.plan([entry("phone", "tel:0121 729 8233", "n1"), entry("phone", "tel:0121 729 8233", "n2")], {})
        self.assertEqual([r["action"] for r in rows], ["WRITE"])
        self.assertEqual(rows[0]["refs"], ["n1", "n2"])

    def test_placeholder_does_not_block_a_good_sibling(self):
        rows = mod.plan([entry("socials.facebook", "#", "n1"), entry("socials.facebook", "https://facebook.com/eyecare", "n2")], {})
        actions = {r["address"]: r["action"] for r in rows}
        self.assertEqual(actions, {"#": "SKIP", "https://facebook.com/eyecare": "WRITE"})


class HandoverReader(unittest.TestCase):
    def write(self, data):
        d = tempfile.mkdtemp()
        p = Path(d) / "handover.json"
        p.write_text(json.dumps(data), encoding="utf-8")
        return p

    def test_new_shape_read_and_extras_tolerated(self):
        p = self.write([entry("phone", "tel:0121 729 8233") | {"extra": 1}, {"owner": "product-data", "kind": "text"}])
        got, ignored = mod.read_entries([p])
        self.assertEqual([(e["key"], e["address"], e["ref"]) for e in got], [("phone", "tel:0121 729 8233", "n1")])
        self.assertEqual(ignored, 1)

    def test_current_pipeline_shape_reads_evidence(self):
        real = {"owner": "site-info", "kind": "link", "node": "header.0", "block": "sgs/icon", "slot": "href",
                "evidence": {"kind": "link", "key": "socials.instagram", "draft": "https://instagram.com/eyecare", "ref": "header.0", "path": "href"},
                "reason": "x"}
        got, _ = mod.read_entries([self.write([real])])
        self.assertEqual((got[0]["key"], got[0]["address"], got[0]["ref"]), ("socials.instagram", "https://instagram.com/eyecare", "header.0"))

    def test_entry_without_key_is_ignored(self):
        got, ignored = mod.read_entries([self.write([{"owner": "site-info", "kind": "text", "evidence": {"draft": "Hello"}}])])
        self.assertEqual((got, ignored), ([], 1))

    def test_object_wrapper_accepted(self):
        got, _ = mod.read_entries([self.write({"handover": [entry("phone", "tel:0121 729 8233")]})])
        self.assertEqual(len(got), 1)


class Table(unittest.TestCase):
    def test_table_lists_every_row(self):
        rows = mod.plan([entry("socials.instagram", "https://instagram.com/eyecare"),
                         entry("socials.facebook", "https://example.com/x"),
                         entry("phone", "tel:0121 729 8233")], {"phone": "0121 000 0000"})
        text = mod.format_table(rows)
        self.assertIn("key", text.splitlines()[0])
        self.assertIn("WRITE", text)
        self.assertIn("SKIP (already set)", text)
        self.assertIn("SKIP (placeholder host example.com)", text)
        self.assertIn("0121 000 0000", text)


class FakeSite:
    """Stands in for the SSH site: an in-memory option, set() sanitising by stripping spaces."""

    def __init__(self, option, refuse=()):
        self.option, self.refuse, self.writes = dict(option), set(refuse), []

    def read_option(self):
        return json.loads(json.dumps(self.option))

    def read_values(self, keys):
        return {k: self.option.get(k, "") for k in keys}

    def write_values(self, values):
        self.writes.append(dict(values))
        out = {}
        for key, value in values.items():
            ok = key not in self.refuse
            if ok:
                self.option[key] = value
            out[key] = {"ok": ok, "value": self.option.get(key, "")}
        return out


class Apply(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())

    def rows(self):
        return mod.plan([entry("socials.instagram", "https://instagram.com/eyecare")], {})

    def test_backup_written_before_write_with_md5(self):
        site = FakeSite({"phone": "0121 729 8233"})
        report = mod.apply_rows(site, "eye-care-test", self.rows(), self.dir, "2026-10-09")
        backup = self.dir / "2026-10-09" / "eye-care-test" / "sgs_site_info.json"
        raw = backup.read_bytes()
        self.assertEqual(json.loads(raw), {"phone": "0121 729 8233"})
        self.assertNotIn(b"\r", raw)
        self.assertEqual(report["backup_md5"], hashlib.md5(raw).hexdigest())
        self.assertEqual(site.option["socials.instagram"], "https://instagram.com/eyecare")

    def test_readback_difference_fails_loudly(self):
        site = FakeSite({}, refuse={"socials.instagram"})
        with self.assertRaises(mod.ApplyError):
            mod.apply_rows(site, "eye-care-test", self.rows(), self.dir, "2026-10-09")

    def test_nothing_to_write_writes_nothing(self):
        site = FakeSite({"socials.instagram": "https://instagram.com/a"})
        rows = mod.plan([entry("socials.instagram", "https://instagram.com/b")], site.option)
        mod.apply_rows(site, "eye-care-test", rows, self.dir, "2026-10-09")
        self.assertEqual(site.writes, [])
        self.assertFalse((self.dir / "2026-10-09").exists())

    def test_existing_keys_untouched_after_apply(self):
        site = FakeSite({"phone": "0121 729 8233"})
        mod.apply_rows(site, "eye-care-test", self.rows(), self.dir, "2026-10-09")
        self.assertEqual(site.option["phone"], "0121 729 8233")


if __name__ == "__main__":
    unittest.main()
