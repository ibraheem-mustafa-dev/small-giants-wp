"""Spec 31 Phase 5b.5 self-test for media-sideload.py.

Plan contract: sideload a known PNG from Mama's mockup; assert attachment
id + URL returned + writable to the block.json attr. We can't actually
POST to live WP in CI, so this test covers:
  - collect_image_slots walks the tree + returns shape (path, url, alt)
  - dry-run mode lists slots without POSTing
  - env-cred parsing reads SGS_WP_USER + SGS_WP_APP_PASSWORD
  - upload error handling on a fake-mocked POST (network-free)
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "media_sideload", HERE / "media-sideload.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def sample_extract() -> dict:
    """Mirrors the structure extract.py emits for the hero block."""
    return {
        "extracted_attributes": {
            "headline": "Made for mums",
            "splitImage": {
                "id": None,
                "url": "research/photography/img.webp",
                "alt": "Cookies",
            },
            "splitImageMobile": {
                "id": None,
                "url": "research/photography/mobile.jpeg",
                "alt": "Mobile",
            },
        }
    }


def test_collect_image_slots_walks_tree() -> None:
    slots = mod.collect_image_slots(sample_extract())
    paths = {s["path"] for s in slots}
    assert "extracted_attributes.splitImage" in paths, f"got {paths}"
    assert "extracted_attributes.splitImageMobile" in paths, f"got {paths}"
    assert all("url" in s and "alt" in s for s in slots)
    print(f"  PASS  collect-image-slots: {len(slots)} slot(s), structure correct")


def test_dry_run_no_network() -> None:
    """Dry-run mode must NOT touch the network OR require creds."""
    report = mod.sideload_batch(
        sample_extract(),
        mockup_root=Path("/nonexistent-root"),  # mockup_root unused in dry-run
        upload=False,
        env_path=Path("/nonexistent-env"),       # env unused in dry-run
    )
    assert report["mode"] == "dry-run"
    assert report["slots_found"] == 2
    assert len(report["skipped"]) == 2
    assert not report["uploaded"]
    assert not report["errors"]
    print("  PASS  dry-run-no-network: 2 slots inventoried, no POST attempted")


def test_env_creds_parsing() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        env = Path(tmp) / ".env"
        env.write_text(
            "# comment\n"
            "SGS_WP_USER=Claude\n"
            'SGS_WP_APP_PASSWORD="abcd efgh ijkl mnop"\n'
            "OTHER_VAR=ignored\n",
            encoding="utf-8",
        )
        user, pw = mod._read_env_creds(env)
        assert user == "Claude", f"user wrong: {user}"
        assert pw == "abcd efgh ijkl mnop", f"pw wrong: {pw}"
    print("  PASS  env-creds: SGS_WP_USER + SGS_WP_APP_PASSWORD parsed (incl. quoted spaces)")


def test_env_creds_missing_raises() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        env = Path(tmp) / "empty.env"
        env.write_text("# nothing useful\n", encoding="utf-8")
        try:
            mod._read_env_creds(env)
        except mod.SideloadError as e:
            assert "SGS_WP_USER" in str(e)
        else:
            raise AssertionError("missing creds must raise SideloadError")
    print("  PASS  env-creds-missing: SideloadError raised when creds absent")


def test_basic_auth_header_well_formed() -> None:
    hdr = mod._basic_auth_header("Claude", "x y z")
    assert hdr.startswith("Basic "), f"header malformed: {hdr}"
    import base64
    decoded = base64.b64decode(hdr.split()[1]).decode("ascii")
    assert decoded == "Claude:x y z"
    print("  PASS  basic-auth-header: round-trips correctly")


def test_path_traversal_blocked() -> None:
    """Url containing `../` that resolves OUTSIDE mockup_root must be rejected
    as an error, not allowed to read arbitrary host files."""
    with tempfile.TemporaryDirectory() as tmp:
        env = Path(tmp) / ".env"
        env.write_text("SGS_WP_USER=u\nSGS_WP_APP_PASSWORD=p\n", encoding="utf-8")
        mockup_root = Path(tmp) / "mockup"
        mockup_root.mkdir()
        extract = {
            "extracted_attributes": {
                "evil": {"id": None, "url": "../../../../etc/passwd", "alt": "x"},
            }
        }
        report = mod.sideload_batch(
            extract, mockup_root=mockup_root, upload=True, env_path=env,
        )
        assert len(report["errors"]) == 1
        assert "escapes mockup_root" in report["errors"][0]["reason"], (
            f"traversal not blocked: {report}"
        )
        assert not report["uploaded"]
    print("  PASS  path-traversal-blocked: ../ escape rejected with explicit error")


def test_local_file_not_found_recorded_as_error() -> None:
    """Upload mode against a non-existent local file should produce an error row
    (no network call -- _upload_one raises before urlopen)."""
    with tempfile.TemporaryDirectory() as tmp:
        env = Path(tmp) / ".env"
        env.write_text("SGS_WP_USER=u\nSGS_WP_APP_PASSWORD=p\n", encoding="utf-8")
        report = mod.sideload_batch(
            sample_extract(),
            mockup_root=Path(tmp),  # files don't exist under tmp -> error per slot
            upload=True, env_path=env,
        )
        assert report["mode"] == "upload"
        assert len(report["errors"]) == 2, f"expected 2 errors, got {report['errors']}"
        assert all("not found" in e["reason"].lower() for e in report["errors"])
    print("  PASS  local-file-not-found: handled as per-slot error, batch continues")


# ---------------------------------------------------------------------------
# Group A (2026-09-21): draft-dir root, dedupe by resolved path, deploy-site env,
# reuse-not-reupload. All network-free: a fake uploader stands in for WordPress.
# ---------------------------------------------------------------------------
import os  # noqa: E402
from contextlib import contextmanager  # noqa: E402

BRANDS = [f"brand-{i:02d}.jpg" for i in range(16)]


def _make_draft(tmp: str) -> Path:
    """A draft folder with 16 real files under assets/brands/ (the Eye Care shape)."""
    draft = Path(tmp) / "draft"
    (draft / "assets" / "brands").mkdir(parents=True)
    for name in BRANDS:
        (draft / "assets" / "brands" / name).write_bytes(b"\xff\xd8fake-" + name.encode())
    return draft


def _logos() -> list[dict]:
    """32 logos over 16 files: the draft's marquee lists every brand twice."""
    return [
        {"media": {"alt": name, "id": 0, "url": f"assets/brands/{name}"}}
        for _ in range(2) for name in BRANDS
    ]


