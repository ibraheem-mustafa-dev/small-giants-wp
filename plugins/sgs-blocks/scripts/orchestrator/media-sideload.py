#!/usr/bin/env python3
"""media-sideload.py -- Spec 31 Phase 5b.5 media sideloader.

Reads `image-object` slots from extracted draft data + uploads each
referenced file to WordPress via REST `POST /wp/v2/media`. Returns the
WP attachment id + URL so a downstream stage can rewrite the block
attr to reference the live media.

Authenticates with Application Passwords. Reads from either:
  - `.claude/secrets/<site>.env` style: WP_USER_<KEY> + WP_APP_PWD_<KEY> + WP_URL_<KEY>,
    where <site> is the SGS_DEPLOY_SITE name (default sandybrown) and <KEY> is the
    name upper-cased with every non-alphanumeric removed (eye-care-test -> EYECARETEST).
    This is the same rule upload_and_patch.py (Stage 10) uses, so Stage 4i uploads to
    the SAME site Stage 10 deploys to.
  - Legacy `.openclaw/.env` style:      SGS_WP_USER + SGS_WP_APP_PASSWORD

Scope: `sideload_batch` ONLY uploads + reports. `rewrite_block_markup` /
`apply_rewrite_to_run` are the separate, explicit step that writes the uploaded
attachment URL + id back into the block markup Stage 10 deploys; they run only
after a real upload and only touch `url` + `id` of image-object attributes.

Idempotency: before uploading, queries GET /wp/v2/media?search=<slug>
and reuses an existing attachment whose source filename matches AND whose reported
file size (media_details.filesize) equals the local file's. A same-named attachment of a
DIFFERENT size is another picture and is not reused (the file uploads as new). When the
site reports no size the attachment is reused by filename only and the row is flagged
`reuse_unverified`. A re-run of the same draft uploads 0 duplicates.

Partial failure: any file that did not upload makes `enforce_complete_upload` raise
SideloadPartialError (listing every failed file) before the markup is rewritten or Stage 10
runs, unless the orchestrator's --allow-partial-media is given.

Fail-loud: auth failures (401/403) raise SideloadError and abort the
entire batch immediately. A missing local source image is flagged as a
per-slot error and the rest of the batch continues.

Dry-run by default. Use `--upload` (or `upload=True`) to actually POST.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable

sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_WP_SITE = os.environ.get("SGS_WP_SITE", "https://palestine-lives.org")

# Repo root — used to locate the sandybrown env file by default.
_REPO = Path(__file__).resolve().parents[4]
# Default env path: prefer sandybrown (canary) env if it exists, else legacy .openclaw .env.
_SANDYBROWN_ENV = _REPO / ".claude" / "secrets" / "sandybrown.env"
_LEGACY_ENV = Path.home() / ".openclaw" / ".env"
DEFAULT_ENV_PATH: Path = _SANDYBROWN_ENV if _SANDYBROWN_ENV.exists() else _LEGACY_ENV


class SideloadError(RuntimeError):
    """Raised when an upload fails for a non-network reason (auth / shape)."""


class SideloadAuthError(SideloadError):
    """Raised on 401/403 — aborts the entire batch immediately."""


class SideloadConfigError(SideloadError):
    """Raised when the deploy site's env file / credentials / URL are missing.

    Distinct from a per-slot SideloadError (a missing IMAGE file): a config error
    aborts the whole batch, because no upload can succeed without credentials.
    """


class SideloadRewriteError(SideloadError):
    """Raised when uploaded media could not be written back into the run's markup."""


class SideloadPartialError(SideloadError):
    """Raised when some of the draft's files did not upload and the run was not told to accept that.

    Deploying then would ship a page whose images are partly the uploaded attachments and partly the draft's own
    relative paths (dead links on the live site), so the run stops before Stage 10."""


_SITE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


def site_key_for(site: str) -> str:
    """The env-key suffix for a deploy site: upper-case, non-alphanumerics removed.

    Same rule as upload_and_patch.py (eye-care-test -> EYECARETEST).
    """
    return re.sub(r"[^A-Z0-9]", "", site.upper())


def deploy_site_name(environ: dict | None = None) -> str:
    """The deploy site Stage 10 targets: SGS_DEPLOY_SITE, or sandybrown when unset/empty."""
    env = os.environ if environ is None else environ
    return (env.get("SGS_DEPLOY_SITE") or "").strip() or "sandybrown"


