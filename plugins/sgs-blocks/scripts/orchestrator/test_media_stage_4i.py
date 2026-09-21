"""Group A (2026-09-21): structural guards on the Stage 4i wiring in sgs-clone-orchestrator.py.

The orchestrator's main() cannot be run here (Stage 10 would upload to a live WordPress
site), so these parse the orchestrator's AST and pin the four facts the media fix rests on.
The first group are guards against re-introducing the proven defects (structure only);
the behaviour lives in test_media_sideload.py / test_media_rewrite.py and the section at the end.

  1. `_draft_dir` is captured BEFORE the first `args.mockup = ...` reassignment
     (Stages -2/-1.5/-1.45/-1.44 repoint args.mockup at a copy inside the run dir).
  2. sideload_batch is called with mockup_root=_draft_dir (never args.mockup.parent).
  3. the site comes from SGS_DEPLOY_SITE via deploy_site_name(); no hard-coded sandybrown.env.
  4. Stage order: sideload_batch -> apply_rewrite_to_run -> the upload_and_patch (Stage 10) call.
  5. `--no-media-sideload` exists and is honoured; config/rewrite errors are hard failures.
  6. a partial upload fails closed before the write-back and Stage 10 unless `--allow-partial-media`.

Everything from the QC fix wave section down RUNS the real Stage 4i source (sliced out of main()) with a
fake uploader: those are the behavioural tests; everything above is structure only.
"""
from __future__ import annotations

import ast
from pathlib import Path

ORCH = Path(__file__).resolve().parents[1] / "sgs-clone-orchestrator.py"
TREE = ast.parse(ORCH.read_text(encoding="utf-8"))
SRC = ORCH.read_text(encoding="utf-8")


def _main_fn() -> ast.FunctionDef:
    for node in ast.walk(TREE):
        if isinstance(node, ast.FunctionDef) and node.name == "main":
            return node
    raise AssertionError("main() not found in sgs-clone-orchestrator.py")


def _dump(node: ast.AST) -> str:
    return ast.dump(node)


def _calls_named(name: str) -> list[ast.Call]:
    return [n for n in ast.walk(_main_fn())
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == name]


def _is_args_mockup(node: ast.AST) -> bool:
    return (isinstance(node, ast.Attribute) and node.attr == "mockup"
            and isinstance(node.value, ast.Name) and node.value.id == "args")


def test_draft_dir_is_captured_before_args_mockup_is_repointed() -> None:
    draft_line = None
    first_repoint = None
    for node in ast.walk(_main_fn()):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "_draft_dir" and draft_line is None:
                    draft_line = node.lineno
                if _is_args_mockup(target):
                    first_repoint = node.lineno if first_repoint is None else min(first_repoint, node.lineno)
    assert draft_line is not None, "_draft_dir is no longer assigned in main()"
    assert first_repoint is not None
    assert draft_line < first_repoint, "_draft_dir must be captured before args.mockup is reassigned"


def test_sideload_batch_is_rooted_at_the_draft_dir() -> None:
    calls = _calls_named("sideload_batch")
    assert len(calls) == 1, f"expected exactly one sideload_batch call, found {len(calls)}"
    kwargs = {k.arg: k.value for k in calls[0].keywords}
    root = kwargs.get("mockup_root")
    assert isinstance(root, ast.Name) and root.id == "_draft_dir", (
        "Stage 4i must resolve images against the draft's real folder (_draft_dir); "
        f"got {ast.dump(root) if root is not None else 'no mockup_root'}"
    )
    assert not any(_is_args_mockup(n) for n in ast.walk(calls[0])), (
        "args.mockup is a run-dir copy by Stage 4i; it must not feed the sideload root"
    )


def test_site_comes_from_deploy_site_env_not_a_hardcoded_file() -> None:
    call = _calls_named("sideload_batch")[0]
    kwargs = {k.arg: k.value for k in call.keywords}
    assert "site" in kwargs, "sideload_batch must be given the deploy site"
    assert "deploy_site_name" in _dump(kwargs["site"]), "the site must come from msl.deploy_site_name()"
    assert "env_path" not in kwargs, "an explicit env_path would bypass the SGS_DEPLOY_SITE selection"
    literals = [n.value for n in ast.walk(_main_fn())
                if isinstance(n, ast.Constant) and isinstance(n.value, str)]
    assert not any("sandybrown.env" in v for v in literals), "Stage 4i must not hard-code the sandybrown env file"