def eye_care_extract() -> dict:
    """The same 32 logos at the SIX places extract.json repeats them (192 slots)."""
    return {
        "extracted_attributes": {
            "brand-marquee": {"logos": _logos(), "brand-strip": {"logos": _logos()}},
        },
        "per_section_results": [{
            "extracted_attributes": {"logos": _logos(), "brand-strip": {"logos": _logos()}},
            "supports_emitted_attributes": {"logos": _logos(), "brand-strip": {"logos": _logos()}},
        }],
    }


class FakeUploader:
    """Stands in for _upload_one_idempotent: records calls, hands out fresh ids."""

    def __init__(self) -> None:
        self.calls: list[str] = []
        self.sites: set[str] = set()
        self.auths: set[str] = set()

    def __call__(self, file_path: Path, wp_site: str, auth_header: str):
        if not file_path.is_file():  # the real uploader raises this before any network call
            raise mod.SideloadError(f"media file not found: {file_path}")
        self.calls.append(file_path.name)
        self.sites.add(wp_site)
        self.auths.add(auth_header)
        n = len(self.calls)
        return {"id": 500 + n, "source_url": f"{wp_site}/wp-content/uploads/{file_path.name}"}, False


def _write_site_env(secrets: Path, site: str, url: str, user: str, pwd: str) -> None:
    key = mod.site_key_for(site)
    secrets.mkdir(parents=True, exist_ok=True)
    (secrets / f"{site}.env").write_text(
        f"WP_URL_{key}={url}\nWP_USER_{key}={user}\nWP_APP_PWD_{key}={pwd}\n", encoding="utf-8"
    )


