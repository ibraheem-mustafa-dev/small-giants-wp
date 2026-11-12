"""Offline proof of `remote.py` with a fake server behind the `Runner` seam (no SSH, no network).

The fake answers the exact commands `remote.py` sends: home folder, export, backup, upload, `wp eval-file`, cleanup, import.
Its `eval-file` stands in for `apply-content.php` (whose own transaction and MD5 re-check `apply_selftest.py` proves against
the real PHP). Planted rows prove: apply writes them and the verification reads them back; a row changed since the export
rolls back with no write; an empty backup stops the run before any write; restore issues the import and refuses a path
outside the backups folder.
"""
from __future__ import annotations

import contextlib
import hashlib
import io
import json
import re

import mirror as MIR
import remote as R

HOME = "/home/u1"
WP = "domains/h.example/public_html"
OLD = '<!-- wp:sgs/hero {"backgroundImage":"a"} /-->'
NEW = '<!-- wp:sgs/hero {"background":"a"} /-->'


def fn(name, attrs):
    return {("background" if k == "backgroundImage" else k): v for k, v in attrs.items()}


def record(post_id: int, content: str) -> dict:
    return {"store": "posts", "ID": post_id, "sub": "", "post_type": "page", "post_name": f"p{post_id}",
            "post_status": "publish", "post_content": content, "md5": hashlib.md5(content.encode()).hexdigest()}


class FakeServer(R.Runner):
    def __init__(self, rows: dict[int, str], backup_bytes: int = 100):
        self.rows, self.backup_bytes, self.log, self.files = dict(rows), backup_bytes, [], {}
        self.wp_content = f"{WP}/wp-content"

    def run(self, script: str):
        self.log.append(script)
        if script.startswith('printf %s "$HOME"'):
            return 0, HOME, ""
        if "eval \"$(echo " in script:
            out = json.dumps([record(i, c) for i, c in self.rows.items()] + [{"store": "attachments", "files": {}}])
            return 0, "Warning: noise [x]\n" + out, ""
        if "mysqldump" in script:
            path = re.search(r"> (\S+) && test -s", script).group(1)
            if self.backup_bytes == 0:
                return 1, "", "empty dump"
            self.files[path] = self.backup_bytes
            return 0, "", ""
        if script.startswith("wc -c <"):
            return 0, str(self.files.get(script.split("<")[1].strip(), 0)), ""
        if "eval-file" in script:
            tmp = re.search(r"eval-file (\S+)/apply-content.php", script).group(1)
            payload = json.loads(self.files[f"{tmp}/payload.json"])
            if any(hashlib.md5(self.rows[r["ID"]].encode()).hexdigest() != r["md5"] for r in payload):
                return 1, "", "apply-content: a row changed since the export; rolled back, nothing written"
            for r in payload:
                self.rows[r["ID"]] = r["content"]
            return 0, json.dumps({"updated": len(payload)}), ""
        if script.startswith("rm -rf"):
            for path in [p for p in self.files if p.startswith(script.split()[-1])]:
                del self.files[path]
            return 0, "", ""
        return 0, "", ""  # mkdir, test -s, the mysql import, cache flush

    def put(self, path: str, data: bytes) -> None:
        self.log.append(f"PUT {path}")
        self.files[path] = data if path.endswith("apply-content.php") else data.decode("ascii")
        if path.endswith("payload.json"):
            self.files[path] = data.decode("ascii")

    def wrote(self) -> bool:
        return any("eval-file" in s for s in self.log)


def run(failures: list[str]) -> int:
    with contextlib.redirect_stdout(io.StringIO()):
        return _run(failures)


