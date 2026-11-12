"""Saved content on a live test site over SSH: rewrite, back up, restore (Spec 49 §13, the per-site deploy-and-migrate step).

The same steps as `mirror.py`, run through `ssh` on the target's server instead of `wsl` on a mirror:
export (`corpus.export_command`, read-only), plan (`mirror.plan_rewrites`), then `apply_fix`: `wp db export` to a dated file
in `~/sgs-media-backups/<target>/` (outside public_html; an empty or failed backup stops the run), upload `apply-content.php`
and the payload to a temp folder, `wp eval-file` (a transaction that re-checks each row's MD5), delete the temp files, re-export
and verify every written row. `restore` imports a backup this module made. The SSH helpers are the deploy's own
(`deploy_common.ssh_base_cmd`, `ssh_has_alias`, `TARGETS`). Tests inject a fake `Runner`.
"""
from __future__ import annotations

import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

import corpus as C
import mirror as MIR
import sizes

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
BACKUP_SUBDIR = "sgs-media-backups"
SSH_TIMEOUT = 300


class Runner:
    """Runs a bash script on the target and writes a file there. `run` returns (returncode, stdout, stderr) as text."""

    wp_content = ""

    def run(self, script: str) -> tuple[int, str, str]:
        raise NotImplementedError

    def put(self, path: str, data: bytes) -> None:
        raise NotImplementedError


class SshRunner(Runner):
    def __init__(self, target: str):
        sys.path.insert(0, str(SCRIPTS))
        import deploy_common as D
        if target not in D.TARGETS:
            raise SystemExit(f"unknown target {target!r}; known: {', '.join(sorted(D.TARGETS))}")
        self.wp_content = D.TARGETS[target]["wp_content"]
        self.base = D.ssh_base_cmd(D.ssh_has_alias(D.SSH_ALIAS))

    def run(self, script: str) -> tuple[int, str, str]:
        done = subprocess.run(self.base + ["bash -s"], input=(script + "\n").encode("utf-8"), capture_output=True,
                              check=False, timeout=SSH_TIMEOUT)
        return done.returncode, done.stdout.decode("utf-8", "replace"), done.stderr.decode("utf-8", "replace")

    def put(self, path: str, data: bytes) -> None:
        if C.UNSAFE_PATH.search(path):
            raise SystemExit(f"remote path {path!r} uses characters outside letters, digits and _ . / -")
        done = subprocess.run(self.base + [f"cat > {path}"], input=data, capture_output=True, check=False, timeout=SSH_TIMEOUT)
        if done.returncode != 0:
            raise SystemExit(f"could not write {path} on the server: {done.stderr.decode('utf-8', 'replace')[:200]}")


