#!/usr/bin/env python3
"""push_target.py - Resolve a push-to-remote.sh target from the one deploy roster.

Reads plugins/sgs-blocks/scripts/deploy_common.py::TARGETS (each site's host and remote wp-content path, and its
"kind") and the shared SSH endpoint beside it (SSH_USER_HOST, SSH_FALLBACK), so push-to-remote.sh keeps no roster or
SSH details of its own.

    python scripts/local-wp/push_target.py <target>      prints shell assignments for push-to-remote.sh to eval
    python scripts/local-wp/push_target.py --list        prints the targets a mirror may be copied into
    python scripts/local-wp/push_target.py --self-test   checks the refusals against the real roster

Only a target whose "kind" is "test" is accepted: the canary and any reference site are refused (exit 1), as is an
unknown name. The printed values are quoted with shlex.quote, so evaluating them can run nothing.
"""
from __future__ import annotations

import shlex
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "plugins" / "sgs-blocks" / "scripts"))
import deploy_common  # noqa: E402

PUSH_KIND = "test"


def allowed_targets() -> list[str]:
    """The targets a mirror may be copied into: every TARGETS entry of kind "test"."""
    return sorted(name for name, t in deploy_common.TARGETS.items() if t.get("kind") == PUSH_KIND)


def ssh_parts() -> tuple[str, str, str]:
    """(user@host, port, key path) from deploy_common's shared SSH endpoint."""
    fallback = deploy_common.SSH_FALLBACK
    key = fallback[fallback.index("-i") + 1]
    port = fallback[fallback.index("-p") + 1]
    return deploy_common.SSH_USER_HOST, port, key


def resolve(name: str) -> dict[str, str]:
    """The settings push-to-remote.sh needs for `name`; raises ValueError when it may not be a push target."""
    target = deploy_common.TARGETS.get(name)
    if target is None:
        raise ValueError(f"'{name}' is not a deploy target; push targets: {', '.join(allowed_targets())}")
    kind = target.get("kind", "")
    if kind != PUSH_KIND:
        raise ValueError(f"'{name}' is a {kind or 'kind-less'} site, not a test site; push targets: {', '.join(allowed_targets())}")
    wp_content = target["wp_content"].rstrip("/")
    if not wp_content.endswith("/wp-content"):
        raise ValueError(f"'{name}' wp_content does not end in /wp-content: {wp_content}")
    user_host, port, key = ssh_parts()
    return {
        "TARGET_HOST": target["host"],
        "TARGET_DOCROOT": wp_content[: -len("/wp-content")],
        "SSH_USER_HOST": user_host,
        "SSH_PORT": port,
        "SSH_KEY": Path(key).as_posix(),
    }


def self_test() -> list[str]:
    failures: list[str] = []
    for refused in ("sandybrown", "eye-care-test", "no-such-site", ""):
        try:
            resolve(refused)
            failures.append(f"'{refused}' was accepted as a push target")
        except ValueError:
            pass
    allowed = allowed_targets()
    if not allowed:
        failures.append("no target of kind 'test' in TARGETS")
    for name in allowed:
        got = resolve(name)
        if got["TARGET_DOCROOT"] != f"domains/{got['TARGET_HOST']}/public_html":
            failures.append(f"{name}: docroot {got['TARGET_DOCROOT']} is not domains/<host>/public_html")
    for name, t in deploy_common.TARGETS.items():
        if t.get("kind") not in ("canary", "test", "reference"):
            failures.append(f"{name}: kind {t.get('kind')!r} is not canary, test or reference")
    return failures


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__, file=sys.stderr)
        return 2
    if argv[0] == "--list":
        print(" ".join(allowed_targets()))
        return 0
    if argv[0] == "--self-test":
        failures = self_test()
        for f in failures:
            print(f"FAIL {f}")
        print("self-test: " + ("FAILED" if failures else "passed"))
        return 1 if failures else 0
    try:
        values = resolve(argv[0])
    except ValueError as exc:
        print(f"Refusing: {exc}", file=sys.stderr)
        return 1
    for key, value in values.items():
        print(f"{key}={shlex.quote(value)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
