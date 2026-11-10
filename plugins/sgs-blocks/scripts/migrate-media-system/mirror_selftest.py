"""Proof of the saved-content tools on a scratch mirror: `cli.py self-test --mirror`.

Builds /var/www/local-mediatest (a copy of local-sandybrown's files, minus uploads, and of its database under the name
wp_mediatest), then proves in order: dry run writes nothing; `fix --apply` backs up, rewrites and leaves
`check --active on` clean; a second fix has nothing to do (idempotent); `restore` returns the database tables to the
original bytes (table checksums and every exported row); and a deliberately broken mapping makes `check` fail. The
scratch mirror, its database and its backups are deleted afterwards. The four real mirrors are only read.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import blocks as B
import corpus as C
import mirror as MIR

SOURCE = "sandybrown"
SCRATCH = "mediatest"
HERE = Path(__file__).resolve().parent
CLI = [sys.executable, str(HERE / "cli.py")]
TABLES = ("posts", "postmeta", "options")


def sh(script: str, what: str) -> str:
    return MIR.run(script, what)


def build_scratch() -> None:
    src, dst = MIR.wp_path(SOURCE), MIR.wp_path(SCRATCH)
    sh(f"""set -e
test -f {src}/wp-config.php
[ ! -e {dst} ] || {{ echo "{dst} already exists: delete it first" >&2; exit 1; }}
user=$(wp --path={src} --allow-root config get DB_USER)
mysql -e "DROP DATABASE IF EXISTS wp_{SCRATCH}; CREATE DATABASE wp_{SCRATCH}; GRANT ALL ON wp_{SCRATCH}.* TO '$user'@'localhost'; FLUSH PRIVILEGES;"
wp --path={src} --allow-root db export - | mysql wp_{SCRATCH}
mkdir -p {dst}
rsync -a --exclude=/wp-content/uploads --exclude=/wp-content/cache {src}/ {dst}/
mkdir -p {dst}/wp-content/uploads
wp --path={dst} --allow-root config set DB_NAME wp_{SCRATCH} >/dev/null
test "$(wp --path={dst} --allow-root db query 'SELECT DATABASE()' --skip-column-names)" = wp_{SCRATCH}
""", "scratch mirror build")


def drop_scratch() -> None:
    dst = MIR.wp_path(SCRATCH)
    if not re.fullmatch(r"/var/www/local-mediatest[a-z0-9-]*", dst):
        raise SystemExit(f"refusing to delete {dst}")
    sh(f'mysql -e "DROP DATABASE IF EXISTS wp_{SCRATCH}"; rm -rf {dst} {MIR.backup_dir(SCRATCH)}', "scratch mirror delete")


def checksums() -> dict:
    out = sh(f"wp --path={MIR.wp_path(SCRATCH)} --allow-root db query 'CHECKSUM TABLE " + ", ".join(f"wp_{t}" for t in TABLES) + "' --skip-column-names", "table checksum")
    return {line.split("\t")[0]: line.split("\t")[1] for line in out.strip().splitlines()}


def cli(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([*CLI, *args], capture_output=True, text=True, encoding="utf-8", check=False)


def run(keep: bool = False) -> int:
    failures: list[str] = []
    checks = 0

    def expect(ok: bool, label: str, detail: str = "") -> None:
        nonlocal checks
        checks += 1
        print(("  ok    " if ok else "  FAIL  ") + label + ("" if ok else f": {detail}"))
        if not ok:
            failures.append(label)

    source_before = {(p["store"], p["ID"], p["sub"]): p["md5"] for p in C.mirror_export(SOURCE)}
    print(f"building scratch mirror {SCRATCH} from {SOURCE} ({len(source_before)} content rows)")
    try:
        build_scratch()
        base_sums = checksums()
        base_rows = {(p["store"], p["ID"], p["sub"]): p["md5"] for p in C.mirror_export(SCRATCH, fresh=True)}
        expect(base_rows == source_before, "scratch content equals the source's before any change")
        before_dry = checksums()
        dry = cli("fix", "--mirror", SCRATCH, "--dry-run")
        expect(dry.returncode == 0 and "would change" in dry.stderr and "would change 0 " not in dry.stderr and checksums() == before_dry, "dry run prints a diff and writes nothing", dry.stderr[-300:])
        first = cli("check", "--mirror", SCRATCH, "--active", "on")
        expect(first.returncode == 1, "check fails on the unmigrated content (old attributes present)", first.stdout[-300:])
        pre_sums = checksums()
        pre_rows = {(p["store"], p["ID"], p["sub"]): p["md5"] for p in C.mirror_export(SCRATCH, fresh=True)}
        applied = cli("fix", "--mirror", SCRATCH, "--apply")
        backup = re.search(r"database backup: (\S+)", applied.stdout)
        expect(applied.returncode == 0 and backup is not None and "restore with:" in applied.stdout, "fix --apply prints the backup path and the restore command", applied.stdout[-400:] + applied.stderr[-400:])
        expect(backup is not None and MIR.run(f"test -s {backup.group(1)} && echo ok", "backup file").strip() == "ok", "the backup file exists and is not empty")
        changed = checksums() != base_sums
        expect(changed, "fix --apply changed the saved content")
        after = cli("check", "--mirror", SCRATCH, "--active", "on")
        left = [line for line in after.stdout.splitlines()[1:] if line.strip()]
        expect(after.returncode == 1 and left and all("[reported]" in line or "[refused]" in line for line in left),
               "after the fix only `reported` and `refused` attributes remain (the by-hand items); every converted and deleted one is gone",
               after.stdout[-600:] + after.stderr[-300:])
        print("        remaining by-hand items: " + "; ".join(line.split(" first in")[0].strip() for line in left))
        again = cli("fix", "--mirror", SCRATCH, "--apply")
        expect(again.returncode == 0 and "nothing to rewrite" in again.stderr and "database backup" not in again.stdout, "a second fix has nothing to do (idempotent, no backup)", again.stdout[-300:] + again.stderr[-300:])
        sums_fixed = checksums()
        if backup:
            restored = cli("restore", "--mirror", SCRATCH, "--backup", backup.group(1))
            expect(restored.returncode == 0, "restore runs", restored.stderr[-300:])
            rows = {(p["store"], p["ID"], p["sub"]): p["md5"] for p in C.mirror_export(SCRATCH, fresh=True)}
            sums_restored = checksums()
            expect(sums_restored == pre_sums and rows == pre_rows and pre_sums != sums_fixed,
                   "restore returns every table checksum and every exported row's bytes to the state before the fix",
                   f"tables differing: {[t for t in pre_sums if sums_restored.get(t) != pre_sums[t]]}; rows differing: {sum(1 for k in pre_rows if rows.get(k) != pre_rows[k])}")
        broken = fix_with_broken_mapping()
        expect(broken is not None, "the broken mapping's fix applied")
        neg = cli("check", "--mirror", SCRATCH, "--active", "on")
        named = [line for line in neg.stdout.splitlines() if (broken or "?") in line and "[reported]" not in line]
        expect(neg.returncode == 1 and bool(named), "negative control: a deliberately broken mapping leaves a converted attribute on the skipped block and check names it", neg.stdout[-300:])
        guard = cli("restore", "--mirror", SCRATCH, "--backup", "/etc/passwd")
        expect(guard.returncode != 0, "restore refuses a file outside the backups folder")
        source_after = {(p["store"], p["ID"], p["sub"]): p["md5"] for p in C.mirror_export(SOURCE, fresh=True)}
        expect(source_after == source_before, f"the source mirror {SOURCE} was not changed")
    finally:
        if not keep:
            drop_scratch()
            print(f"scratch mirror {SCRATCH}, its database and backups deleted")
    print(f"migrate-media-system mirror self-test: {checks - len(failures)} of {checks} checks passed")
    return 1 if failures else 0


def fix_with_broken_mapping() -> str | None:
    """Apply a fix whose mapping skips the block with the most old attributes; returns that block's name."""
    posts = C.mirror_export(SCRATCH, fresh=True)
    counts: dict = {}
    for _label, name, attrs in C.content_blocks(posts):
        if B.old_attributes(name, attrs):
            counts[name] = counts.get(name, 0) + 1
    if not counts:
        return None
    victim = max(counts, key=counts.get)

    def broken(name: str, attrs: dict):
        return None if name == victim else B.migrate(name, attrs)[0]

    plan = MIR.plan_rewrites(posts, broken)
    MIR.apply_fix(SCRATCH, plan)
    return victim


if __name__ == "__main__":
    sys.exit(run())
