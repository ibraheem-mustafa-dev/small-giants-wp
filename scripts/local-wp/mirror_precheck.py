#!/usr/bin/env python3
"""mirror_precheck.py - The two checks push-to-remote.sh makes on a mirror's content before it copies the mirror onto a test site.

    audit  runs the deploy's old-shape audit (plugins/sgs-blocks/scripts/audit-post-content-blocks.py, the way
           deploy_guards.py::step_oldshape_audit runs it) on the mirror's stored post_content; exit 1 on a HIGH finding.
    media  checks that every attachment the mirror's posts use (a `wp-image-<id>` class, a block attribute that holds a
           media id: `mediaId`, `audioId`, or the `id` of a media object beside its uploads URL; a featured image) and
           every `wp-content/uploads/...` link (a `srcset` entry, a query string and `%20` read correctly) has its file in
           the mirror's uploads folder; exit 1 and name each miss otherwise.

    python scripts/local-wp/mirror_precheck.py audit --posts posts.json --target <remote-target>
    python scripts/local-wp/mirror_precheck.py media --posts posts.json --attachment-ids ids.txt --meta meta.tsv --files files.txt

posts.json is `wp post list --fields=ID,post_content --format=json`; ids.txt holds the attachment ids (whitespace separated);
meta.tsv holds `post_id<TAB>meta_key<TAB>meta_value` rows for `_wp_attached_file` and `_thumbnail_id`; files.txt lists the
files under uploads/, one relative path per line.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import unquote

SCRIPTS = Path(__file__).resolve().parents[2] / "plugins" / "sgs-blocks" / "scripts"
AUDIT = SCRIPTS / "audit-post-content-blocks.py"
BASELINE = SCRIPTS / "oldshape-audit-baseline.json"
BLOCK_COMMENT = re.compile(r"<!--\s+wp:[a-z][a-z0-9_/-]*\s+(\{.*?\})\s+/?-->", re.S)
# An attribute that holds an attachment id is named for its media (`mediaId`, `audioId`, `heroImageId`), or is the `id` of a
# media object (`{"url": ".../uploads/a.jpg", "id": 55}`) or of a core media block, which sits beside an uploads URL. A term,
# user, product or page id (`termId`, `productId`, a navigation link's `id`) is never one, so it cannot match an attachment.
MEDIA_ID_KEY = re.compile(r"^(?:[A-Za-z]*(?:Media|Image|Photo|Logo|Audio|Video|Poster|Thumbnail|Attachment|Avatar)|media|image|photo|logo|audio|video|poster|thumbnail|attachment|avatar)(?:Id|ID)$")
WP_IMAGE = re.compile(r"wp-image-(\d+)")
# The path ends at whitespace (a `srcset` descriptor follows), a quote, a bracket, `?`, `#`, `,` or a backslash; it is
# percent-decoded before it is compared with the uploads file list.
UPLOADS_URL = re.compile(r"wp-content/uploads/([^\s\"'<>()?#,\\]+)")


def scratch_root() -> str:
    return "E:/sgs-tmp" if Path("E:/sgs-tmp").exists() else tempfile.gettempdir()


def parse_posts(text: str) -> list[dict]:
    return json.loads(text[text.index("["):])


def run_audit(posts: list[dict], target_key: str, work: Path) -> int:
    """Writes each post's content under <work>/<target_key>/ and runs the deploy's audit in gate mode."""
    site_dir = Path(work) / target_key
    site_dir.mkdir(parents=True, exist_ok=True)
    for post in posts:
        with open(site_dir / f"{post['ID']}.txt", "w", encoding="utf-8", newline="") as fh:
            fh.write(post.get("post_content") or "")
    cmd = [sys.executable, str(AUDIT), str(site_dir), "--check"]
    if BASELINE.exists():
        cmd += ["--baseline", str(BASELINE)]
    return subprocess.call(cmd, env=dict(os.environ))


def _media_ids_in(value: object, found: set[int]) -> None:
    """Adds the attachment ids a block attribute value holds: a media-named id key, or an `id` beside an uploads URL."""
    if isinstance(value, dict):
        beside_uploads = any(isinstance(v, str) and "/uploads/" in v for v in value.values())
        for key, item in value.items():
            if isinstance(item, int) and not isinstance(item, bool) and (MEDIA_ID_KEY.match(key) or (key == "id" and beside_uploads)):
                found.add(item)
            else:
                _media_ids_in(item, found)
    elif isinstance(value, list):
        for item in value:
            _media_ids_in(item, found)


def referenced_attachment_ids(posts: list[dict], attachment_ids: set[int]) -> set[int]:
    found: set[int] = set()
    for post in posts:
        content = post.get("post_content") or ""
        found.update(int(n) for n in WP_IMAGE.findall(content))
        for attrs in BLOCK_COMMENT.findall(content):
            try:
                _media_ids_in(json.loads(attrs), found)
            except ValueError:
                continue
    return found & attachment_ids


def missing_media(posts: list[dict], attachments: dict[int, str], thumbnails: dict[int, int], files: set[str]) -> list[str]:
    """attachments maps an attachment id to its `_wp_attached_file` ('' when it has none); thumbnails maps a post id to its featured image."""
    problems: list[str] = []
    for post in posts:
        pid = int(post["ID"])
        used = referenced_attachment_ids([post], set(attachments))
        if pid in thumbnails and thumbnails[pid] in attachments:
            used.add(thumbnails[pid])
        for att in sorted(used):
            rel = attachments[att]
            if not rel:
                problems.append(f"post {pid} uses attachment {att}: it has no file record")
            elif rel not in files:
                problems.append(f"post {pid} uses attachment {att}: uploads/{rel} is missing")
        for rel in sorted({unquote(found) for found in UPLOADS_URL.findall(post.get("post_content") or "")}):
            if rel not in files:
                problems.append(f"post {pid} links /wp-content/uploads/{rel}: the file is missing")
    return problems


def read_meta(path: Path) -> tuple[dict[int, str], dict[int, int]]:
    files: dict[int, str] = {}
    thumbs: dict[int, int] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) < 3 or not parts[0].isdigit():
            continue
        if parts[1] == "_wp_attached_file":
            files[int(parts[0])] = parts[2].strip()
        elif parts[1] == "_thumbnail_id" and parts[2].strip().isdigit():
            thumbs[int(parts[0])] = int(parts[2])
    return files, thumbs


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("audit")
    a.add_argument("--posts", required=True)
    a.add_argument("--target", required=True)
    m = sub.add_parser("media")
    m.add_argument("--posts", required=True)
    m.add_argument("--attachment-ids", required=True)
    m.add_argument("--meta", required=True)
    m.add_argument("--files", required=True)
    args = ap.parse_args(argv)
    try:
        posts = parse_posts(Path(args.posts).read_text(encoding="utf-8"))
    except (ValueError, OSError) as exc:
        print(f"could not read the mirror's post list: {exc}", file=sys.stderr)
        return 1
    if args.cmd == "audit":
        print(f"[oldshape-audit] scanning {len(posts)} mirror post(s) against the local block.json schemas")
        with tempfile.TemporaryDirectory(dir=scratch_root()) as td:
            return run_audit(posts, args.target, Path(td))
    ids = {int(x) for x in Path(args.attachment_ids).read_text(encoding="utf-8").split() if x.isdigit()}
    file_rows, thumbs = read_meta(Path(args.meta))
    attachments = {i: file_rows.get(i, "") for i in ids}
    files = {line.strip() for line in Path(args.files).read_text(encoding="utf-8").splitlines() if line.strip()}
    problems = missing_media(posts, attachments, thumbs, files)
    print(f"[media] {len(posts)} post(s), {len(ids)} attachment(s), {len(files)} file(s) in uploads: {len(problems)} missing")
    for line in problems:
        print(f"   {line}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
