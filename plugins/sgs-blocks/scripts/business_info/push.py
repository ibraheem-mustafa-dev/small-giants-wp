"""The Site Info REST push: POST /wp-json/sgs/v1/site-info (fill-if-empty unless overwrite)."""
from __future__ import annotations

import base64
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tls_urlopen import urlopen_tls  # noqa: E402


def push(target_domain: str, fields: dict[str, str], overwrite: bool,
         creds: tuple[str, str]) -> dict:
    url = f"https://{target_domain}/wp-json/sgs/v1/site-info"
    body = json.dumps({"fields": fields, "overwrite": overwrite}).encode("utf-8")
    token = base64.b64encode(f"{creds[0]}:{creds[1]}".encode()).decode()
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {token}",
        },
    )
    with urlopen_tls(req, "business_info.push", timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))
