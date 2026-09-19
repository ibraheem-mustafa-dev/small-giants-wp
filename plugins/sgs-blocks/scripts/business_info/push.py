"""The Site Info REST push: POST /wp-json/sgs/v1/site-info (fill-if-empty unless overwrite)."""
from __future__ import annotations

import base64
import json
import urllib.request


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
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))