class Remote:
    """One target: its WordPress folder, its backups folder and a runner."""

    def __init__(self, target: str, runner: Runner | None = None, wp_root: str | None = None, home: str | None = None):
        self.target = target
        self.runner = runner or SshRunner(target)
        root = wp_root or self.runner.wp_content.rsplit("/wp-content", 1)[0]
        self.home = home if home is not None else self._home()
        self.wp = C.check_wp_path(root if root.startswith("/") else f"{self.home}/{root}")
        self.backups = C.check_wp_path(f"{self.home}/{BACKUP_SUBDIR}/{self.target}")
        self.exported: list[dict] | None = None
        # The site's own address (`domains/<host>/public_html`), which a site-relative image path is read against.
        parts = root.split("/")
        self.base_url = f"https://{parts[parts.index('domains') + 1]}" if "domains" in parts[:-1] else None

    def _home(self) -> str:
        code, out, err = self.runner.run('printf %s "$HOME"')
        if code != 0 or not out.startswith("/"):
            raise SystemExit(f"cannot read the server home folder (exit {code}): {(err or out).strip()[:300]}")
        return out.strip()

    def sh(self, script: str, what: str) -> str:
        code, out, err = self.runner.run(script)
        if code != 0:
            raise SystemExit(f"{what} failed (exit {code}): {(err or out).strip()[:400]}")
        return out

    def export(self, fresh: bool = False) -> list[dict]:
        """Every saved block-markup record of the target (kept for the run; `fresh` re-reads). Registers the attachment map for HTTP size reads."""
        if self.exported is not None and not fresh:
            return self.exported
        code, out, err = self.runner.run(C.export_command(self.wp))
        posts = None
        for line in out.splitlines():
            if line.startswith("["):
                try:
                    posts = json.loads(line)
                    break
                except ValueError:
                    continue
        if code != 0 or posts is None:
            raise SystemExit(f"export of {self.target} failed (exit {code}): {err.strip()[:300] or out.strip()[:300]}")
        records, files = sizes.split_export(posts)
        sizes.register(f"remote:{self.target}", files, base=self.base_url)
        self.exported = records
        return records

    def make_backup(self) -> str:
        """`wp db export` to a dated file outside public_html; refuses to go on unless the file is non-empty."""
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        path = C.check_wp_path(f"{self.backups}/{self.target}-{stamp}.sql")
        self.sh(f"mkdir -p {self.backups} && chmod 700 {self.backups} && wp --path={self.wp} db export {path} && test -s {path}",
                "database backup")
        size = self.sh(f"wc -c < {path}", "database backup size check").strip()
        if not size.isdigit() or int(size) <= 0:
            raise SystemExit(f"database backup {path} is empty; nothing was written")
        return path

    def restore_command(self, backup: str) -> str:
        return f"python plugins/sgs-blocks/scripts/migrate-media-system/cli.py restore --remote {self.target} --backup {backup}"

    def apply_fix(self, plan: list[dict]) -> str:
        """Back up, write every planned row, verify each one reads back as written. Returns the backup path."""
        backup = self.make_backup()
        print(f"database backup: {backup} (on the server)")
        print(f"restore with:    {self.restore_command(backup)}")
        tmp = f"/tmp/sgs-media-apply-{Path(backup).stem}"
        payload = [{k: r[k] for k in ("store", "ID", "sub", "md5", "content")} for r in plan]
        self.sh(f"mkdir -p {tmp} && chmod 700 {tmp}", "temp folder")
        try:
            self.runner.put(f"{tmp}/apply-content.php", (HERE / "apply-content.php").read_bytes())
            self.runner.put(f"{tmp}/payload.json", json.dumps(payload, ensure_ascii=True).encode("ascii"))
            out = self.sh(f"wp --path={self.wp} eval-file {tmp}/apply-content.php {tmp}/payload.json", "saved-content write")
        finally:
            self.runner.run(f"rm -rf {tmp}")
        lines = [ln for ln in out.strip().splitlines() if ln.startswith("{")]
        written = json.loads(lines[-1])["updated"] if lines else -1
        now = {(p["store"], p["ID"], p.get("sub", "")): p["md5"] for p in self.export(fresh=True)}
        wrong = [r["label"] for r in plan if now.get((r["store"], r["ID"], r["sub"])) != MIR.md5(r["content"])]
        if written != len(plan) or wrong:
            raise SystemExit(f"write verification failed: wrote {written} of {len(plan)}; rows not as written: {wrong[:5]}; "
                             f"restore with: {self.restore_command(backup)}")
        print(f"wrote {written} row(s), each read back byte-identical to the rewrite")
        return backup

    def restore(self, backup: str) -> None:
        """Import a backup made by `apply_fix`, then clear the object cache."""
        if not re.fullmatch(re.escape(self.backups) + r"/[A-Za-z0-9._-]+\.sql", backup):
            raise SystemExit(f"backup must be a .sql file directly inside {self.backups}/")
        self.sh(f"test -s {backup}", f"backup {backup} is missing or empty:")
        self.sh(f"wp --path={self.wp} db import {backup} && wp --path={self.wp} cache flush", "restore")
        print(f"restored {self.target} from {backup}")


_CONNECTIONS: dict[str, Remote] = {}


def get(target: str) -> Remote:
    if target not in _CONNECTIONS:
        _CONNECTIONS[target] = Remote(target)
    return _CONNECTIONS[target]


def remote_export(target: str, fresh: bool = False) -> list[dict]:
    return get(target).export(fresh)
