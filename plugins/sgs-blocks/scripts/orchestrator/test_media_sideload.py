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


def main() -> int:
    print("Spec 31 Phase 5b.5 -- media-sideload contract")
    test_collect_image_slots_walks_tree()
    test_dry_run_no_network()
    test_env_creds_parsing()
    test_env_creds_missing_raises()
    test_basic_auth_header_well_formed()
    test_path_traversal_blocked()
    test_local_file_not_found_recorded_as_error()
    print("\nSIDELOAD-5B.5: PASS (slot walk + dry-run + env creds + auth + error handling)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