@contextmanager
def _environ(**changes: str | None):
    saved = {k: os.environ.get(k) for k in changes}
    try:
        for k, v in changes.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        yield
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def test_dedupe_192_slots_to_16_uploads() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        draft = _make_draft(tmp)
        secrets = Path(tmp) / "secrets"
        _write_site_env(secrets, "fake-site", "https://fake.example", "u", "p")
        fake = FakeUploader()
        report = mod.sideload_batch(
            eye_care_extract(), mockup_root=draft, upload=True,
            site="fake-site", secrets_dir=secrets, uploader=fake,
        )
        assert report["slots_found"] == 192, report["slots_found"]
        assert report["unique_files"] == 16, report["unique_files"]
        assert len(fake.calls) == 16 and len(set(fake.calls)) == 16, fake.calls
        assert len(report["uploaded"]) == 16 and not report["errors"]
        assert all(row["occurrences"] == 12 for row in report["uploaded"]), report["uploaded"][0]
        assert all(len(row["slot_paths"]) == 12 for row in report["uploaded"])
        assert len(report["url_map"]) == 16
        entry = report["url_map"]["assets/brands/brand-03.jpg"]
        assert entry["source_url"] == "https://fake.example/wp-content/uploads/brand-03.jpg"
        assert isinstance(entry["attachment_id"], int)
    print("  PASS  dedupe: 192 slots -> 16 unique files -> 16 uploads, per-occurrence bookkeeping kept")


def test_two_url_spellings_of_one_file_upload_once() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        draft = _make_draft(tmp)
        secrets = Path(tmp) / "secrets"
        _write_site_env(secrets, "fake-site", "https://fake.example", "u", "p")
        extract = {"a": {"id": 0, "alt": "x", "url": "assets/brands/brand-00.jpg"},
                   "b": {"id": 0, "alt": "y", "url": "./assets/brands/../brands/brand-00.jpg"}}
        fake = FakeUploader()
        report = mod.sideload_batch(extract, mockup_root=draft, upload=True,
                                    site="fake-site", secrets_dir=secrets, uploader=fake)
        assert len(fake.calls) == 1 and report["unique_files"] == 1
        assert set(report["url_map"]) == {"assets/brands/brand-00.jpg",
                                          "./assets/brands/../brands/brand-00.jpg"}
    print("  PASS  dedupe-real-path: two spellings of one file -> one upload, both urls mapped")


def test_root_is_the_draft_dir_not_a_run_dir_copy() -> None:
    """Stages -2..-1.44 repoint args.mockup at a copy inside run_dir; resolving against
    that copy's parent finds no assets/. The draft folder is the only correct root."""
    with tempfile.TemporaryDirectory() as tmp:
        draft = _make_draft(tmp)
        run_dir = Path(tmp) / "pipeline-state" / "run-1"
        run_dir.mkdir(parents=True)
        (run_dir / "dc-import-resolved.html").write_text("<html></html>", encoding="utf-8")
        secrets = Path(tmp) / "secrets"
        _write_site_env(secrets, "fake-site", "https://fake.example", "u", "p")
        fake = FakeUploader()
        wrong = mod.sideload_batch(eye_care_extract(), mockup_root=run_dir, upload=True,
                                   site="fake-site", secrets_dir=secrets, uploader=fake)
        assert not wrong["uploaded"] and len(wrong["errors"]) == 16 and not fake.calls
        assert all("assets" in e["local_path"] for e in wrong["errors"])
        right = mod.sideload_batch(eye_care_extract(), mockup_root=draft, upload=True,
                                   site="fake-site", secrets_dir=secrets, uploader=fake)
        assert len(right["uploaded"]) == 16 and not right["errors"]
        assert all(Path(u["local_path"]).parent == (draft / "assets" / "brands").resolve()
                   for u in right["uploaded"])
    print("  PASS  draft-dir-root: run-dir root -> 16 not-found rows; draft-dir root -> 16 uploads")


