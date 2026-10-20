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

    def __init__(self, option, refuse=(), wp_options=None):
        self.option, self.refuse, self.writes = dict(option), set(refuse), []
        self.wp_options, self.wp_writes = dict(wp_options or {}), []

    def read_wp_options(self, keys):
        return {k: self.wp_options.get(k, "") for k in keys}

    def write_wp_options(self, values):
        self.wp_writes.append(dict(values))
        out = {}
        for key, value in values.items():
            ok = key in ("blogname", "blogdescription")
            if ok:
                self.wp_options[key] = value
            out[key] = {"ok": ok, "value": self.wp_options.get(key, "")}
        return out

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


def intake_file(rows, review):
    p = Path(tempfile.mkdtemp()) / "intake.json"
    p.write_text(json.dumps({"siteInfo": {"rows": rows, "refused": []}, "review": review}), encoding="utf-8")
    return p


def si_row(row_id, key, value, normalised=None):
    return {"rowId": row_id, "key": key, "value": value, "normalised": value if normalised is None else normalised,
            "sources": [], "valid": True, "reason": None}


def mark(row_id, value):
    return {"rowId": row_id, "rowType": "site-info", "contentHash": "x", "mark": value}


class IntakeInput(unittest.TestCase):
    """--intake: only marked rows reach the handover; drop and unmarked rows never do; edit replaces the value."""

    def read(self, rows, review):
        return mod.site_info_intake.read_intake(intake_file(rows, review))

    def test_accept_uses_row_value_and_email_normalised(self):
        entries, refused = self.read(
            [si_row("siteinfo:phone", "phone", "0121 771 4330", "01217714330"),
             si_row("siteinfo:email", "email", "Amir@Indus.com ", "amir@indus.com")],
            [mark("siteinfo:phone", "accept"), mark("siteinfo:email", "accept")])
        self.assertEqual({e["key"]: e["address"] for e in entries}, {"phone": "0121 771 4330", "email": "amir@indus.com"})
        self.assertEqual(refused, [])

    def test_edit_mark_replaces_the_value(self):
        entries, _ = self.read([si_row("siteinfo:socials.google", "socials.google", "https://www.google.com/maps/dir/?api=1")],
                               [mark("siteinfo:socials.google", "edit:https://share.google/abc123")])
        self.assertEqual([(e["key"], e["address"]) for e in entries], [("socials.google", "https://share.google/abc123")])

    def test_dropped_row_never_reaches_the_handover(self):
        entries, refused = self.read(
            [si_row("siteinfo:address#1", "address", "55-58 Stratford St N"), si_row("siteinfo:address#2", "address", "55-58 Stratford Street North")],
            [mark("siteinfo:address#1", "accept"), mark("siteinfo:address#2", "drop")])
        self.assertEqual([e["address"] for e in entries], ["55-58 Stratford St N"])
        self.assertEqual([(r["rowId"], r["reason"]) for r in refused], [("siteinfo:address#2", "dropped in review")])

    def test_unmarked_and_missing_rows_are_refused(self):
        entries, refused = self.read(
            [si_row("siteinfo:phone", "phone", "0121 771 4330"), si_row("siteinfo:email", "email", "a@indus.com"),
             si_row("siteinfo:copyright", "copyright", "(c) 2026 Indus")],
            [mark("siteinfo:phone", None), mark("siteinfo:email", "  ")])
        self.assertEqual(entries, [])
        self.assertEqual({r["rowId"]: r["reason"] for r in refused}, {
            "siteinfo:phone": "not marked in review", "siteinfo:email": "not marked in review",
            "siteinfo:copyright": "no review entry"})

    def test_other_row_types_marks_do_not_count(self):
        entries, refused = self.read([si_row("siteinfo:phone", "phone", "0121 771 4330")],
                                     [{"rowId": "siteinfo:phone", "rowType": "palette", "mark": "accept"}])
        self.assertEqual((entries, refused[0]["reason"]), ([], "no review entry"))

    def test_unknown_mark_and_empty_edit_refused(self):
        entries, refused = self.read([si_row("a", "phone", "0121 771 4330"), si_row("b", "email", "a@indus.com")],
                                     [mark("a", "maybe"), mark("b", "edit:  ")])
        self.assertEqual(entries, [])
        self.assertIn("unknown review mark", refused[0]["reason"])
        self.assertIn("no value", refused[1]["reason"])

    def test_hours_keys_map_to_site_info_days(self):
        entries, _ = self.read([si_row("h1", "hours.monday", "09:30–17:00"), si_row("h2", "hours.sunday", "closed")],
                               [mark("h1", "accept"), mark("h2", "accept")])
        self.assertEqual([e["key"] for e in entries], ["opening_hours.mon", "opening_hours.sun"])
        rows = mod.plan(entries, {})
        self.assertEqual([r["action"] for r in rows], ["WRITE", "WRITE"])

    def test_missing_site_info_section_raises(self):
        p = Path(tempfile.mkdtemp()) / "intake.json"
        p.write_text(json.dumps({"review": []}), encoding="utf-8")
        with self.assertRaises(ValueError):
            mod.site_info_intake.read_intake(p)


