"""Offline proof of `export-content.php` with a fake `$wpdb`: plain post meta is exported, serialised or JSON-encoded post
meta and options holding `wp:sgs/` markup are listed `unsupported`. Needs PHP on the PATH (skipped, and said so, otherwise)."""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLAIN = '<!-- wp:sgs/hero {"headline":"x"} /-->'
SERIAL = 'a:1:{s:1:"c";s:%d:"%s";}' % (len(PLAIN), PLAIN)
JSON_ENC = json.dumps({"content": PLAIN})
SERIAL_OTHER = 'a:1:{s:1:"c";s:25:"<!-- wp:paragraph /--> ok";}'

PRELUDE = r"""<?php
define( "ARRAY_A", 1 );
function is_serialized( $v ) { return is_string( $v ) && ( 'N;' === $v || 1 === preg_match( '/^[asObid]:/', $v ) ); }
function maybe_unserialize( $v ) { return is_serialized( $v ) ? unserialize( $v ) : $v; }
function wp_json_encode( $v, $f = 0 ) { return json_encode( $v, $f ); }
class Fake_Wpdb {
	public $posts = 'wp_posts'; public $postmeta = 'wp_postmeta'; public $options = 'wp_options'; public $data;
	function esc_like( $s ) { return $s; }
	function prepare( $q ) { return $q; }
	function get_results( $q, $t = null ) {
		if ( false !== strpos( $q, "post_type = 'attachment'" ) ) { return $this->data['attachment_posts']; }
		if ( false !== strpos( $q, '_wp_attachment_metadata' ) ) { return $this->data['attachment_meta']; }
		foreach ( array( 'postmeta', 'options', 'posts' ) as $k ) { if ( false !== strpos( $q, 'FROM wp_' . $k ) ) { return $this->data[ $k ]; } }
		return array();
	}
}
global $wpdb;
$wpdb = new Fake_Wpdb();
$wpdb->data = json_decode( file_get_contents( $argv[2] ), true );
eval( file_get_contents( $argv[1] ) );
"""


ATTACHMENT_META = 'a:5:{s:5:"width";i:1200;s:6:"height";i:800;s:4:"file";s:18:"2026/09/photo.jpeg";s:5:"sizes";a:1:{s:6:"medium";a:4:{s:4:"file";s:18:"photo-300x200.jpeg";s:5:"width";i:300;s:6:"height";i:200;s:9:"mime-type";s:10:"image/jpeg";}}s:10:"image_meta";a:0:{}}'


def fixture() -> dict:
    meta = [(1, 'plain', PLAIN), (2, 'serial', SERIAL), (3, 'json', JSON_ENC), (4, 'other', SERIAL_OTHER)]
    return {"posts": [{"ID": 1, "post_type": "page", "post_name": "a", "post_status": "publish", "post_content": PLAIN}],
            "postmeta": [{"meta_id": i, "post_id": 9, "meta_key": k, "meta_value": v} for i, k, v in meta],
            "attachment_posts": [{"ID": 41, "post_mime_type": "image/jpeg"}],
            "attachment_meta": [{"post_id": 41, "meta_key": "_wp_attached_file", "meta_value": "2026/09/photo.jpeg"},
                                {"post_id": 41, "meta_key": "_wp_attachment_metadata", "meta_value": ATTACHMENT_META}],
            "options": [{"option_name": "plain_opt", "option_value": PLAIN}, {"option_name": "json_opt", "option_value": JSON_ENC},
                        {"option_name": "serial_opt", "option_value": SERIAL}]}


def export(php: str, script: Path, data: dict) -> list[dict]:
    with tempfile.TemporaryDirectory() as td:
        (Path(td) / "prelude.php").write_text(PRELUDE, encoding="utf-8")
        (Path(td) / "data.json").write_text(json.dumps(data), encoding="utf-8")
        done = subprocess.run([php, str(Path(td) / "prelude.php"), str(script), str(Path(td) / "data.json")], capture_output=True, text=True, encoding="utf-8")
    if done.returncode != 0:
        raise RuntimeError(done.stderr.strip()[:300] or done.stdout.strip()[:300])
    return json.loads(done.stdout)


def run(failures: list[str], script: Path | None = None) -> int:
    php = shutil.which("php")
    if not php:
        print("export-content.php offline proof: SKIPPED (php not on the PATH)")
        return 0
    got = export(php, script or HERE / "export-content.php", fixture())
    seen = {(r["store"], str(r["ID"])) for r in got}
    wanted = [(("postmeta", "1"), "plain post meta is exported as markup"),
              (("unsupported", "postmeta:2:serial"), "serialised post meta holding wp:sgs/ markup is unsupported"),
              (("unsupported", "postmeta:3:json"), "JSON-encoded post meta holding wp:sgs/ markup is unsupported"),
              (("option", "plain_opt"), "a plain option is exported as markup"),
              (("unsupported", "json_opt"), "a JSON-encoded option holding wp:sgs/ markup is unsupported"),
              (("unsupported", "serial_opt"), "a serialised option without a content slot is unsupported")]
    for key, label in wanted:
        if key not in seen:
            failures.append(f"export-content.php: {label}: {sorted(seen)}")
    if any(r["store"] == "postmeta" and r["ID"] in (2, 3, 4) for r in got) or any(r["ID"] == "postmeta:4:other" for r in got):
        failures.append("export-content.php: structured post meta was exported as raw markup, or one without wp:sgs/ was listed")
    maps = [r for r in got if r["store"] == "attachments"]
    want_files = {"2026/09/photo.jpeg": [41, 1200, 800, "image/jpeg"], "2026/09/photo-300x200.jpeg": [41, 300, 200, "image/jpeg"]}
    if len(maps) != 1 or maps[0].get("files") != want_files:
        failures.append(f"export-content.php: the attachment map (upload, sized copy, id, size, mime) is wrong: {maps}")
    if any(r["store"] == "attachments" for r in got if r.get("md5")):
        failures.append("export-content.php: the attachment record carries a content hash, so it would be mistaken for saved content")
    return len(wanted) + 3