def test_missing_files_collapse_to_one_error_row_per_file() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        (Path(tmp) / "empty-draft").mkdir()
        secrets = Path(tmp) / "secrets"
        _write_site_env(secrets, "fake-site", "https://fake.example", "u", "p")
        report = mod.sideload_batch(
            eye_care_extract(), mockup_root=Path(tmp) / "empty-draft", upload=True,
            site="fake-site", secrets_dir=secrets,  # default uploader: a missing file raises before any network
        )
        assert len(report["errors"]) == 16, len(report["errors"])
        assert all(e["occurrences"] == 12 and "not found" in e["reason"] for e in report["errors"])
        assert not report["url_map"]
    print("  PASS  error-rows: 192 occurrences of 16 missing files -> 16 error rows, not 192")


def test_deploy_site_env_selects_the_env_file() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        draft = _make_draft(tmp)
        secrets = Path(tmp) / "secrets"
        _write_site_env(secrets, "sandybrown", "https://canary.example", "canary-user", "canary-pw")
        _write_site_env(secrets, "eye-care-test", "https://eyecare.example", "eye-user", "eye-pw")
        extract = {"x": {"id": 0, "alt": "x", "url": "assets/brands/brand-00.jpg"}}
        with _environ(SGS_DEPLOY_SITE="eye-care-test"):
            assert mod.deploy_site_name() == "eye-care-test"
            fake = FakeUploader()
            mod.sideload_batch(extract, mockup_root=draft, upload=True,
                               site=mod.deploy_site_name(), secrets_dir=secrets, uploader=fake)
        assert fake.sites == {"https://eyecare.example"}, fake.sites
        assert fake.auths == {mod._basic_auth_header("eye-user", "eye-pw")}, "wrong credentials used"
        with _environ(SGS_DEPLOY_SITE=None):
            assert mod.deploy_site_name() == "sandybrown"
            fake2 = FakeUploader()
            mod.sideload_batch(extract, mockup_root=draft, upload=True,
                               site=mod.deploy_site_name(), secrets_dir=secrets, uploader=fake2)
        assert fake2.sites == {"https://canary.example"}, fake2.sites
        assert fake2.auths == {mod._basic_auth_header("canary-user", "canary-pw")}
        assert mod.site_key_for("eye-care-test") == "EYECARETEST"
    print("  PASS  deploy-site: SGS_DEPLOY_SITE picks <site>.env (url + creds); unset -> sandybrown")


def test_missing_env_file_fails_loudly() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        draft = _make_draft(tmp)
        secrets = Path(tmp) / "secrets"
        secrets.mkdir()
        extract = {"x": {"id": 0, "alt": "x", "url": "assets/brands/brand-00.jpg"}}
        fake = FakeUploader()
        try:
            mod.sideload_batch(extract, mockup_root=draft, upload=True,
                               site="no-such-site", secrets_dir=secrets, uploader=fake)
        except mod.SideloadConfigError as e:
            assert "no-such-site.env" in str(e) and "WP_URL_NOSUCHSITE" in str(e), str(e)
        else:
            raise AssertionError("a missing env file must raise SideloadConfigError")
        assert not fake.calls
        # env file present but the site's own keys absent: another site's keys are not used.
        (secrets / "half.env").write_text(
            "WP_URL_HALF=https://h.example\nWP_USER_SANDYBROWN=u\nWP_APP_PWD_SANDYBROWN=p\n", encoding="utf-8")
        try:
            mod.sideload_batch(extract, mockup_root=draft, upload=True,
                               site="half", secrets_dir=secrets, uploader=fake)
        except mod.SideloadConfigError as e:
            assert "WP_USER_HALF" in str(e), str(e)
        else:
            raise AssertionError("missing site keys must raise SideloadConfigError")
        # no WP_URL_<KEY>: refuse rather than upload to the palestine-lives.org default.
        (secrets / "nourl.env").write_text("WP_USER_NOURL=u\nWP_APP_PWD_NOURL=p\n", encoding="utf-8")
        try:
            mod.sideload_batch(extract, mockup_root=draft, upload=True,
                               site="nourl", secrets_dir=secrets, uploader=fake)
        except mod.SideloadConfigError as e:
            assert "WP_URL_NOURL" in str(e), str(e)
        else:
            raise AssertionError("a missing WP_URL must raise SideloadConfigError")
        # an unsafe site name (it names a file) is rejected, not joined onto the path.
        try:
            mod.resolve_site_env("../sandybrown", secrets)
        except mod.SideloadConfigError as e:
            assert "not a valid site name" in str(e)
        else:
            raise AssertionError("path-like site name must be rejected")
        assert not fake.calls
    print("  PASS  missing-env: absent file / absent keys / absent URL / unsafe name all raise, zero uploads")