class SetInput(unittest.TestCase):
    def test_set_builds_an_entry_and_maps_url_is_writable(self):
        entries = mod.site_info_intake.parse_sets(["maps_url=https://maps.app.goo.gl/JV4nsGnV4EkxMoz36"])
        self.assertEqual(entries[0]["key"], "maps_url")
        self.assertEqual(mod.plan(entries, {})[0]["action"], "WRITE")

    def test_malformed_set_raises(self):
        for item in ("maps_url", "=x", "maps_url="):
            with self.subTest(item=item), self.assertRaises(ValueError):
                mod.site_info_intake.parse_sets([item])

    def test_new_keys_validated(self):
        self.assertIsNotNone(mod.address_problem("maps_url", "javascript:alert(1)"))
        self.assertIsNotNone(mod.address_problem("maps_url", "https://example.com/x"))
        self.assertIsNotNone(mod.address_problem("copyright", "javascript:alert(1)"))
        self.assertIsNotNone(mod.address_problem("opening_hours.mon", "9-5\r\nX"))
        self.assertIsNone(mod.address_problem("copyright", "© 2026 Indus Foods Ltd"))
        self.assertIn("not a Site Info key", mod.address_problem("opening_hours.monday", "9-5"))


def opt(key, address, ref="t1"):
    return {"owner": "wp-option", "kind": "text", "key": key, "address": address, "ref": ref}


class WpOptions(unittest.TestCase):
    """Owner wp-option: blogname and blogdescription, written when they differ from the current option."""

    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())

    def test_differing_option_is_write(self):
        rows = mod.plan([opt("blogname", "Eye Care Ward End")], {}, {"blogname": "My WordPress Site"})
        self.assertEqual((rows[0]["action"], rows[0]["value"], rows[0]["current"]), ("WRITE", "Eye Care Ward End", "My WordPress Site"))
        self.assertIn("option:blogname", mod.format_table(rows))

    def test_equal_option_is_skip(self):
        rows = mod.plan([opt("blogname", "Eye Care Ward End")], {}, {"blogname": "Eye Care Ward End"})
        self.assertEqual((rows[0]["action"], rows[0]["reason"]), ("SKIP", "already set"))

    def test_option_stored_escaped_is_already_set(self):
        # sanitize_option() stores blogname HTML-escaped, so a rerun compares the confirmed text with the unescaped option.
        rows = mod.plan([opt("blogname", "Mama's Munches & Co")], {}, {"blogname": "Mama&#039;s Munches &amp; Co"})
        self.assertEqual((rows[0]["action"], rows[0]["reason"]), ("SKIP", "already set"))

    def test_control_characters_are_skipped(self):
        rows = mod.plan([opt("blogname", "Eye Care\r\nBcc: x@evil.test")], {}, {"blogname": "My WordPress Site"})
        self.assertEqual(rows[0]["action"], "SKIP")
        self.assertIn("control", rows[0]["reason"])

    def test_unknown_option_is_refused(self):
        rows = mod.plan([opt("siteurl", "https://evil.test")], {}, {})
        self.assertEqual(rows[0]["action"], "SKIP")
        self.assertIn("not a WordPress option", rows[0]["reason"])

    def test_empty_long_and_scheme_values_are_skipped(self):
        for value in ("   ", "x" * 301, "javascript:alert(1)", "https://example.com"):
            with self.subTest(value=value[:20]):
                self.assertIsNotNone(mod.wp_option_problem("blogdescription", value))

    def test_two_different_values_conflict(self):
        rows = mod.plan([opt("blogname", "A", "t1"), opt("blogname", "B", "t2")], {}, {"blogname": "Old"})
        self.assertTrue(all(r["action"] == "SKIP" and "conflicting addresses" in r["reason"] for r in rows))

    def test_reader_keeps_both_owners_and_carries_the_owner(self):
        p = Path(tempfile.mkdtemp()) / "handover.json"
        p.write_text(json.dumps([entry("phone", "tel:0121 729 8233"), opt("blogname", "Eye Care")]), encoding="utf-8")
        got, ignored = mod.read_entries([p])
        self.assertEqual([(e["owner"], e["key"]) for e in got], [("site-info", "phone"), ("wp-option", "blogname")])
        self.assertEqual(ignored, 0)

    def test_apply_backs_up_writes_and_reads_back(self):
        site = FakeSite({"phone": "0121 729 8233"}, wp_options={"blogname": "My WordPress Site", "blogdescription": "Just another site"})
        rows = mod.plan([opt("blogname", "Eye Care Ward End"), opt("blogdescription", "Opticians in Birmingham")],
                        {}, site.wp_options)
        report = mod.apply_rows(site, "eye-care-test", rows, self.dir, "2026-10-20")
        backup = self.dir / "2026-10-20" / "eye-care-test" / "wp_options.json"
        raw = backup.read_bytes()
        self.assertEqual(json.loads(raw), {"blogname": "My WordPress Site", "blogdescription": "Just another site"})
        self.assertEqual(report["wp_backup_md5"], hashlib.md5(raw).hexdigest())
        self.assertEqual(site.wp_options, {"blogname": "Eye Care Ward End", "blogdescription": "Opticians in Birmingham"})
        self.assertEqual(site.writes, [])
        self.assertFalse((self.dir / "2026-10-20" / "eye-care-test" / "sgs_site_info.json").exists())
        self.assertIsNone(report["backup"])

    def test_mixed_apply_does_not_trip_the_site_info_diff_check(self):
        site = FakeSite({"phone": "0121 729 8233"}, wp_options={"blogname": "My WordPress Site"})
        rows = mod.plan([entry("tagline", "Opticians in Birmingham"), opt("blogname", "Eye Care")], {}, site.wp_options)
        report = mod.apply_rows(site, "eye-care-test", rows, self.dir, "2026-10-20")
        self.assertEqual(site.option["tagline"], "Opticians in Birmingham")
        self.assertEqual(site.wp_options["blogname"], "Eye Care")
        self.assertTrue(report["backup"] and report["wp_backup"])

    def test_option_write_mismatch_raises(self):
        class Refusing(FakeSite):
            def write_wp_options(self, values):
                return {k: {"ok": False, "value": ""} for k in values}
        site = Refusing({}, wp_options={"blogname": "Old"})
        rows = mod.plan([opt("blogname", "New")], {}, site.wp_options)
        with self.assertRaises(mod.ApplyError):
            mod.apply_rows(site, "eye-care-test", rows, self.dir, "2026-10-20")


