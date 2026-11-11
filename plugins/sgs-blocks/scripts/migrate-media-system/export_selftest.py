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
		foreach ( array( 'postmeta', 'options', 'posts' ) as $k ) { if ( false !== strpos( $q, 'FROM wp_' . $k ) ) { return $this->data[ $k ]; } }
		return array();
	}
}
global $wpdb;
$wpdb = new Fake_Wpdb();
$wpdb->data = json_decode( file_get_contents( $argv[2] ), true );
eval( file_get_contents( $argv[1] ) );
"""


def fixture() -> dict:
    meta = [(1, 'plain', PLAIN), (2, 'serial', SERIAL), (3, 'json', JSON_ENC), (4, 'other', SERIAL_OTHER)]
    return {"posts": [{"ID": 1, "post_type": "page", "post_name": "a", "post_status": "publish", "post_content": PLAIN}],
            "postmeta": [{"meta_id": i, "post_id": 9, "meta_key": k, "meta_value": v} for i, k, v in meta],
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
    return len(wanted) + 1