def test_no_local_images_needs_no_credentials() -> None:
    """A draft with only hosted (or no) images behaves as before: no env read, no upload."""
    with tempfile.TemporaryDirectory() as tmp:
        fake = FakeUploader()
        extract = {"a": {"id": 1, "alt": "x", "url": "https://cdn.example/a.jpg"},
                   "b": {"id": 0, "alt": "y", "url": "//cdn.example/b.jpg"}}
        report = mod.sideload_batch(extract, mockup_root=Path(tmp), upload=True,
                                    site="no-such-site", secrets_dir=Path(tmp), uploader=fake)
        assert report["unique_files"] == 0 and not fake.calls and not report["errors"]
        assert len(report["skipped"]) == 2 and not report["url_map"]
        empty = mod.sideload_batch({}, mockup_root=Path(tmp), upload=True,
                                   site="no-such-site", secrets_dir=Path(tmp), uploader=fake)
        assert empty["slots_found"] == 0 and not empty["errors"]
    print("  PASS  no-local-images: hosted-only / empty draft needs no credentials, uploads nothing")


def test_reuse_existing_attachment_not_reupload() -> None:
    """The real _upload_one_idempotent path with a fake media library: a re-run uploads 0."""
    library: dict[str, dict] = {}
    posts: list[str] = []
    real_check, real_upload = mod._check_existing_attachment, mod._upload_one

    def fake_check(filename, wp_site, auth_header, timeout=30, local_size=None):
        return library.get(filename.lower())

    def fake_upload(file_path, wp_site, auth_header, timeout=60):
        posts.append(file_path.name)
        rec = {"id": 900 + len(posts), "source_url": f"{wp_site}/wp-content/uploads/{file_path.name}"}
        library[file_path.name.lower()] = rec
        return rec

    mod._check_existing_attachment, mod._upload_one = fake_check, fake_upload
    try:
        with tempfile.TemporaryDirectory() as tmp:
            draft = _make_draft(tmp)
            secrets = Path(tmp) / "secrets"
            _write_site_env(secrets, "fake-site", "https://fake.example", "u", "p")
            first = mod.sideload_batch(eye_care_extract(), mockup_root=draft, upload=True,
                                       site="fake-site", secrets_dir=secrets)
            assert len(posts) == 16 and not any(u["reused"] for u in first["uploaded"])
            second = mod.sideload_batch(eye_care_extract(), mockup_root=draft, upload=True,
                                        site="fake-site", secrets_dir=secrets)
            assert len(posts) == 16, f"a re-run must not POST again, got {len(posts)}"
            assert len(second["uploaded"]) == 16 and all(u["reused"] for u in second["uploaded"])
            assert second["url_map"] == first["url_map"], "reused attachments must keep the same id + url"
    finally:
        mod._check_existing_attachment, mod._upload_one = real_check, real_upload
    print("  PASS  reuse: first run 16 POSTs, second run 0 POSTs, same ids + urls reused")


# ---------------------------------------------------------------------------------------------------------------
# QC fix wave: reuse-by-basename must not substitute a DIFFERENT picture; a partial upload must not deploy
# ---------------------------------------------------------------------------------------------------------------

class _FakeResponse:
    def __init__(self, payload) -> None:
        self._body = json.dumps(payload).encode("utf-8")

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc) -> bool:
        return False


class _FakeMediaLibrary:
    """A fake WordPress REST media library: the SAME `urllib.request.urlopen` seam the real code uses, so
    `_check_existing_attachment` and `_upload_one_idempotent` run unmodified. Records every POST."""

    def __init__(self, items: list[dict]) -> None:
        self.items = items
        self.posts: list[str] = []
        self.searches: list[str] = []

    def __call__(self, req, timeout=None):
        if req.get_method() == "POST":
            name = req.get_header("Content-disposition").split('filename="')[1].rstrip('"')
            self.posts.append(name)
            return _FakeResponse({"id": 800 + len(self.posts), "source_url": f"https://fake.example/wp-content/uploads/{name}",
                                  "media_details": {"filesize": len(req.data)}})
        self.searches.append(req.full_url)
        return _FakeResponse(self.items)