def test_stage_order_is_sideload_then_rewrite_then_stage_10() -> None:
    sideload = _calls_named("sideload_batch")[0].lineno
    rewrite = _calls_named("apply_rewrite_to_run")
    assert len(rewrite) == 1, "the url + id write-back must be called exactly once"
    stage_10 = min(n.lineno for n in ast.walk(_main_fn())
                   if isinstance(n, ast.Name) and n.id == "_upload_script")
    assert sideload < rewrite[0].lineno < stage_10


def test_opt_out_flag_exists_and_is_honoured() -> None:
    flags = [c.args[0].value for c in ast.walk(TREE)
             if isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute)
             and c.func.attr == "add_argument" and c.args and isinstance(c.args[0], ast.Constant)]
    assert "--no-media-sideload" in flags
    assert 'getattr(args, "no_media_sideload"' in SRC


def test_config_and_rewrite_failures_are_hard_failures() -> None:
    handlers = [h for h in ast.walk(_main_fn()) if isinstance(h, ast.ExceptHandler) and h.type is not None]
    hard = [h for h in handlers if "SideloadConfigError" in _dump(h.type)]
    assert len(hard) == 1, "SideloadConfigError must be caught by the hard-fail handler"
    assert "SideloadAuthError" in _dump(hard[0].type) and "SideloadRewriteError" in _dump(hard[0].type)
    assert any(isinstance(n, ast.Raise) for n in ast.walk(hard[0])), "the hard-fail handler must re-raise"


# ---------------------------------------------------------------------------------------------------------------
# QC fix wave: a partial upload must not reach Stage 10. The AST guards above prove structure; these RUN the real
# Stage 4i source (sliced out of main()) against the real sideload module with a fake uploader, so no network and no
# live site is touched.
# ---------------------------------------------------------------------------------------------------------------

import importlib.util  # noqa: E402
import json  # noqa: E402
import sys  # noqa: E402
import textwrap  # noqa: E402
import types  # noqa: E402

_MSL_SPEC = importlib.util.spec_from_file_location("media_sideload_stage_4i", Path(__file__).with_name("media-sideload.py"))
MSL = importlib.util.module_from_spec(_MSL_SPEC)
_MSL_SPEC.loader.exec_module(MSL)

BRANDS = [f"brand-{i:02d}.jpg" for i in range(6)]


def _markup() -> str:
    logos = ",".join('{"media":{"alt":"%s","id":0,"url":"assets/brands/%s"}}' % (n, n) for n in BRANDS)
    return '<!-- wp:sgs/brand-strip {"logos":[%s]} /-->' % logos


def _stage_4i_source() -> str:
    start = SRC.index("    _4i_do_upload: bool")
    end = SRC.index('    _ms = stage_4i_summary.get("media_sideload") or {}')
    return textwrap.dedent(SRC[start:end])


def _run_stage_4i(tmp_path: Path, *, deploy: bool, fail: frozenset = frozenset(), allow_partial: bool = False):
    draft = tmp_path / "draft"
    (draft / "assets" / "brands").mkdir(parents=True)
    for name in BRANDS:
        (draft / "assets" / "brands" / name).write_bytes(b"img-" + name.encode())
    secrets = tmp_path / "secrets"
    secrets.mkdir()
    (secrets / "fake-site.env").write_text(
        "WP_URL_FAKESITE=https://fake.example\nWP_USER_FAKESITE=u\nWP_APP_PWD_FAKESITE=p\n", encoding="utf-8")
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    logos = [{"media": {"alt": n, "id": 0, "url": f"assets/brands/{n}"}} for n in BRANDS]
    extract_out = {"block_markup": _markup(), "extracted_attributes": {"logos": logos}}
    (run_dir / "extract.json").write_text(json.dumps(extract_out), encoding="utf-8")
    posts: list[str] = []

    def uploader(file_path: Path, wp_site: str, auth_header: str):
        if file_path.name in fail:
            raise MSL.SideloadError(f"the site refused {file_path.name}")
        posts.append(file_path.name)
        return {"id": 600 + len(posts), "source_url": f"{wp_site}/wp-content/uploads/{file_path.name}"}, False

    class Proxy:
        """The real module, except `sideload_batch` gets the fake uploader and a temp secrets dir (no network)."""

        def __getattr__(self, name):
            return getattr(MSL, name)

        def deploy_site_name(self):
            return "fake-site"

        def sideload_batch(self, *args, **kwargs):
            return MSL.sideload_batch(*args, secrets_dir=secrets, uploader=uploader, **kwargs)

    scope = {
        "args": types.SimpleNamespace(deploy_target="page:1" if deploy else None, allow_partial_media=allow_partial,
                                      no_media_sideload=False),
        "run_dir": run_dir, "extract_out": extract_out, "_draft_dir": draft, "json": json, "sys": sys,
        "media_sideload": lambda: Proxy(), "attribute_staged_apply": lambda: None, "functionality_bulk_apply": lambda: None,
    }
    try:
        exec(compile(_stage_4i_source(), "stage-4i", "exec"), scope)
        raised = None
    except RuntimeError as exc:
        raised = exc
    on_disk = json.loads((run_dir / "extract.json").read_text(encoding="utf-8"))["block_markup"]
    return raised, run_dir, on_disk, posts


