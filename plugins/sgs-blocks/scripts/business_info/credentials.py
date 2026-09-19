"""REST credential resolution for the Site Info push (mirrors push-theme-snapshot.py).

Secrets are read from the gitignored `.claude/secrets/*.env` files, the CLI flags or the
environment. Nothing here prints or logs a credential.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlparse


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _load_env_file(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    if not path.is_file():
        return result
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        # Strip a MATCHED surrounding quote pair. Bash's `source` strips these as part of
        # its own parsing, so a hand-rolled reader that does not diverges SILENTLY - here it
        # built Basic auth from a quoted user/password and 401'd every authenticated REST
        # call, which reads as a credentials fault rather than a parsing one (2026-08-18).
        # Matched-pair ONLY: a blind .strip() of quote chars corrupts a value that
        # legitimately ends in one.
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        result[key.strip()] = value
    return result


def _host_of(url_or_host: str) -> str:
    """Bare lower-case host of a URL or host string (no scheme, path, or trailing slash)."""
    raw = url_or_host.strip()
    return (urlparse(raw if "://" in raw else f"//{raw}").netloc or "").lower()


def secrets_dir() -> Path:
    return repo_root() / ".claude" / "secrets"


def credentials_from_secrets(target_domain: str) -> tuple[str, str] | None:
    """The secrets file whose WP_URL_<KEY> host equals the target -> its WP_USER_<KEY> / WP_APP_PWD_<KEY>.

    One unreadable or malformed file is skipped and the scan continues, so a single bad secrets
    file can never break resolution for every other target. A message never carries file contents.
    """
    want = _host_of(target_domain)
    if not want or not secrets_dir().is_dir():
        return None
    for env_path in sorted(secrets_dir().glob("*.env")):
        try:
            env = _load_env_file(env_path)
            for name, value in env.items():
                if name.startswith("WP_URL_") and _host_of(value) == want:
                    key = name[len("WP_URL_"):]
                    user = env.get(f"WP_USER_{key}", "")
                    pwd = env.get(f"WP_APP_PWD_{key}", "").replace(" ", "")
                    if user and pwd:
                        return user, pwd
        except (UnicodeDecodeError, ValueError, OSError):
            print(f"[business_info] skipped an unreadable secrets file: {env_path.name}", file=sys.stderr)
    return None


# Kept under its old name for importers of the private helper.
_credentials_from_secrets = credentials_from_secrets


def resolve_credentials(
    target_domain: str, cli_user: str | None, cli_pwd: str | None
) -> tuple[str, str] | None:
    found = credentials_from_secrets(target_domain)
    if found:
        return found
    if cli_user and cli_pwd:
        return cli_user, cli_pwd.replace(" ", "")
    env_user = os.environ.get("SGS_WP_APP_USER", "")
    env_pwd = os.environ.get("SGS_WP_APP_PWD", "").replace(" ", "")
    if env_user and env_pwd:
        return env_user, env_pwd
    return None
