#!/usr/bin/env python3
"""deploy_verify.py - build-deploy.py's checks after the files land: cache purge, the theme.json and
payload checks, the smoke test, the live motion probes and the scoped-selector audit.
"""
from __future__ import annotations

import base64
import os
import shlex
import subprocess
import time
from pathlib import Path

from deploy_common import PLUGIN_DIR, REPO_ROOT, ROLLBACK_HINT, err, log, run, ssh_base_cmd, urlopen_tls
from deploy_guards import _remote_md5
from deploy_qa_tier import note_full_pass, resolve_tier


def theme_json_verify_result(expected_md5: str, live_md5: str | None) -> bool:
    """Post-deploy: the live theme.json must be byte-identical to the payload. Pure."""
    return live_md5 is not None and live_md5 == expected_md5


def step_verify_theme_json(use_alias: bool, wp_content: str, payload: bytes, label: str) -> int:
    """POST-DEPLOY, fail closed: is the live theme.json the one this target must have?

    Not governed by --skip-verify: it is the only check that the client's theme settings
    survived the deploy, and a deploy that silently reverts them is the bug it guards."""
    import hashlib
    expected = hashlib.md5(payload).hexdigest()
    live_md5, status = _remote_md5(use_alias, f"{wp_content}/themes/sgs-theme/theme.json")
    if theme_json_verify_result(expected, live_md5):
        log(f"[theme-json] PASS: live theme.json is the {label} (md5 {expected[:8]})")
        return 0
    err(f"[theme-json] FAIL: live theme.json md5={(live_md5 or status)[:8]}, expected the "
        f"{label} md5={expected[:8]}. The client's theme settings are NOT what this deploy "
        "shipped. Re-apply with push-theme-snapshot.py, then re-check.")
    return 1