def _library_item(name: str, attachment_id: int, size) -> dict:
    item = {"id": attachment_id, "source_url": f"https://fake.example/wp-content/uploads/2026/09/{name}"}
    if size is not None:
        item["media_details"] = {"filesize": size}
    return item


def _reuse_check(items: list[dict], content: bytes = b"the-real-picture"):
    """Run the REAL `_upload_one_idempotent` for `hero.webp` against a fake library. Returns (record, reused, library)."""
    library = _FakeMediaLibrary(items)
    real = mod.urllib.request.urlopen
    mod.urllib.request.urlopen = library
    try:
        with tempfile.TemporaryDirectory() as tmp:
            local = Path(tmp) / "hero.webp"
            local.write_bytes(content)
            record, reused = mod._upload_one_idempotent(local, "https://fake.example", "Basic x")
    finally:
        mod.urllib.request.urlopen = real
    return record, reused, library


def test_reuse_when_the_library_reports_the_same_size_is_verified() -> None:
    record, reused, library = _reuse_check([_library_item("hero.webp", 41, len(b"the-real-picture"))])
    assert reused is True and record["id"] == 41 and record["sgs_reuse_check"] == "size-verified"
    assert library.posts == []


def test_a_same_named_attachment_of_a_different_size_is_not_reused_the_file_is_uploaded_as_new() -> None:
    """Two drafts each ship `assets/hero.webp`: the second clone must not adopt the first client's photo."""
    record, reused, library = _reuse_check([_library_item("hero.webp", 41, 999_999)])
    assert reused is False and library.posts == ["hero.webp"] and record["id"] == 801


def test_reuse_when_the_library_reports_no_size_is_marked_filename_only() -> None:
    record, reused, library = _reuse_check([_library_item("hero.webp", 41, None)])
    assert reused is True and record["id"] == 41 and record["sgs_reuse_check"] == "filename-only"
    assert library.posts == []


def test_an_empty_media_details_array_counts_as_no_size() -> None:
    """PHP serialises an empty `media_details` as `[]`, not `{}`."""
    item = _library_item("hero.webp", 41, None)
    item["media_details"] = []
    record, reused, _ = _reuse_check([item])
    assert reused is True and record["sgs_reuse_check"] == "filename-only"


def test_among_several_same_named_attachments_the_one_with_the_matching_size_is_reused() -> None:
    items = [_library_item("hero.webp", 41, 111), _library_item("hero.webp", 42, len(b"the-real-picture")),
             _library_item("hero.webp", 43, None)]
    record, reused, _ = _reuse_check(items)
    assert reused is True and record["id"] == 42 and record["sgs_reuse_check"] == "size-verified"


def test_negative_control_a_different_filename_is_never_reused_whatever_its_size() -> None:
    _record, reused, library = _reuse_check([_library_item("hero-2.webp", 41, len(b"the-real-picture"))])
    assert reused is False and library.posts == ["hero.webp"]


def test_the_batch_report_counts_the_files_reused_by_filename_only() -> None:
    """End to end through `sideload_batch` with the real reuse path: the row and the report say which were unverified."""
    library = _FakeMediaLibrary([_library_item("brand-00.jpg", 51, None), _library_item("brand-01.jpg", 52, len(b"\xff\xd8fake-brand-01.jpg")),
                                 _library_item("brand-02.jpg", 53, 5)])
    real = mod.urllib.request.urlopen
    mod.urllib.request.urlopen = library
    try:
        with tempfile.TemporaryDirectory() as tmp:
            draft = _make_draft(tmp)
            secrets = Path(tmp) / "secrets"
            _write_site_env(secrets, "fake-site", "https://fake.example", "u", "p")
            extract = {f"s{i}": {"id": 0, "alt": "x", "url": f"assets/brands/brand-0{i}.jpg"} for i in range(3)}
            report = mod.sideload_batch(extract, mockup_root=draft, upload=True, site="fake-site", secrets_dir=secrets)
    finally:
        mod.urllib.request.urlopen = real
    rows = {Path(r["local_path"]).name: r for r in report["uploaded"]}
    assert rows["brand-00.jpg"]["reused"] and rows["brand-00.jpg"]["reuse_unverified"] is True
    assert rows["brand-01.jpg"]["reused"] and "reuse_unverified" not in rows["brand-01.jpg"]
    assert not rows["brand-02.jpg"]["reused"] and library.posts == ["brand-02.jpg"]      # size 5 != the local file: uploaded new
    assert report["reused_unverified"] == 1