def resolve_site_env(site: str | None, secrets_dir: Path | None = None) -> tuple[Path, str, str]:
    """Resolve the deploy site's env file. Returns (env_path, site_key, site_name).

    `site` is the SGS_DEPLOY_SITE value; None or empty means the sandybrown canary
    (the default Stage 10 uses). Raises SideloadConfigError with an actionable
    message when the name is unsafe or `<secrets_dir>/<site>.env` does not exist —
    never a silent fallback to another site's credentials.
    """
    name = (site or "").strip() or "sandybrown"
    if not _SITE_NAME_RE.match(name):
        raise SideloadConfigError(
            f"SGS_DEPLOY_SITE={name!r} is not a valid site name "
            "(letters, digits, '-' and '_' only; it names a file under .claude/secrets/)."
        )
    base = secrets_dir if secrets_dir is not None else _REPO / ".claude" / "secrets"
    env_path = base / f"{name}.env"
    if not env_path.is_file():
        raise SideloadConfigError(
            f"media sideload cannot upload to site {name!r}: env file not found at {env_path}. "
            f"Create it with WP_URL_{site_key_for(name)}, WP_USER_{site_key_for(name)} and "
            f"WP_APP_PWD_{site_key_for(name)}, or set SGS_DEPLOY_SITE to a site that has one."
        )
    return env_path, site_key_for(name), name