def step_purge_caches(dry_run: bool, use_alias: bool, wp_content: str,
                      host: str) -> int:
    """Post-deploy cache purge - THREE DIFFERENT CACHES, deliberately all.

    WHY THIS EXISTS. A cache reset that is only described in docs (or in
    ROLLBACK_HINT's MANUAL instructions) and enforced nowhere leaves theme assets
    served STALE to every warm browser cache after a deploy.

    The two layers are not interchangeable:

      OPcache   holds COMPILED PHP.   Stale => the server runs yesterday's render.php.
      LiteSpeed holds RENDERED HTML.  Stale => the server never runs today's PHP at all.
      Pattern   holds the parsed THEME PATTERN FILES, keyed on the theme version.  Stale =>
                a pattern file added by the deploy is on disk but never registered.

    Clearing one does nothing for the others.

    OPCACHE MUST BE RESET OVER HTTP, NOT OVER SSH. Each PHP SAPI keeps its OWN
    OPcache: `wp eval` runs in the CLI pool and resets the CLI's cache, leaving the
    web pool - the one that actually serves visitors - untouched, while reporting
    success. So a temporary file is written into the webroot, fetched over HTTPS so
    the WEB pool executes it, then removed. The filename carries a random token: it
    is world-reachable for the ~1s it exists, and a guessable opcache_reset()
    endpoint is a free cache-stampede lever. The payload ships base64-encoded so no
    PHP quoting can be mangled by the shell on the way.

    FAILS SOFT, LOUDLY. By this point the files are already live, so a failed purge
    is not grounds to abort - that would read as "nothing shipped" and invite a
    retry loop. But a leg that did not run is NEVER reported as OK: the whole point
    of this step is that a silent skip makes stale caches invisible.
    """
    log("[purge] clearing cache layers (OPcache + page cache + theme pattern cache)")
    if dry_run:
        log("[purge] SKIPPED (--dry-run); would reset OPcache over HTTPS "
            "and run `wp litespeed-purge all`")
        return 0

    webroot = (wp_content[: -len("/wp-content")]
               if wp_content.endswith("/wp-content") else wp_content)
    ok_opcache = False
    ok_page = False

    # ---- leg 1: OPcache, via the WEB pool ---------------------------------
    probe = "sgs-opcache-" + os.urandom(8).hex() + ".php"
    remote_probe = webroot + "/" + probe
    php = ("<?php if (function_exists('opcache_reset')) { echo opcache_reset() "
           "? 'SGS-OPCACHE-RESET-OK' : 'SGS-OPCACHE-RESET-FAILED'; } "
           "else { echo 'SGS-OPCACHE-ABSENT'; }")
    b64 = base64.b64encode(php.encode("utf-8")).decode("ascii")
    write_cmd = ssh_base_cmd(use_alias) + [
        "echo " + shlex.quote(b64) + " | base64 -d > " + shlex.quote(remote_probe)]
    rm_cmd = ssh_base_cmd(use_alias) + ["rm -f " + shlex.quote(remote_probe)]
    try:
        w = subprocess.run(write_cmd, check=False, capture_output=True, text=True)
        if w.returncode != 0:
            err("[purge] could not write the OPcache probe (exit %d): %s"
                % (w.returncode, (w.stderr or "").strip()[:200]))
        else:
            import urllib.error
            import urllib.request
            url = "https://" + host + "/" + probe
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "sgs-deploy/opcache"})
                with urlopen_tls(req, "purge") as resp:
                    body = resp.read(200).decode("utf-8", "replace")
                if "SGS-OPCACHE-RESET-OK" in body:
                    log("[purge] OPcache: RESET (web pool)")
                    ok_opcache = True
                elif "SGS-OPCACHE-ABSENT" in body:
                    log("[purge] OPcache: not enabled on this host - nothing to reset")
                    ok_opcache = True
                else:
                    err("[purge] OPcache reset did not confirm; probe said: %r"
                        % body.strip()[:120])
            except (urllib.error.URLError, OSError) as e:
                err("[purge] OPcache probe request failed: %s" % e)
    finally:
        subprocess.run(rm_cmd, check=False, capture_output=True, text=True)
        # Prove the probe is gone rather than assuming the rm landed - it is a
        # publicly reachable file that resets a shared cache.
        chk = subprocess.run(
            ssh_base_cmd(use_alias)
            + ["test -e " + shlex.quote(remote_probe)
               + " && echo PRESENT || echo GONE"],
            check=False, capture_output=True, text=True)
        if "PRESENT" in (chk.stdout or ""):
            err("[purge] the OPcache probe is STILL on the server: %s "
                "- remove it by hand" % remote_probe)

    # ---- leg 2: page cache (LiteSpeed) ------------------------------------
    # Gated on the plugin actually being active so a target without LiteSpeed
    # reports "not installed" rather than a red error on every deploy.
    page_cmd = ssh_base_cmd(use_alias) + [
        "cd " + shlex.quote(webroot) + " && "
        "if wp plugin is-active litespeed-cache 2>/dev/null; then "
        "wp litespeed-purge all 2>&1; else echo SGS-NO-LITESPEED; fi"]
    pc = subprocess.run(page_cmd, check=False, capture_output=True, text=True)
    out = ((pc.stdout or "") + (pc.stderr or "")).strip()
    if "SGS-NO-LITESPEED" in out:
        log("[purge] page cache: LiteSpeed not active on this target - skipped")
        ok_page = True
    elif pc.returncode == 0 and "Purged" in out:
        log("[purge] page cache: PURGED (LiteSpeed)")
        ok_page = True
    else:
        err("[purge] page-cache purge did not confirm (exit %d): %s"
            % (pc.returncode, out[:200]))

    # ---- leg 3: theme pattern cache ---------------------------------------
    pattern_cmd = ssh_base_cmd(use_alias) + [
        "cd " + shlex.quote(webroot) + " && "
        "wp eval 'wp_get_theme()->delete_pattern_cache(); echo \"SGS-PATTERN-CACHE-CLEARED\";' 2>&1"]
    pt = subprocess.run(pattern_cmd, check=False, capture_output=True, text=True)
    pout = ((pt.stdout or "") + (pt.stderr or "")).strip()
    ok_patterns = "SGS-PATTERN-CACHE-CLEARED" in pout
    if ok_patterns:
        log("[purge] theme pattern cache: CLEARED")
    else:
        err("[purge] theme pattern cache did not clear (exit %d): %s"
            % (pt.returncode, pout[:200]))

    # ---- leg 4: pending SGS migrations -------------------------------------
    # A release that ships a migration (includes/migrations/) needs it run on
    # every site, or wp-admin shows "N migrations pending" until someone runs
    # it by hand. The runner needs edit_theme_options, so it runs as the site's
    # first administrator. Idempotent; a failure is reported, never fatal.
    mig_cmd = ssh_base_cmd(use_alias) + [
        "cd " + shlex.quote(webroot) + " && "
        "uid=$(wp user list --role=administrator --field=ID --orderby=ID "
        "--number=1 2>/dev/null) && "
        "wp sgs migrations run --user=\"$uid\" 2>&1 && echo SGS-MIGRATIONS-OK"]
    mg = subprocess.run(mig_cmd, check=False, capture_output=True, text=True)
    mout = ((mg.stdout or "") + (mg.stderr or "")).strip()
    if "SGS-MIGRATIONS-OK" in mout:
        log("[migrate] %s" % mout.replace("SGS-MIGRATIONS-OK", "").strip()[:300])
    else:
        err("[migrate] pending SGS migrations did not run (exit %d): %s - run "
            "`wp sgs migrations run --user=<admin id>` on the target"
            % (mg.returncode, mout[:200]))

    if ok_opcache and ok_page and ok_patterns:
        log("[purge] OK - all layers clear")
        return 0
    # Non-fatal by design (see the docstring), but never silent.
    err("[purge] NOT FULLY PURGED - the deploy IS live, but visitors with a warm "
        "cache may still be served the previous version. Re-run the failing leg "
        "by hand before trusting a visual check.")
    return 0


