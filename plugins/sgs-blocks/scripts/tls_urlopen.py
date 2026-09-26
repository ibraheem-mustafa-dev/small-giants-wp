"""tls_urlopen.py — open an HTTPS request against a live SGS site with a trust-store fallback.

The deploy machine's two trust stores can disagree about the same certificate (a
healthy site has failed with "certificate has expired" under one store and passed
under the other), and which one is right varies by machine. So every script that
talks to a live site opens its requests through this one function: certifi first,
the platform store second, retried once only on a certificate-verification failure.
Any other error is raised untouched.
"""
from __future__ import annotations

import ssl
import urllib.error
import urllib.request
from typing import Callable


def urlopen_tls(req, tag: str, timeout: float = 20, log: Callable[[str], None] = print):
    """Open `req`, trying the certifi bundle first and the platform store second.

    The store that served the request is logged as `[<tag>] TLS: certifi|platform store`.
    """
    stores = []
    try:
        import certifi

        stores.append(("certifi", ssl.create_default_context(cafile=certifi.where())))
    except ImportError:
        pass
    stores.append(("platform store", None))

    for position, (label, context) in enumerate(stores):
        try:
            resp = urllib.request.urlopen(req, timeout=timeout, context=context)
        except urllib.error.HTTPError:
            log("[%s] TLS: %s" % (tag, label))  # the handshake succeeded; the server answered with an error status
            raise
        except (urllib.error.URLError, ssl.SSLCertVerificationError) as e:
            reason = getattr(e, "reason", e)
            if isinstance(reason, ssl.SSLCertVerificationError) and position + 1 < len(stores):
                log(
                    "[%s] TLS: %s rejected the certificate, retrying with the %s"
                    % (tag, label, stores[position + 1][0])
                )
                continue
            raise
        log("[%s] TLS: %s" % (tag, label))
        return resp
    raise RuntimeError("no TLS store available")  # unreachable: the platform store is always last