def test_a_partial_upload_stops_the_run_before_stage_10_and_lists_every_failed_file(tmp_path, capsys) -> None:
    fail = frozenset(BRANDS[1::2] + [BRANDS[4]])                                 # 4 of 6 fail
    raised, run_dir, on_disk, _ = _run_stage_4i(tmp_path, deploy=True, fail=fail)
    assert raised is not None and "Stage 4i media sideload failed" in str(raised)
    for name in fail:                                                            # EVERY failure, with its reason
        assert f"{name}: the site refused {name}" in str(raised)
    assert on_disk == _markup(), "nothing is written back when the upload is partial"
    assert "assets/brands/brand-00.jpg" in on_disk                               # still the draft's own path, untouched
    summary = json.loads((run_dir / "stage-4i.json").read_text(encoding="utf-8"))
    assert summary["media_sideload"]["mode"] == "hard-fail"
    assert "NOT UPLOADED" in capsys.readouterr().err


def test_negative_control_a_complete_upload_is_rewritten_and_does_not_stop(tmp_path) -> None:
    raised, run_dir, on_disk, posts = _run_stage_4i(tmp_path, deploy=True)
    assert raised is None and len(posts) == 6
    assert "assets/brands/" not in on_disk and on_disk.count("/wp-content/uploads/brand-") == 6
    summary = json.loads((run_dir / "stage-4i.json").read_text(encoding="utf-8"))["media_sideload"]
    assert summary["errors"] == 0 and "partial_media" not in summary and summary["rewritten_images"] == 6


def test_allow_partial_media_continues_rewrites_the_successes_and_records_the_failures(tmp_path, capsys) -> None:
    raised, run_dir, on_disk, posts = _run_stage_4i(tmp_path, deploy=True, fail=frozenset({"brand-02.jpg", "brand-05.jpg"}),
                                                    allow_partial=True)
    assert raised is None and len(posts) == 4
    assert on_disk.count("/wp-content/uploads/brand-") == 4 and "assets/brands/brand-02.jpg" in on_disk
    summary = json.loads((run_dir / "stage-4i.json").read_text(encoding="utf-8"))["media_sideload"]
    assert summary["partial_media"] is True and summary["errors"] == 2
    assert {Path(f["local_path"]).name for f in summary["failed"]} == {"brand-02.jpg", "brand-05.jpg"}
    assert "WARNING: 2 file(s) did NOT upload" in capsys.readouterr().err


def test_a_dry_run_without_a_deploy_target_is_unaffected(tmp_path) -> None:
    raised, run_dir, on_disk, posts = _run_stage_4i(tmp_path, deploy=False, fail=frozenset(BRANDS))
    assert raised is None and posts == [] and on_disk == _markup()
    assert json.loads((run_dir / "stage-4i.json").read_text(encoding="utf-8"))["media_sideload"]["mode"] == "dry-run"


def test_the_completeness_check_runs_between_the_upload_and_the_write_back() -> None:
    sideload = _calls_named("sideload_batch")[0].lineno
    enforce = _calls_named("enforce_complete_upload")
    assert len(enforce) == 1, "the fail-closed check must be called exactly once"
    rewrite = _calls_named("apply_rewrite_to_run")[0].lineno
    assert sideload < enforce[0].lineno < rewrite
    assert "allow_partial" in {k.arg for k in enforce[0].keywords}


def test_the_partial_failure_is_a_hard_failure_and_the_flag_is_declared() -> None:
    hard = [h for h in ast.walk(_main_fn()) if isinstance(h, ast.ExceptHandler) and h.type is not None
            and "SideloadConfigError" in _dump(h.type)]
    assert len(hard) == 1 and "SideloadPartialError" in _dump(hard[0].type)
    flags = [c.args[0].value for c in ast.walk(TREE) if isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute)
             and c.func.attr == "add_argument" and c.args and isinstance(c.args[0], ast.Constant)]
    assert "--allow-partial-media" in flags
