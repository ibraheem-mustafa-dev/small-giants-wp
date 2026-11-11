"""Saved content on a local mirror: rewrite, back up, restore (Spec 49 §13).

A mirror is the WordPress at /var/www/local-<name> in WSL Ubuntu. `apply_fix` backs the database up first
(`wp db export` to /var/www/local-<name>-backups/), then writes the rewritten rows through `apply-content.php`
(`wp eval-file`, a direct `$wpdb` update: `wp_update_post` would run kses and add revisions), then re-reads every row
it wrote. `restore` imports a backup this module made. Nothing here touches a host other than a local mirror.
"""
from __future__ import annotations

import datetime
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Callable

import corpus as C
import markup

HERE = Path(__file__).resolve().parent
CLI = HERE / "cli.py"
WRITABLE = ("posts", "postmeta", "option")
DIFF_LIMIT = 60


def md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def wp_path(name: str) -> str:
    return f"/var/www/local-{C.check_mirror_name(name)}"


def backup_dir(name: str) -> str:
    return f"{wp_path(name)}-backups"


def run(script: str, what: str) -> str:
    result = C.wsl(script)
    out, err = C.wsl_text(result)
    if result.returncode != 0:
        raise SystemExit(f"{what} failed (exit {result.returncode}): {(err or out).strip()[:400]}")
    return out


def require_mirror(name: str) -> None:
    run(f"test -f {wp_path(name)}/wp-config.php", f"mirror {name!r} not found at {wp_path(name)}:")


def wsl_path(windows_path: Path) -> str:
    return subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "wslpath", "-a", windows_path.as_posix()],
                          capture_output=True, text=True, check=True).stdout.strip()


def plan_rewrites(posts: list[dict], fn: Callable) -> list[dict]:
    """The records whose markup the mapping changes: [{store, ID, sub, md5, content, label, before, blocks}]."""
    plan = []
    for post in posts:
        if post.get("store") == "unsupported":
            continue
        after, count = markup.rewrite_markup(post.get("post_content", ""), fn)
        if count:
            plan.append({"store": post["store"], "ID": post["ID"], "sub": post.get("sub", ""), "md5": post["md5"], "content": after,
                         "label": f"{post.get('post_type')}-{post.get('ID')}{('-' + post['sub']) if post.get('sub') else ''}",
                         "before": post["post_content"], "blocks": count})
    return plan


def unsupported(posts: list[dict]) -> list[str]:
    """Names of the records (options, post meta) that hold `wp:sgs/` markup in a shape this tool cannot rewrite."""
    return [str(p.get("ID")) for p in posts if p.get("store") == "unsupported"]


def refuse_unsupported(posts: list[dict], name: str) -> None:
    names = unsupported(posts)
    if names:
        raise SystemExit(f"{name}: record(s) {', '.join(names)} hold block markup in a shape this tool cannot rewrite; "
                         "resolve them by hand before fix or check can pass")


def make_backup(name: str) -> str:
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = f"{backup_dir(name)}/{name}-{stamp}.sql"
    run(f"mkdir -p {backup_dir(name)} && wp --path={wp_path(name)} --allow-root db export {path} && test -s {path}", "database backup")
    return path


def restore_command(name: str, backup: str) -> str:
    return f"python plugins/sgs-blocks/scripts/migrate-media-system/cli.py restore --mirror {name} --backup {backup}"


def apply_fix(name: str, plan: list[dict]) -> str:
    """Back up, write every planned row, verify each one reads back as written. Returns the backup path."""
    require_mirror(name)
    backup = make_backup(name)
    print(f"database backup: {backup} (WSL path)")
    print(f"restore with:    {restore_command(name, backup)}")
    tmp = f"/tmp/sgs-media-apply-{Path(backup).stem}.json"
    payload = [{k: r[k] for k in ("store", "ID", "sub", "md5", "content")} for r in plan]
    C.wsl_put(tmp, json.dumps(payload, ensure_ascii=True).encode("ascii"))
    try:
        out = run(f"wp --path={wp_path(name)} --allow-root eval-file {wsl_path(HERE / 'apply-content.php')} {tmp}", "saved-content write")
    finally:
        C.wsl(f"rm -f {tmp}")
    written = json.loads(out.strip().splitlines()[-1])["updated"]
    now = {(p["store"], p["ID"], p.get("sub", "")): p["md5"] for p in C.mirror_export(name, fresh=True)}
    wrong = [r["label"] for r in plan if now.get((r["store"], r["ID"], r["sub"])) != md5(r["content"])]
    if written != len(plan) or wrong:
        raise SystemExit(f"write verification failed: wrote {written} of {len(plan)}; rows not as written: {wrong[:5]}; "
                         f"restore with: {restore_command(name, backup)}")
    print(f"wrote {written} row(s), each read back byte-identical to the rewrite")
    return backup


def restore(name: str, backup: str) -> None:
    """Import a backup made by `apply_fix`, then clear the object cache."""
    if not re.fullmatch(re.escape(backup_dir(name)) + r"/[A-Za-z0-9._-]+\.sql", backup):
        raise SystemExit(f"backup must be a .sql file directly inside {backup_dir(name)}/")
    require_mirror(name)
    run(f"test -s {backup}", f"backup {backup} is missing or empty:")
    run(f"wp --path={wp_path(name)} --allow-root db import {backup} && wp --path={wp_path(name)} --allow-root cache flush", "restore")
    print(f"restored {name} from {backup}")


def print_diffs(plan: list[dict], unified) -> None:
    for row in plan[:DIFF_LIMIT]:
        print(f"# {row['label']}: {row['blocks']} block(s) rewritten ({row['store']})")
        sys.stdout.write(unified(row["label"], row["before"], row["content"]))
    if len(plan) > DIFF_LIMIT:
        print(f"\n... {len(plan) - DIFF_LIMIT} more row(s) not shown")
