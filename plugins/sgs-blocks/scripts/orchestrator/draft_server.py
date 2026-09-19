"""Serve an original Claude Design draft folder over HTTP for Stage 11.6.

A `.dc.html` draft only renders through its own runtime (`support.js`, sibling
`<name>.dc.html` components fetched by <dc-import>). `file://` blocks that fetch and the
run directory copy has no runtime at all, so computed-parity must be given an http:// URL
on the ORIGINAL draft folder.
"""
from __future__ import annotations

import contextlib
import functools
import http.server
import re
import threading
from pathlib import Path
from typing import Iterator

# Content signal, not a filename: the DSL's root element, its editor data attribute, or its
# control-flow tags. Plain static drafts contain none of these.
_DSL_DRAFT_RE = re.compile(r"<x-dc\b|\bdata-dc-script\b|<sc-(?:for|if)\b", re.IGNORECASE)


def is_dsl_draft(raw_html: str) -> bool:
    """True when `raw_html` is a Claude Design DSL draft that needs its runtime to render."""
    return bool(_DSL_DRAFT_RE.search(raw_html))


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return


@contextlib.contextmanager
def serve_dir(directory: Path) -> Iterator[str]:
    """Serve `directory` on 127.0.0.1 (ephemeral port); yield the base URL; always shut down."""
    handler = functools.partial(_QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()