class TaglineAndIntakeOptions(unittest.TestCase):
    def test_site_info_tagline_already_set_is_skip(self):
        rows = mod.plan([entry("tagline", "New line")], {"tagline": "Existing line"})
        self.assertEqual((rows[0]["action"], rows[0]["reason"]), ("SKIP", "already set"))

    def test_site_info_tagline_is_written_when_empty(self):
        self.assertEqual(mod.plan([entry("tagline", "New line")], {})[0]["action"], "WRITE")

    def test_intake_tagline_yields_site_info_and_option_entries(self):
        entries, refused = mod.site_info_intake.read_intake(intake_file(
            [si_row("siteinfo:tagline", "tagline", "Opticians in Birmingham"), si_row("siteinfo:site_title", "site_title", "Eye Care Ward End")],
            [mark("siteinfo:tagline", "accept"), mark("siteinfo:site_title", "edit:Eye Care")]))
        self.assertEqual(refused, [])
        self.assertEqual([(e["owner"], e["key"], e["address"]) for e in entries], [
            ("site-info", "tagline", "Opticians in Birmingham"),
            ("wp-option", "blogdescription", "Opticians in Birmingham"),
            ("wp-option", "blogname", "Eye Care")])

    def test_intake_tagline_unmarked_or_dropped_yields_nothing(self):
        entries, refused = mod.site_info_intake.read_intake(intake_file(
            [si_row("a", "tagline", "x"), si_row("b", "site_title", "y")], [mark("b", "drop")]))
        self.assertEqual(entries, [])
        self.assertEqual({r["rowId"]: r["key"] for r in refused}, {"a": "tagline", "b": "blogname"})


if __name__ == "__main__":
    unittest.main()


def test_intake_day_names_map_exactly_and_ranges_do_not():
    from site_info_intake import site_info_key
    assert site_info_key("hours.monday") == "opening_hours.mon"
    assert site_info_key("hours.sun") == "opening_hours.sun"
    # A range or plural must not land on Monday alone (QC council 2026-10-19).
    assert site_info_key("hours.mon-fri") == "hours.mon-fri"
    assert site_info_key("hours.mondays") == "hours.mondays"


def test_intake_duplicate_marks_are_refused(tmp_path):
    from site_info_intake import read_intake
    import json as _json
    import pytest as _pytest
    f = tmp_path / "intake.json"
    f.write_text(_json.dumps({"siteInfo": {"rows": [{"rowId": "siteinfo:phone", "key": "phone", "value": "0121 771 4330"}]},
                              "review": [{"rowId": "siteinfo:phone", "rowType": "site-info", "mark": "accept"},
                                         {"rowId": "siteinfo:phone", "rowType": "site-info", "mark": "drop"}]}), encoding="utf-8")
    with _pytest.raises(ValueError):
        read_intake(f)
