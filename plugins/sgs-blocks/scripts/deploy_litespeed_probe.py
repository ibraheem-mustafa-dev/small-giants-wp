"""deploy_litespeed_probe.py - read-only post-deploy probe: LiteSpeed Cache's own lazy load and image optimisation
must stay off on the target (Spec 49 FR-49-42), so the framework's loading resolver decides loading and WordPress core
makes the modern-format copies. It warns and never fails the deploy.
"""
from __future__ import annotations

import shlex
import subprocess

from deploy_common import log, ssh_base_cmd

# LiteSpeed option name -> what it does when on.
LITESPEED_OPTIONS = {
    "litespeed.conf.media-lazy": "LiteSpeed lazy-loads images itself, overriding the framework's loading resolver",
    "litespeed.conf.img_optm-webp": "LiteSpeed's image optimisation rewrites images to WebP outside WordPress core",
}


def litespeed_warnings(values: dict[str, str | None]) -> list[str]:
    """One warning per option whose value is on ("1", "true" or "on"); a missing option is off."""
    warnings = []
    for option, effect in LITESPEED_OPTIONS.items():
        if (values.get(option) or "").strip().lower() in ("1", "true", "on"):
            warnings.append(f"{option} is ON: {effect}. Switch it off in LiteSpeed Cache settings.")
    return warnings


def step_litespeed_probe(dry_run: bool, use_alias: bool, wp_content: str) -> int:
    """Read the two LiteSpeed options over SSH; print a warning for each that is on. Always returns 0."""
    if dry_run:
        log("[litespeed] SKIPPED (--dry-run); would read " + ", ".join(LITESPEED_OPTIONS))
        return 0
    webroot = wp_content[: -len("/wp-content")] if wp_content.endswith("/wp-content") else wp_content
    reads = "; ".join(
        f"echo {shlex.quote(opt + '=')}$(wp option get {shlex.quote(opt)} 2>/dev/null)" for opt in LITESPEED_OPTIONS
    )
    cmd = ssh_base_cmd(use_alias) + ["cd " + shlex.quote(webroot) + " && " + reads]
    done = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if done.returncode != 0:
        log(f"[litespeed] WARNING: could not read the LiteSpeed options (exit {done.returncode}); check them by hand")
        return 0
    values: dict[str, str | None] = {}
    for line in (done.stdout or "").splitlines():
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip()
    warnings = litespeed_warnings(values)
    for warning in warnings:
        log("[litespeed] WARNING: " + warning)
    if not warnings:
        log("[litespeed] lazy load and image optimisation are off")
    return 0
