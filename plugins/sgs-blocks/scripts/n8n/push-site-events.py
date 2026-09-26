#!/usr/bin/env python3
"""Push or check the "Build emails" code of the live SGS site-events N8N workflow.

The workflow receives every `sgs_n8n_webhook_url` POST (Spec 30 FR-30-15):
`sgs_wishlist_alert` and `sgs_back_in_stock` become shopper emails; form
payloads (no `event`) are acknowledged and dropped. Its logic, including the
SITES allowlist (site_url -> shop name and sender), is
`site-events-build-emails.js` next to this script, which is the source of truth.

Usage:
    python push-site-events.py           # replace the live node's code with the repo file
    python push-site-events.py --check   # exit 1 if the live code differs from the repo file

The API key is read from N8N_API_KEY, then the secrets files; the webhook's
secret path is never read or changed.
"""

import json
import os
import pathlib
import ssl
import sys
import urllib.request

API = "https://n8n.smallgiantsstudio.cloud/api/v1"
WORKFLOW_ID = "AJzRBARFn8AqQlkg"
NODE_NAME = "Build emails"
HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[3]
SECRETS = [
    REPO / ".claude/secrets/ai-agent-credentials-and-info/api-keys.env",
    pathlib.Path.home() / ".claude/secrets/openclaw.env",
]
# Settings keys the public API accepts on update.
SETTINGS_KEYS = {
    "executionOrder", "saveDataErrorExecution", "saveDataSuccessExecution",
    "saveManualExecutions", "saveExecutionProgress", "timezone",
    "errorWorkflow", "callerPolicy", "executionTimeout",
}


def api_key() -> str:
    if os.environ.get("N8N_API_KEY"):
        return os.environ["N8N_API_KEY"]
    for path in SECRETS:
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                if line.startswith("N8N_API_KEY="):
                    return line.split("=", 1)[1].strip()
    sys.exit("No N8N_API_KEY in the environment or secrets files.")


def tls_context() -> ssl.SSLContext:
    """Prefer certifi's bundle: some Windows trust stores lack the current Let's Encrypt roots."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def call(method: str, path: str, key: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        f"{API}{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        # Cloudflare answers Python's default user-agent with a 403 (error 1010).
        headers={"X-N8N-API-KEY": key, "Content-Type": "application/json", "User-Agent": "sgs-push-site-events/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30, context=tls_context()) as res:
        return json.load(res)


def main() -> int:
    key = api_key()
    code = (HERE / "site-events-build-emails.js").read_text(encoding="utf-8")
    wf = call("GET", f"/workflows/{WORKFLOW_ID}", key)
    node = next((n for n in wf["nodes"] if n["name"] == NODE_NAME), None)
    if node is None:
        sys.exit(f'Workflow {WORKFLOW_ID} has no "{NODE_NAME}" node.')

    live = node["parameters"].get("jsCode", "")
    if "--check" in sys.argv:
        if live.strip() == code.strip():
            print("In sync: the live workflow code matches the repo file.")
            return 0
        print("DRIFT: the live workflow code differs from site-events-build-emails.js.")
        return 1

    if live.strip() == code.strip():
        print("Already in sync; nothing pushed.")
        return 0
    node["parameters"]["jsCode"] = code
    settings = {k: v for k, v in (wf.get("settings") or {}).items() if k in SETTINGS_KEYS}
    call("PUT", f"/workflows/{WORKFLOW_ID}", key, {
        "name": wf["name"], "nodes": wf["nodes"],
        "connections": wf["connections"], "settings": settings,
    })
    print(f"Pushed site-events-build-emails.js to workflow {WORKFLOW_ID} (active: {wf.get('active')}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