def _read_env_values(env_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        values[k.strip()] = v.strip().strip('"').strip("'")
    return values


def _read_env_creds(env_path: Path, site_key: str | None = None) -> tuple[str, str]:
    """Read user + app password from a .env-shaped file.

    With `site_key` (the deploy-site path) ONLY WP_USER_<KEY> + WP_APP_PWD_<KEY>
    are accepted: another site's keys in the same file are never used.
    Without it, two legacy naming conventions are supported:
      sandybrown style: WP_USER_SANDYBROWN + WP_APP_PWD_SANDYBROWN
      legacy style:     SGS_WP_USER + SGS_WP_APP_PASSWORD
    The sandybrown keys take precedence when both are present.
    """
    if not env_path.exists():
        raise SideloadConfigError(f"env file not found: {env_path}")
    values = _read_env_values(env_path)
    if site_key:
        user = values.get(f"WP_USER_{site_key}")
        pw = values.get(f"WP_APP_PWD_{site_key}")
        if not user or not pw:
            raise SideloadConfigError(
                f"Credentials not found in {env_path}. "
                f"Expected WP_USER_{site_key} + WP_APP_PWD_{site_key}."
            )
        return user, pw

    # Sandybrown format takes precedence.
    user = values.get("WP_USER_SANDYBROWN") or values.get("SGS_WP_USER")
    pw = values.get("WP_APP_PWD_SANDYBROWN") or values.get("SGS_WP_APP_PASSWORD")
    if not user or not pw:
        raise SideloadConfigError(
            f"Credentials not found in {env_path}. "
            "Expected WP_USER_SANDYBROWN + WP_APP_PWD_SANDYBROWN "
            "(or SGS_WP_USER + SGS_WP_APP_PASSWORD)."
        )
    return user, pw


def _read_wp_site(env_path: Path, site_key: str | None = None) -> str | None:
    """Read WP_URL_<KEY> (default key SANDYBROWN) from the env file if present."""
    if not env_path.exists():
        return None
    return _read_env_values(env_path).get(f"WP_URL_{site_key or 'SANDYBROWN'}") or None


def _basic_auth_header(user: str, pw: str) -> str:
    token = base64.b64encode(f"{user}:{pw}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def _remote_filesize(item: dict) -> int | None:
    """The attachment's original file size in bytes from the WP REST attachment schema
    (``media_details.filesize``, present since WordPress 6.0), or None when the site does not report one
    (``media_details`` is an empty array for some types, and older or filtered sites omit the key)."""
    details = item.get("media_details")
    size = details.get("filesize") if isinstance(details, dict) else None
    return size if isinstance(size, int) and not isinstance(size, bool) and size >= 0 else None


def _check_existing_attachment(
    filename: str,
    wp_site: str,
    auth_header: str,
    timeout: int = 30,
    local_size: int | None = None,
) -> dict | None:
    """Query the WP media library for an existing attachment by filename slug.

    Uses GET /wp/v2/media?search=<stem>&per_page=10 and compares the
    source_url basename against the local filename for an exact match. A filename alone does not make it the
    same picture (two drafts can both ship ``assets/hero.webp``), so when ``local_size`` is given each name match
    is also compared by size:
      * a match whose reported ``media_details.filesize`` equals ``local_size`` is returned as
        ``sgs_reuse_check = "size-verified"``;
      * a match that reports no size is returned as ``sgs_reuse_check = "filename-only"`` (reused, unverified);
      * matches that ALL report a different size are NOT returned: the caller uploads the file as new
        (WordPress adds its ``-1`` suffix), so another client's photo is never substituted.
    Returns a copy of the attachment record dict if usable, else None.
    """
    stem = Path(filename).stem
    search_url = (
        f"{wp_site.rstrip('/')}/wp-json/wp/v2/media"
        f"?search={urllib.parse.quote(stem)}&per_page=10"
    )
    req = urllib.request.Request(
        search_url,
        headers={"Authorization": auth_header},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            items: list[dict] = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise SideloadAuthError(
                f"Media library search: HTTP {e.code} — check credentials in env file."
            )
        # Any other HTTP error: treat as "not found" rather than aborting.
        return None
    except (urllib.error.URLError, OSError):
        return None

    unverified: dict | None = None
    for item in items:
        source_url: str = item.get("source_url") or (
            (item.get("guid") or {}).get("rendered") or ""
        )
        if Path(source_url).name.lower() != filename.lower():
            continue
        remote = _remote_filesize(item)
        if local_size is None or remote is None:
            unverified = unverified or {**item, "sgs_reuse_check": "filename-only"}
        elif remote == local_size:
            return {**item, "sgs_reuse_check": "size-verified"}
    return unverified


def _upload_one(
    file_path: Path,
    wp_site: str,
    auth_header: str,
    timeout: int = 60,
) -> dict:
    """POST a single file to /wp/v2/media. Returns parsed JSON response.

    Raises SideloadAuthError on 401/403 (aborts the batch).
    Raises SideloadError when the file is missing.
    Raises urllib.error.HTTPError for other HTTP errors (per-slot error).
    """
    if not file_path.exists() or not file_path.is_file():
        raise SideloadError(f"media file not found: {file_path}")
    mime, _ = mimetypes.guess_type(str(file_path))
    if not mime:
        mime = "application/octet-stream"
    data = file_path.read_bytes()
    req = urllib.request.Request(
        f"{wp_site.rstrip('/')}/wp-json/wp/v2/media",
        data=data, method="POST",
        headers={
            "Authorization": auth_header,
            "Content-Type": mime,
            "Content-Disposition": f'attachment; filename="{file_path.name}"',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise SideloadAuthError(
                f"Media upload: HTTP {e.code} — check credentials. "
                f"Server: {e.read().decode('utf-8', errors='ignore')[:200]}"
            )
        raise


def _upload_one_idempotent(
    file_path: Path,
    wp_site: str,
    auth_header: str,
    timeout: int = 60,
) -> tuple[dict, bool]:
    """Upload a file, reusing an existing attachment if one already exists.

    Returns (attachment_record, was_reused).
    was_reused=True means no network upload was performed (idempotent hit). The record then carries
    ``sgs_reuse_check``: ``"size-verified"`` (the library's file is the same size as the local one) or
    ``"filename-only"`` (the site reported no size, so only the name matched). A same-named attachment of a
    DIFFERENT size is not reused; the file is uploaded as new.
    Raises SideloadError when the local file is missing (before any network
    calls — avoid unnecessary auth checks against a file we can't upload).
    Raises SideloadAuthError immediately on 401/403 (aborts the whole batch).
    """
    # Check local file first — pointless to query the media library if we
    # cannot read the source bytes anyway.
    if not file_path.exists() or not file_path.is_file():
        raise SideloadError(f"media file not found: {file_path}")
    existing = _check_existing_attachment(
        file_path.name, wp_site, auth_header, timeout=timeout, local_size=file_path.stat().st_size
    )
    if existing:
        return existing, True
    record = _upload_one(file_path, wp_site, auth_header, timeout=timeout)
    return record, False


_BLOCK_COMMENT_RE = re.compile(
    r"(?P<open><!--\s+wp:(?P<name>[A-Za-z0-9_/-]+)\s+)(?P<json>\{.*?\})(?P<close>\s*/?-->)",
    re.DOTALL,
)

_SCALAR_MEDIA_ATTRS: dict[str, frozenset[str]] | None = None


def scalar_media_attrs() -> dict[str, frozenset[str]]:
    """``{block slug: attribute names}`` of every attribute that holds a bare media URL string (not an object).

    Read-only from the framework DB (R-31-1): the attributes whose ``role`` is ``image-object`` and whose
    ``attr_type`` is ``string`` (``sgs/media.imageUrl``, ``sgs/responsive-logo.logoUrl``, ``core/cover.poster``...).
    An object-shaped media attribute (``{url, id, alt}``) is found by its shape and needs no lookup. Loaded once;
    an unreadable or missing database gives an empty map, and the object-shaped path still works."""
    global _SCALAR_MEDIA_ATTRS
    if _SCALAR_MEDIA_ATTRS is None:
        found: dict[str, set[str]] = {}
        db = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
        try:
            conn = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
            try:
                for slug, attr in conn.execute(
                    "SELECT block_slug, attr_name FROM block_attributes WHERE role = 'image-object' AND attr_type = 'string'"
                ):
                    found.setdefault(slug, set()).add(attr)
            finally:
                conn.close()
        except sqlite3.Error:
            found = {}
        _SCALAR_MEDIA_ATTRS = {k: frozenset(v) for k, v in found.items()}
    return _SCALAR_MEDIA_ATTRS


def _block_slug(comment_name: str) -> str:
    """``wp:cover`` names ``core/cover``; ``wp:sgs/media`` names ``sgs/media``."""
    return comment_name if "/" in comment_name else f"core/{comment_name}"


def _has_attachment_ref(obj: dict) -> bool:
    """True when an image-object already points at a media-library attachment (a non-zero ``id``)."""
    ref = obj.get("id")
    return ref not in (None, 0, "", "0", False)


def collect_image_slots(extracted: dict, scalar_attrs: dict[str, frozenset[str]] | None = None) -> list[dict]:
    """Walk the extracted-attributes payload + return media descriptors.

    Looks for slot values shaped `{"id": ..., "url": ..., "alt": ...}` (the `image-object` role) anywhere in the
    dict tree, at ANY depth (an image-object nested inside another one is found too), and for the scalar media
    attributes the framework DB lists (a bare URL string, see ``scalar_media_attrs``) inside any block markup
    string (`<!-- wp:sgs/media {"imageUrl":"assets/x.webp"} -->`). An image-object that already carries a non-zero
    ``id`` is an attachment reference, not a file to upload: it is returned with ``attachment_id`` set so the batch
    reports it as skipped (and the rewrite leaves it alone). Returns a flat list of `{path, url, alt}` records the
    caller can iterate to upload.
    """
    scalar = scalar_media_attrs() if scalar_attrs is None else scalar_attrs
    found: list[dict] = []

    def _walk(obj: object, path: list[str]) -> None:
        if isinstance(obj, dict):
            if "url" in obj and ("id" in obj or "alt" in obj):
                slot = {
                    "path": ".".join(path) or "(root)",
                    "url": obj.get("url"),
                    "alt": obj.get("alt", ""),
                }
                if _has_attachment_ref(obj):
                    slot["attachment_id"] = obj.get("id")
                found.append(slot)
            for k, v in obj.items():
                _walk(v, path + [k])
        elif isinstance(obj, list):
            for idx, item in enumerate(obj):
                _walk(item, path + [f"[{idx}]"])
        elif isinstance(obj, str) and scalar and "<!-- wp:" in obj:
            for match in _BLOCK_COMMENT_RE.finditer(obj):
                slug = _block_slug(match.group("name"))
                try:
                    attrs = json.loads(match.group("json"))
                except ValueError:
                    continue
                for attr in sorted(scalar.get(slug, ())):
                    value = attrs.get(attr) if isinstance(attrs, dict) else None
                    if isinstance(value, str) and value:
                        found.append({"path": ".".join(path + [f"{slug}.{attr}"]), "url": value, "alt": ""})

    _walk(extracted, [])
    return found


Uploader = Callable[..., tuple[dict, bool]]

_ABSOLUTE_URL_PREFIXES = ("http://", "https://", "//", "data:")


def _is_local_image_url(url: object) -> bool:
    return isinstance(url, str) and bool(url) and not url.startswith(_ABSOLUTE_URL_PREFIXES)


# File types WordPress core refuses to upload by default: none of these extensions is in the default list
# returned by wp_get_mime_types() / get_allowed_mime_types(). SVG is the one a draft actually hits (logos and
# icons); the rest are the other web-asset types a draft's media slots can point at (Lottie JSON, web fonts,
# HTML). ``ico`` is deliberately absent: core allows it. A site can allow any of these (the `upload_mimes`
# filter or a plugin), so the wording says "refused on this site", never "WordPress cannot".
_TYPES_REFUSED_BY_DEFAULT: frozenset[str] = frozenset({
    "svg", "svgz", "json", "html", "htm", "woff", "woff2", "ttf", "otf", "eot",
})
_SVG_TYPES: frozenset[str] = frozenset({"svg", "svgz"})


def describe_upload_failure(local_path: str | Path, status: int, phrase: str) -> str:
    """The report `reason` for an HTTP error from the media endpoint.

    When the file's extension is one WordPress core refuses by default (``_TYPES_REFUSED_BY_DEFAULT``) and the
    response is a 4xx/5xx, say so as an action the operator can take; the raw HTTP detail always follows, so
    nothing is hidden. Any other file keeps the plain ``HTTP <code>: <phrase>`` wording."""
    raw = f"HTTP {status}: {phrase}"
    ext = Path(str(local_path)).suffix.lstrip(".").lower()
    if status < 400 or ext not in _TYPES_REFUSED_BY_DEFAULT:
        return raw
    if ext in _SVG_TYPES:
        action = "Enable SVG uploads for the site (for example a safe-SVG plugin)"
    else:
        action = f"Allow .{ext} uploads for the site (the upload_mimes filter or a plugin)"
    return (
        f"WordPress refused .{ext} (file type not allowed on this site). {action} or pass "
        f"--allow-partial-media; the image stays as a relative URL. [{raw}]"
    )


def sideload_batch(
    extracted: dict,
    mockup_root: Path,
    wp_site: str = DEFAULT_WP_SITE,
    upload: bool = False,
    env_path: Path = DEFAULT_ENV_PATH,
    site: str | None = None,
    secrets_dir: Path | None = None,
    uploader: Uploader | None = None,
) -> dict:
    """Find image slots + optionally upload each UNIQUE file once. Returns a report.

    `mockup_root` MUST be the draft's own folder (the directory its relative
    `assets/...` or `../../research/...` paths are relative to), not a run-dir copy.

    In dry-run mode (upload=False): inventories slots, no network calls.
    In upload mode (upload=True):
      - Slots are grouped by RESOLVED real path first, so a file referenced from N
        places (extract.json repeats each slot at several depths) is uploaded once.
      - Credentials: when `site` is given (the SGS_DEPLOY_SITE name; empty string
        means the sandybrown default), they come from `<secrets_dir>/<site>.env`
        keys WP_URL_<KEY> / WP_USER_<KEY> / WP_APP_PWD_<KEY> (SideloadConfigError
        when the file or a key is missing). With `site=None` they come from
        `env_path` (legacy behaviour). Nothing is read when there is no local file
        to upload, so a draft with no local images needs no credentials.
      - Each unique file is checked against the WP media library by filename and
        uploaded only if absent (`reused` records which).
      - Fails loud (raises SideloadAuthError) on 401/403 -- never silently
        falls back to dry-run.
      - Flags missing source images as per-file errors and continues the rest.
      - `uploader(file_path, wp_site=..., auth_header=...) -> (record, reused)`
        replaces the network call (tests inject a fake).

    report["uploaded"] carries ONE row per unique file: attachment_id, source_url,
    alt (first occurrence), slot_path (first occurrence), slot_paths (every
    occurrence), occurrences, urls (every distinct source string that resolved to
    it), local_path, reused (bool), and `reuse_unverified: true` when the attachment was reused by filename
    alone because the site reported no file size to compare (report["reused_unverified"] counts them; a
    same-named attachment of a DIFFERENT size is never reused). report["url_map"] maps each distinct source url
    string to {attachment_id, source_url, local_path}, the input to
    `rewrite_block_markup`. report["slots_found"] counts occurrences;
    report["unique_files"] counts distinct resolved files.
    """
    slots = collect_image_slots(extracted)
    report: dict = {
        "slots_found": len(slots),
        "unique_files": 0,
        "uploaded": [],
        "skipped": [],
        "errors": [],
        "url_map": {},
        "reused_unverified": 0,
        "mode": "upload" if upload else "dry-run",
    }
    if not upload:
        for s in slots:
            report["skipped"].append({**s, "reason": "dry-run"})
        return report

    mockup_resolved = mockup_root.resolve()
    repo_resolved = _REPO.resolve()

    # Group slots by resolved real path BEFORE any network call. Each group is one
    # physical file; its slot_paths / urls keep the per-occurrence bookkeeping the
    # markup rewrite needs.
    groups: dict[str, dict] = {}
    for s in slots:
        url = s.get("url")
        if not url:
            report["skipped"].append({**s, "reason": "no url"})
            continue
        # An ABSOLUTE http(s)/protocol-relative/data URL is ALREADY HOSTED (a draft img
        # whose src is already a live WP media URL) -- no sideload needed. Skip cleanly.
        # This is the deterministic media contract: relative/local mockup paths get
        # uploaded, already-hosted URLs pass through untouched. Previously the code
        # joined an absolute URL onto mockup_root -> the mangled `mockup/https:/host/...`
        # path -> "media file not found" for every already-hosted image (the Bean-review
        # #2 image failure). Mirrors the orchestrator's existing absolute-URL guard.
        if not _is_local_image_url(url):
            report["skipped"].append({**s, "reason": "already an absolute URL (already hosted)"})
            continue
        if s.get("attachment_id"):
            report["skipped"].append({**s, "reason": f"already an attachment reference (id {s['attachment_id']}); "
                                                     "not uploaded and not rewritten"})
            continue
        # Resolve relative -> absolute file path (mockup-relative URL, e.g.
        # `../../research/photography/img.webp` resolves from mockup_root
        # into the repo's research/ tree). Enforce that the resolved path
        # stays WITHIN either the repo root OR mockup_root itself -- this
        # blocks any `../` traversal that escapes both the repository and
        # the caller-supplied root, while still permitting the `../../research/`
        # relative paths that are legitimate mockup-to-research cross-references
        # within the SGS project layout (sites/<client>/mockups/<page>/ ->
        # sites/<client>/research/).
        local = (mockup_root / url).resolve()
        key = os.path.normcase(str(local))
        group = groups.get(key)
        if group is None:
            _in_mockup = local == mockup_resolved or mockup_resolved in local.parents
            _in_repo = repo_resolved in local.parents
            group = groups[key] = {
                "local": local,
                "escapes": not (_in_repo or _in_mockup),
                "urls": [],
                "slot_paths": [],
                "alt": s.get("alt"),
            }
        if url not in group["urls"]:
            group["urls"].append(url)
        group["slot_paths"].append(s["path"])
    report["unique_files"] = len(groups)

    def _base_row(g: dict) -> dict:
        return {
            "slot_path": g["slot_paths"][0],
            "slot_paths": g["slot_paths"],
            "occurrences": len(g["slot_paths"]),
            "urls": g["urls"],
            "local_path": str(g["local"]),
        }

    if not groups:
        return report  # nothing local to upload: no credentials needed, no network

    # Credentials -- SideloadConfigError / SideloadAuthError propagate to the caller.
    site_key: str | None = None
    if site is not None:
        env_path, site_key, _site_name = resolve_site_env(site, secrets_dir)
    # Resolve wp_site from the env file when the caller hasn't overridden DEFAULT_WP_SITE.
    _resolved_wp_site = wp_site
    if _resolved_wp_site == DEFAULT_WP_SITE:
        _from_env = _read_wp_site(env_path, site_key)
        if _from_env:
            _resolved_wp_site = _from_env
        elif site_key:
            raise SideloadConfigError(
                f"WP_URL_{site_key} not found in {env_path}; refusing to upload to the "
                f"default site {DEFAULT_WP_SITE}."
            )
    user, pw = _read_env_creds(env_path, site_key)
    auth_header = _basic_auth_header(user, pw)
    do_upload: Uploader = uploader if uploader is not None else _upload_one_idempotent

    for g in groups.values():
        local = g["local"]
        row = _base_row(g)
        if g["escapes"]:
            report["errors"].append({**row, "reason": f"resolved path escapes mockup_root: {local}"})
            continue
        try:
            record, was_reused = do_upload(
                local, wp_site=_resolved_wp_site, auth_header=auth_header,
            )
            attachment_id = record.get("id")
            source_url = record.get("source_url") or (
                (record.get("guid") or {}).get("rendered") or ""
            )
            if not isinstance(attachment_id, int) or isinstance(attachment_id, bool) or not source_url:
                report["errors"].append({
                    **row,
                    "reason": "WordPress response carried no attachment id or source_url",
                })
                continue
            unverified = bool(was_reused and record.get("sgs_reuse_check") == "filename-only")
            uploaded_row = {
                **row,
                "attachment_id": attachment_id,
                "source_url": source_url,
                "alt": g["alt"],
                "reused": was_reused,
            }
            if unverified:
                uploaded_row["reuse_unverified"] = True
                report["reused_unverified"] += 1
            report["uploaded"].append(uploaded_row)
            for u in g["urls"]:
                report["url_map"][u] = {
                    "attachment_id": attachment_id,
                    "source_url": source_url,
                    "local_path": str(local),
                }
        except SideloadAuthError:
            # Auth failure -- raise immediately; no point continuing the batch.
            raise
        except SideloadConfigError:
            raise
        except SideloadError as e:
            # Missing file -- flag and continue.
            report["errors"].append({**row, "reason": str(e)})
        except urllib.error.HTTPError as e:
            report["errors"].append({
                **row, "http_status": e.code,
                "reason": describe_upload_failure(row["local_path"], e.code, str(e.reason)),
            })
        except (urllib.error.URLError, OSError) as e:
            report["errors"].append({**row, "reason": str(e)})

    return report


def enforce_complete_upload(report: dict, allow_partial: bool = False) -> dict | None:
    """Stop a run whose upload was only partly successful, before anything is written back or deployed.

    ``sideload_batch`` puts only the successes in ``url_map``, so a page rewritten from it would carry the uploaded
    attachment for some images and the draft's own relative path (a dead link on the live site) for the rest. In
    upload mode any entry in ``report["errors"]`` therefore raises ``SideloadPartialError`` naming EVERY failed file
    with its reason. ``allow_partial`` (the orchestrator's ``--allow-partial-media``) lets the run continue: the
    function then returns ``{"partial_media": True, "failed": [...]}`` for the stage artefact and prints a loud
    warning. Returns None when nothing failed (or in dry-run, where no upload was attempted)."""
    if report.get("mode") != "upload":
        return None
    errors = report.get("errors") or []
    if not errors:
        return None
    failed = [{"local_path": e.get("local_path"), "urls": e.get("urls"), "reason": e.get("reason")} for e in errors]
    listing = "\n".join(f"  - {f['local_path'] or f['urls']}: {f['reason']}" for f in failed)
    if allow_partial:
        print(f"[stage-4i] WARNING: {len(failed)} file(s) did NOT upload; --allow-partial-media is set, so the page "
              f"will deploy with these images still pointing at the draft's relative paths (dead links):\n{listing}",
              file=sys.stderr)
        return {"partial_media": True, "failed": failed}
    raise SideloadPartialError(
        f"{len(failed)} of {report.get('unique_files', 0)} file(s) did not upload, so deploying would leave "
        "those images as dead relative links. Fix the cause and re-run, or pass --allow-partial-media to deploy "
        f"anyway:\n{listing}"
    )


# ---------------------------------------------------------------------------
# Closing the loop: write uploaded url + id back into the emitted block markup
# ---------------------------------------------------------------------------
# Why a separate step and not `--media-map`: the converter's media map
# (converter/services/lift_helpers.py::resolve_media_url) is consulted at Stage 4
# convert time, BEFORE Stage 4i has uploaded anything, and it can carry only a URL
# (scalar_media_from_img hard-codes id 0). This step runs after the upload, so it can
# set both `url` and `id`, and it edits only image-object dicts (the same
# `{url, id|alt}` shape collect_image_slots uploads).

def _serialise_attrs(attrs: dict, original: str) -> str:
    """Re-encode block attributes with core's escaping (converter.block_serialization).

    ensure_ascii follows the original blob (literal non-ASCII -> False, else True), so
    an unchanged character stays byte-identical to what the converter emitted.
    """
    scripts_dir = str(Path(__file__).resolve().parents[1])
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    from converter.block_serialization import serialize_block_attributes

    return serialize_block_attributes(
        attrs, ensure_ascii=not any(ord(ch) > 127 for ch in original)
    )


def _rewrite_image_objects(obj: Any, url_map: dict, stats: dict) -> bool:
    """Rewrite url + id on every mapped image-object in `obj`, at any depth. True when anything changed.

    An object shaped `{url, id|alt}` is an image-object. It is rewritten only when its ``id`` is 0 or absent (the
    converter's own emit): a non-zero ``id`` already names an attachment, and overwriting it would replace someone's
    reference (a link object `{url, id: 7}` is the same shape), so it is reported in ``stats["attachment_refs_kept"]``
    and its relative url, if any, in ``still_relative``. The walk always continues into the object's values, so an
    image-object nested inside another is neither skipped nor left out of the report."""
    changed = False
    if isinstance(obj, dict):
        if "url" in obj and ("id" in obj or "alt" in obj):
            url = obj.get("url")
            entry = url_map.get(url) if isinstance(url, str) else None
            if _has_attachment_ref(obj):
                if _is_local_image_url(url):
                    stats["attachment_refs_kept"].add(url)
                    stats["still_relative"].add(url)
            elif entry:
                obj["url"] = entry["source_url"]
                obj["id"] = entry["attachment_id"]
                stats["images_rewritten"] += 1
                changed = True
            elif _is_local_image_url(url):
                stats["still_relative"].add(url)
        for value in list(obj.values()):
            changed = _rewrite_image_objects(value, url_map, stats) or changed
    elif isinstance(obj, list):
        for value in obj:
            changed = _rewrite_image_objects(value, url_map, stats) or changed
    return changed


def _rewrite_scalar_media(attrs: dict, block: str, url_map: dict, stats: dict,
                          scalar: dict[str, frozenset[str]]) -> bool:
    """Rewrite the bare media URL string attributes the framework DB lists for ``block`` (see ``scalar_media_attrs``).

    There is no attachment-id attribute beside a bare URL, so only the url changes. An unmapped local path is counted
    in ``still_relative`` and named, with its block and attribute, in ``still_relative_detail``."""
    changed = False
    for attr in sorted(scalar.get(block, ())):
        value = attrs.get(attr)
        if not isinstance(value, str) or not value:
            continue
        entry = url_map.get(value)
        if entry:
            attrs[attr] = entry["source_url"]
            stats["images_rewritten"] += 1
            stats["scalar_rewritten"] += 1
            changed = True
        elif _is_local_image_url(value):
            stats["still_relative"].add(value)
            stats["still_relative_detail"].add(f"{block}.{attr}: {value}")
    return changed


def rewrite_block_markup(markup: str, url_map: dict,
                         scalar_attrs: dict[str, frozenset[str]] | None = None) -> tuple[str, dict]:
    """Rewrite mapped image-object url + id inside every `<!-- wp:... {json} -->` comment.

    `url_map` is `report["url_map"]` from sideload_batch. Only blocks that actually
    change are re-encoded; every other byte of the markup is untouched. Returns
    (new_markup, stats) with stats = {blocks_scanned, blocks_changed, images_rewritten,
    scalar_rewritten (of those, bare-URL attributes), still_relative (sorted unique relative urls left unmapped),
    still_relative_detail (the scalar ones as "block.attr: url"), attachment_refs_kept (image-objects with a non-zero
    id that were left alone)}.
    """
    scalar = scalar_media_attrs() if scalar_attrs is None else scalar_attrs
    stats: dict = {"blocks_scanned": 0, "blocks_changed": 0, "images_rewritten": 0, "scalar_rewritten": 0,
                   "still_relative": set(), "still_relative_detail": set(), "attachment_refs_kept": set()}

    def _sub(match: re.Match) -> str:
        stats["blocks_scanned"] += 1
        raw = match.group("json")
        try:
            attrs = json.loads(raw)
        except ValueError:
            return match.group(0)
        if not isinstance(attrs, dict):
            return match.group(0)
        changed = _rewrite_image_objects(attrs, url_map, stats)
        changed = _rewrite_scalar_media(attrs, _block_slug(match.group("name")), url_map, stats, scalar) or changed
        if not changed:
            return match.group(0)
        stats["blocks_changed"] += 1
        return match.group("open") + _serialise_attrs(attrs, raw) + match.group("close")

    new_markup = _BLOCK_COMMENT_RE.sub(_sub, markup)
    for key in ("still_relative", "still_relative_detail", "attachment_refs_kept"):
        stats[key] = sorted(stats[key])
    return new_markup, stats


def apply_rewrite_to_run(run_dir: Path, extract_out: dict, url_map: dict,
                         scalar_attrs: dict[str, frozenset[str]] | None = None) -> dict:
    """Write uploaded url + id into the markup Stage 10 will deploy.

    Rewrites `block_markup` in `<run_dir>/extract.json` (the file
    upload_and_patch.py reads) and in the in-memory `extract_out`, then writes
    `<run_dir>/media-rewrite-report.json`. Only the aggregate `block_markup` changes:
    extracted_attributes / per_section_results stay as the converter emitted them
    (per-section pattern markup must not be bound to one site's uploads).
    Returns the stats from rewrite_block_markup. Raises SideloadRewriteError when
    extract.json cannot be read or written: the page would otherwise deploy with
    dead image URLs.
    """
    extract_path = run_dir / "extract.json"
    try:
        payload = json.loads(extract_path.read_text(encoding="utf-8"))
        markup = payload.get("block_markup") or ""
        new_markup, stats = rewrite_block_markup(markup, url_map, scalar_attrs)
        if stats["images_rewritten"]:
            payload["block_markup"] = new_markup
            extract_path.write_text(
                json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            extract_out["block_markup"] = new_markup
        (run_dir / "media-rewrite-report.json").write_text(
            json.dumps({**stats, "url_map": url_map}, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    except (OSError, ValueError) as e:
        raise SideloadRewriteError(
            f"could not write uploaded media back into {extract_path}: {e}"
        ) from e
    return stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--extracted", type=Path, required=True,
                        help="Path to extracted-attributes JSON")
    parser.add_argument("--mockup-root", type=Path, required=True,
                        help="Directory the mockup paths are relative to")
    parser.add_argument("--wp-site", default=DEFAULT_WP_SITE)
    parser.add_argument("--upload", action="store_true",
                        help="Actually POST to WP (default: dry-run inventory)")
    parser.add_argument("--env-path", type=Path, default=DEFAULT_ENV_PATH)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args(argv)

    if not args.extracted.exists():
        sys.exit(f"ERROR: --extracted not found at {args.extracted}")
    payload = json.loads(args.extracted.read_text(encoding="utf-8"))
    try:
        report = sideload_batch(
            payload, mockup_root=args.mockup_root, wp_site=args.wp_site,
            upload=args.upload, env_path=args.env_path,
        )
    except SideloadAuthError as e:
        sys.exit(f"AUTH ERROR (aborting): {e}")
    out = json.dumps(report, indent=2, ensure_ascii=False, default=str)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(out, encoding="utf-8")
        print(f"[sideload] wrote {args.out}")
    else:
        print(out)
    return 0 if not report.get("errors") else 1


if __name__ == "__main__":
    sys.exit(main())
