"""Scratch copies for the render check: made with scripts/local-wp/scratch-mirror.sh, given a build with that build's
own sync-build.sh, seeded with seed.php, snapshotted after seeding and restored before every capture pass, dropped at
the end. Every command runs in WSL as the mirrors do.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent


class SiteError(RuntimeError):
    pass


def to_wsl(path: Path | str) -> str:
    p = str(Path(path).resolve()).replace("\\", "/")
    m = re.match(r"^([A-Za-z]):/(.*)$", p)
    if not m:
        raise SiteError(f"not a Windows drive path: {p}")
    return f"/mnt/{m.group(1).lower()}/{m.group(2)}"


def wsl(cmd: str, timeout: int = 1800) -> str:
    r = subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", "-c", cmd], capture_output=True, timeout=timeout)
    out = r.stdout.decode("utf-8", "replace")
    if r.returncode != 0:
        err = r.stderr.decode("utf-8", "replace")
        raise SiteError(f"WSL command failed ({r.returncode}): {cmd[:160]}\n{(out + err)[-1500:]}")
    return out


def wp(name: str, args: str, timeout: int = 600) -> str:
    return wsl(f"cd /var/www/{name} && sudo -u www-data wp --path=/var/www/{name} {args}", timeout)


def free_ports(n: int) -> list[int]:
    used = set(int(p) for p in re.findall(r":(\d+)\s", wsl("ss -ltn")))
    used |= set(int(p) for p in re.findall(r"^Listen (\d+)", wsl("cat /etc/apache2/ports.conf"), re.M))
    # Ports claimed by a copy still being made (scratch-mirror.sh writes its site file first, enables it last).
    used |= set(int(p) for p in re.findall(r"\*:(\d+)>", wsl("cat /etc/apache2/sites-available/*.conf 2>/dev/null || true")))
    free = [p for p in range(8150, 8200) if p not in used] + [p for p in range(8104, 8150) if p not in used]
    if len(free) < n:
        raise SiteError("no free scratch ports between 8104 and 8199")
    return free[:n]


def create(source: str, name: str) -> int:
    """Make a copy on a free port and return the port. The port is chosen just before scratch-mirror.sh claims it under
    its lock, and a port another session claimed in between is skipped, up to three tries."""
    for attempt in range(3):
        port = free_ports(1)[0]
        try:
            wsl(f"bash {to_wsl(REPO / 'scripts/local-wp/scratch-mirror.sh')} create {source} {name} {port}", 1200)
            return port
        except SiteError as e:
            taken = re.search(r"port \d+ (is claimed by another copy|is in use|is already listened on)", str(e))
            if not taken or attempt == 2:
                raise
    raise SiteError("unreachable")


def drop(name: str) -> None:
    wsl(f"rm -f /tmp/rc-{name}.sql; bash {to_wsl(REPO / 'scripts/local-wp/scratch-mirror.sh')} drop {name}", 600)


def exists(name: str) -> bool:
    return name in wsl(f"bash {to_wsl(REPO / 'scripts/local-wp/scratch-mirror.sh')} list")


def sync_build(build: Path, name: str) -> None:
    """Copy a build onto a copy with that build's own sync script, so its plugins, theme and theme.json arrive together."""
    script = build / "scripts/local-wp/sync-build.sh"
    if not script.exists():
        raise SiteError(f"{build} has no scripts/local-wp/sync-build.sh: not a checkout")
    wsl(f"bash {to_wsl(script)} {name}", 3600)


def run_php(name: str, script: Path, arg: Path) -> str:
    return wp(name, f"eval-file {to_wsl(script)} {to_wsl(arg)}")


def seed(name: str, args_file: Path) -> dict:
    out = run_php(name, HERE / "seed.php", args_file)
    lines = [ln for ln in out.splitlines() if ln.startswith("{")]
    if not lines:
        raise SiteError(f"seed.php printed no result on {name}: {out[-800:]}")
    return json.loads(lines[-1])


def states(name: str, seed_file: Path) -> list[dict]:
    out = run_php(name, HERE / "states.php", seed_file)
    lines = [ln for ln in out.splitlines() if ln.startswith("[")]
    if not lines:
        raise SiteError(f"states.php printed no list on {name}: {out[-800:]}")
    return json.loads(lines[-1])


def snapshot(name: str) -> None:
    wp(name, f"db export /tmp/rc-{name}.sql --quiet")


def restore(name: str) -> None:
    wp(name, f"db import /tmp/rc-{name}.sql --quiet && sudo -u www-data wp --path=/var/www/{name} cache flush")


def target_for(source: str, explicit: str | None) -> tuple[str, str]:
    """(target, client) whose accepted-differences file applies: the one named, else the one deploy target whose
    editor mirror is the source and that is not a reference site."""
    sys.path.insert(0, str(REPO / "plugins/sgs-blocks/scripts"))
    from deploy_common import TARGETS  # noqa: E402

    if explicit:
        if explicit not in TARGETS:
            raise SiteError(f"unknown target {explicit}")
        return explicit, TARGETS[explicit]["client"]
    hits = [t for t, v in TARGETS.items() if v.get("editor_mirror") == source and v.get("kind") != "reference"]
    if len(hits) != 1:
        raise SiteError(f"{source} maps to {hits or 'no'} deploy target: pass --target")
    return hits[0], TARGETS[hits[0]]["client"]