def step_scoped_selector_audit(page_id: str, dry_run: bool) -> int:
    """Post-deploy structural gate (scoped-selector match): run the LIVE
    scoped-selector audit against the just-deployed canary page. Catches the
    "scoped rule whose class the element never carries" bug class (multi-button)
    on the painted DOM — the STOP-21-authoritative signal a static check can't
    give. Returns the audit exit code (non-zero = dead per-instance selectors)."""
    if dry_run:
        log(f"[scoped-audit] SKIPPED (--dry-run); would audit page {page_id}")
        return 0
    audit_js = Path(__file__).resolve().parent / "audit-scoped-selector-live.js"
    cmd = ["node", str(audit_js), "--page", str(page_id)]
    log(f"[scoped-audit] {' '.join(cmd)}")
    try:
        rc = subprocess.call(cmd)
    except Exception as e:  # noqa: BLE001
        log(f"[scoped-audit] WARNING: could not run audit ({e}) — skipping")
        return 0
    if rc != 0:
        log("[scoped-audit] FAIL: dead per-instance scoped selectors on the deployed page")
    else:
        log("[scoped-audit] PASS: every per-instance scope class lands on an element")
    return rc


def motion_qa_command(npm: str, tier: str = "full", parallel: int = 1) -> list[str]:
    """The `npm run qa:motion` command line. Tier and parallelism are appended only when they differ from the
    defaults (full, 1), so a default deploy runs the byte-identical command it always has."""
    cmd = [npm, "run", "qa:motion"]
    if tier != "full" or parallel != 1:
        cmd += ["--"]
        if tier != "full":
            cmd += ["--tier", tier]
        if parallel != 1:
            cmd += ["--parallel", str(parallel)]
    return cmd


def step_motion_qa(dry_run: bool, tier: str = "full", parallel: int = 1, uncommitted: list[str] | None = None,
                   skip_verify: bool = False) -> int:
    """Post-deploy LIVE motion regression check.

    ⛔ WHY THIS IS HERE AND NOT IN `prebuild`. Every motion probe needs a live canary.
    A network-dependent check inside a BUILD gate can only fail when the canary is
    merely unreachable, or warn-and-pass — and warn-and-pass is precisely the vacuity
    `check-no-inline.py --live-default` already carries (it PASSES on a disconnected
    machine, so a green run there proves nothing). Post-deploy is the honest home: the
    canary is up by definition, and `step_verify_payload()` has just proven the live
    plugin IS this run's payload, so a motion regression here is genuinely attributable
    to this deploy rather than to ambient site state.

    ⚠ Probes under `scripts/motion-qa/` that `package.json` does not reference are
    "built but never wired": they run on no build. Opting out with
    `--skip-motion-qa` leaves them unrun.

    `tier` (`smoke`, `full` or `auto`) and `parallel` (1 to 8) come from `--motion-qa-tier` and `--motion-qa-parallel`.
    `auto` runs the full set when marquee-related code changed or the last full pass is stale (`deploy_qa_tier.py`), else
    smoke. A passing full run records HEAD; a smoke run never does, and a dry run never writes anything.

    `uncommitted` lists the files this run ships that are not in HEAD; they count as changed when `auto` chooses a tier.
    A full pass is never recorded when the run shipped uncommitted files (HEAD would not describe the code tested) or
    when `skip_verify` is set (the deploy never confirmed the live plugin is this payload).
    """
    # npm is a shell shim on Windows; shell=False needs the .cmd form there.
    npm = "npm.cmd" if os.name == "nt" else "npm"
    chosen, reason = resolve_tier(tier, uncommitted=uncommitted)
    log(f"[motion-qa] tier {chosen} ({reason})")
    cmd = motion_qa_command(npm, chosen, parallel)
    if dry_run:
        log(f"[motion-qa] SKIPPED (--dry-run); would run: {' '.join(cmd)}")
        return 0
    log("[motion-qa] running live motion probes against the canary")
    rc = run(cmd, dry_run=False, cwd=PLUGIN_DIR)
    if rc == 0 and chosen == "full":
        if uncommitted:
            log("[motion-qa] full pass not recorded: this run shipped uncommitted files, so HEAD does not describe the code tested")
        elif skip_verify:
            log("[motion-qa] full pass not recorded: --skip-verify left the live plugin unconfirmed")
        else:
            note_full_pass()
    return rc