def _failing_batch(tmp: str, fail: set[str]):
    draft = _make_draft(tmp)
    secrets = Path(tmp) / "secrets"
    _write_site_env(secrets, "fake-site", "https://fake.example", "u", "p")

    def uploader(file_path: Path, wp_site: str, auth_header: str):
        if file_path.name in fail:
            raise mod.SideloadError(f"upload refused for {file_path.name}")
        return {"id": 700 + int(file_path.stem[-2:]), "source_url": f"{wp_site}/wp-content/uploads/{file_path.name}"}, False

    return mod.sideload_batch(eye_care_extract(), mockup_root=draft, upload=True, site="fake-site",
                              secrets_dir=secrets, uploader=uploader)


def test_a_partial_upload_raises_and_names_every_failed_file() -> None:
    fail = {"brand-03.jpg", "brand-07.jpg", "brand-11.jpg", "brand-12.jpg", "brand-13.jpg", "brand-14.jpg"}
    with tempfile.TemporaryDirectory() as tmp:
        report = _failing_batch(tmp, fail)
    assert len(report["uploaded"]) == 10 and len(report["errors"]) == 6 and len(report["url_map"]) == 10
    try:
        mod.enforce_complete_upload(report)
    except mod.SideloadPartialError as exc:
        message = str(exc)
    else:
        raise AssertionError("a partial upload must raise SideloadPartialError")
    assert "6 of 16 file(s) did not upload" in message
    for name in fail:                                      # EVERY failed file is listed, with its reason (not the first five)
        assert f"{name}: upload refused for {name}" in message
    assert "--allow-partial-media" in message


def test_allow_partial_returns_the_failed_list_and_warns_loudly(capsys) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        report = _failing_batch(tmp, {"brand-03.jpg", "brand-07.jpg"})
    outcome = mod.enforce_complete_upload(report, allow_partial=True)
    assert outcome["partial_media"] is True and len(outcome["failed"]) == 2
    assert {Path(f["local_path"]).name for f in outcome["failed"]} == {"brand-03.jpg", "brand-07.jpg"}
    err = capsys.readouterr().err
    assert "WARNING: 2 file(s) did NOT upload" in err and "brand-03.jpg" in err and "brand-07.jpg" in err


def test_a_complete_upload_and_a_dry_run_are_not_stopped() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        assert mod.enforce_complete_upload(_failing_batch(tmp, set())) is None
    dry = mod.sideload_batch(eye_care_extract(), mockup_root=Path("/nonexistent"), upload=False)
    assert mod.enforce_complete_upload(dry) is None


def main() -> int:
    print("Spec 31 Phase 5b.5 -- media-sideload contract")
    test_collect_image_slots_walks_tree()
    test_dry_run_no_network()
    test_env_creds_parsing()
    test_env_creds_missing_raises()
    test_basic_auth_header_well_formed()
    test_path_traversal_blocked()
    test_local_file_not_found_recorded_as_error()
    test_dedupe_192_slots_to_16_uploads()
    test_two_url_spellings_of_one_file_upload_once()
    test_root_is_the_draft_dir_not_a_run_dir_copy()
    test_missing_files_collapse_to_one_error_row_per_file()
    test_deploy_site_env_selects_the_env_file()
    test_missing_env_file_fails_loudly()
    test_no_local_images_needs_no_credentials()
    test_reuse_existing_attachment_not_reupload()
    print("\nSIDELOAD-5B.5: PASS (slot walk + dry-run + env creds + auth + error handling)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