def _run(failures: list[str]) -> int:
    total = 0

    def check(ok: bool, message: str) -> None:
        nonlocal total
        total += 1
        if not ok:
            failures.append(f"remote: {message}")

    def make(rows, **kw):
        server = FakeServer(rows, **kw)
        return server, R.Remote("t", runner=server)

    # paths: the relative wp_content is made absolute under the server home; backups sit outside public_html
    server, remote = make({1: OLD, 2: "<!-- wp:sgs/hero {\"headline\":\"x\"} /-->"})
    check(remote.wp == f"{HOME}/{WP}", f"wp path {remote.wp}")
    check(remote.backups == f"{HOME}/sgs-media-backups/t" and "public_html" not in remote.backups, f"backups folder {remote.backups}")

    # 1. apply writes the planted row, only that row, and verifies it
    plan = MIR.plan_rewrites(remote.export(), fn)
    check(len(plan) == 1 and plan[0]["content"] == NEW, f"plan {[p['label'] for p in plan]}")
    backup = remote.apply_fix(plan)
    check(server.rows[1] == NEW and server.rows[2].count("headline") == 1, "apply did not write exactly the planted row")
    check(re.fullmatch(re.escape(remote.backups) + r"/t-\d{8}-\d{6}\.sql", backup) is not None, f"backup path {backup}")
    order = [i for i, s in enumerate(server.log) if "mysqldump" in s or "eval-file" in s]
    check(len(order) == 2 and "mysqldump" in server.log[order[0]], "the backup did not come before the write")
    check(not any(p.startswith("/tmp/sgs-media-apply-") for p in server.files), "temp files were not deleted")
    check(any(s.startswith("PUT") and s.endswith("apply-content.php") for s in server.log), "apply-content.php was not uploaded")

    # 2. a second run finds nothing to rewrite (idempotent on the server state)
    check(MIR.plan_rewrites(remote.export(fresh=True), fn) == [], "a second plan still found rows")

    # 3. a row changed since the export: nothing written, run stops, restore command offered
    server, remote = make({1: OLD})
    plan = MIR.plan_rewrites(remote.export(), fn)
    server.rows[1] = OLD + "<!-- edited -->"
    try:
        remote.apply_fix(plan)
        check(False, "a row changed since the export did not stop the run")
    except SystemExit as stop:
        check("changed since the export" in str(stop), f"rollback message {stop}")
    check(server.rows[1].endswith("<!-- edited -->") and "background\"" not in server.rows[1], "a changed row was overwritten")

    # 4. an empty backup (failed dump, or a zero-byte file) stops before any write
    for kind, kw in (("failed dump", {"backup_bytes": 0}),):
        server, remote = make({1: OLD}, **kw)
        plan = MIR.plan_rewrites(remote.export(), fn)
        try:
            remote.apply_fix(plan)
            check(False, f"{kind} did not stop the run")
        except SystemExit:
            pass
        check(not server.wrote() and server.rows[1] == OLD, f"{kind}: something was written")
    server, remote = make({1: OLD})
    real_run = server.run
    server.run = lambda s: (0, "0", "") if s.startswith("wc -c <") else real_run(s)
    plan = MIR.plan_rewrites(remote.export(), fn)
    try:
        remote.apply_fix(plan)
        check(False, "a zero-byte backup file did not stop the run")
    except SystemExit as stop:
        check("empty" in str(stop), f"zero-byte message {stop}")
    check(not server.wrote() and server.rows[1] == OLD, "zero-byte backup: something was written")

    # 5. restore imports a backup from the backups folder, refuses any other path
    server, remote = make({1: OLD})
    good = f"{remote.backups}/t-20260101-000000.sql"
    remote.restore(good)
    check(any("mysql " in s and "< " + good in s for s in server.log), "restore did not issue the import")
    for bad in ("/etc/passwd", f"{remote.backups}/../x.sql", f"{HOME}/other/t.sql", f"{remote.backups}/a;rm.sql"):
        before = len(server.log)
        try:
            remote.restore(bad)
            check(False, f"restore accepted {bad}")
        except SystemExit:
            check(len(server.log) == before, f"restore ran a command for {bad}")

    # 6. an unknown export (no JSON list) fails closed
    server, remote = make({})
    server.run = lambda s: (0, "not json", "")
    try:
        remote.export()
        check(False, "an unreadable export did not fail")
    except SystemExit:
        check(True, "")
    return total