def step_verify_payload(use_alias: bool, wp_content: str, blocks: bool) -> int:
    """CHANGE-SPECIFIC verify: does the LIVE plugin match the payload we just shipped?

    ⛔ WHY THIS EXISTS. `step_verify()` above is deliberately cause-agnostic and
    GENERIC — it asserts the page returns 200 and contains `wp-block-sgs`. Every
    one of those assertions passes just as happily on LAST WEEK'S build. If a
    co-active session deploying from its own worktree ships an OLDER `build/`
    over this track's, every migrated `block.json` reverts to the pre-migration
    `type:string` schema. WordPress then rejects each object-valued attribute in
    `prepare_attributes_for_render()` and refills it from the old scalar default,
    so the value never reaches render.php at all — and a generic verify stays
    green.

    Compares the md5 of every deployed `build/blocks/*/block.json` against the
    local copy that was just packaged. block.json is the right file to check
    because it carries the ATTRIBUTE SCHEMA — the thing WordPress validates stored
    content against, and therefore the thing whose staleness silently discards
    data rather than erroring. It is also cheap: one SSH round trip, no per-file
    fetch.

    Cause-agnostic by construction: it does not care WHY the live copy differs
    (a racing deploy, a partial extract, a stale tar). Any difference fails.
    """
    import hashlib

    local_root = REPO_ROOT / "plugins" / "sgs-blocks" / "build" / "blocks"
    if not local_root.is_dir():
        err(f"[payload-verify] local build dir missing: {local_root}")
        return 1

    local: dict[str, str] = {}
    for bj in sorted(local_root.glob("*/block.json")):
        local[bj.parent.name] = hashlib.md5(bj.read_bytes()).hexdigest()
    if not local:
        err(f"[payload-verify] no block.json found under {local_root}")
        return 1

    remote_dir = f"{wp_content}/plugins/sgs-blocks/build/blocks"
    remote_cmd = (
        f"cd {shlex.quote(remote_dir)} 2>/dev/null && "
        "md5sum */block.json 2>/dev/null || echo __MISSING__"
    )
    log(f"[payload-verify] comparing {len(local)} block.json checksums against the live plugin")
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote_cmd], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=120)
    except (subprocess.SubprocessError, OSError) as e:
        err(f"[payload-verify] SSH failed: {e}")
        return 1
    if out.returncode != 0 or "__MISSING__" in (out.stdout or ""):
        err("[payload-verify] could not read the deployed build/blocks dir - "
            f"expected at {remote_dir}")
        return 1

    remote: dict[str, str] = {}
    for line in (out.stdout or "").splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[1].endswith("/block.json"):
            remote[parts[1].rsplit("/block.json", 1)[0]] = parts[0]

    if not remote:
        err("[payload-verify] the live plugin reported no block.json files at all")
        return 1

    mismatched = sorted(k for k in local if k in remote and local[k] != remote[k])
    missing = sorted(k for k in local if k not in remote)

    if not mismatched and not missing:
        log(f"[payload-verify] PASS: all {len(local)} deployed block.json match the payload")
        return 0

    # ASCII only past this point: err() writes to stderr, which is not
    # reconfigured to utf-8, so non-ASCII mangles on a Windows console.
    err(f"[payload-verify] FAIL: the LIVE plugin is not what this run shipped "
        f"({len(mismatched)} differ, {len(missing)} missing)")
    for name in mismatched[:12]:
        err(f"    differs : {name}  local={local[name][:8]} live={remote[name][:8]}")
    for name in missing[:12]:
        err(f"    missing : {name}")
    if len(mismatched) + len(missing) > 24:
        err(f"    ... and {len(mismatched) + len(missing) - 24} more")
    err("[payload-verify] MOST LIKELY CAUSE: another session deployed over this one "
        "(the canary is shared, and a worktree deploy ships ITS build/, not yours). "
        "Re-run this deploy, then re-check. Do NOT assume your code is live because "
        "the page returned 200 - that is exactly the D576 failure.")
    return 1


def step_verify(url: str) -> int:
    """Post-deploy smoke test. Returns non-zero when the deploy has broken the site.

    Runs by default (opt out with --skip-verify) and can fail: a verify that is
    opt-in or warn-only lets a deploy that took live sites down still report
    [DONE].

    Deliberately cause-agnostic: it does not care WHY the page is broken. That
    matters because a missing `use` statement is a RUNTIME class-resolution
    failure — `php -l` passes it cleanly and only fetching the real page
    catches it.
    """
    import urllib.error
    import urllib.request

    # Cache-bust + ask for an uncached render. LiteSpeed is active on sandybrown,
    # so a full-page-cached 200 can mask a live fatal — checking a cached copy is
    # checking a photograph of the site, not the site (cf. the project's own
    # "test-with-actual-cache-layer" lesson).
    bust = f"sgs_deploy_check={int(time.time())}"
    probe_url = f"{url}{'&' if '?' in url else '?'}{bust}"

    log(f"[verify] GET {probe_url}")
    status: int | None = None
    body = ""
    try:
        req = urllib.request.Request(probe_url, headers={
            "User-Agent": "sgs-build-deploy/1.0",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            # No Accept-Encoding: keep the body uncompressed so the fatal-string
            # check below reads real text rather than gzip bytes.
            "Accept-Encoding": "identity",
        })
        try:
            with urlopen_tls(req, "verify") as resp:
                status = resp.status
                body = resp.read(16384).decode("utf-8", errors="ignore")
        except urllib.error.HTTPError as e:
            # An HTTP 500 arrives as an exception but still carries the body.
            status = e.code
            body = e.read(16384).decode("utf-8", errors="ignore")
    except Exception as e:  # noqa: BLE001 — network/DNS/timeout
        err(f"[verify] request failed: {e}")
        return 1

    log(f"[verify] HTTP {status}, {len(body)} bytes sampled")

    if status is None or status >= 500:
        # ASCII only: err() writes to stderr, which (unlike stdout, line 53) is
        # not reconfigured to utf-8, so non-ASCII mangles on a Windows console.
        err(f"[verify] HTTP {status} - this deploy has broken {url}")
        err(f"[verify] {ROLLBACK_HINT}")
        return 1
    if "There has been a critical error" in body:
        err("[verify] WordPress fatal on the deployed page "
            "('There has been a critical error on this website')")
        err(f"[verify] {ROLLBACK_HINT}")
        return 1
    if status >= 400:
        err(f"[verify] HTTP {status} on {url}")
        return 1

    markers = ["wp-block-sgs", "sgs-", "wp-content"]
    found = [m for m in markers if m in body]
    if not found:
        # This branch fails closed: a verify leg that cannot fail reads green
        # forever.
        # NOTE this is a GENERIC assertion (these markers match any
        # working SGS page, including one running last week's build); it is
        # not change-specific — deliberately, because its job is "is the site
        # alive", not "is my code live".
        # The change-specific half is `step_verify_payload()` above: it md5s
        # every deployed block.json against the local payload over the SSH
        # connection this script already opens.
        # ⚠ That check proves AGREEMENT, not correctness — matching bytes mean
        # the live plugin is what this run shipped, never that what it shipped
        # is right. The deploy-ownership marker (`step_deploy_ownership()`)
        # turns a silent clobber of another session's deploy into a deliberate
        # one.
        err(f"[verify] none of {markers} found in {url} - "
            "the deployed page is not rendering SGS markup")
        err(f"[verify] {ROLLBACK_HINT}")
        return 1
    log(f"[verify] markers present: {found}")
    return 0
