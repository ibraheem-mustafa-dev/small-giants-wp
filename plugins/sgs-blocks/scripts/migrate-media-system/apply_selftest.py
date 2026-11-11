"""Offline proof of `apply-content.php` with a fake `$wpdb` that logs every statement: it refuses a non-InnoDB table before
writing, and re-checks each record under `SELECT ... FOR UPDATE` inside the transaction (a changed row rolls back with no
write). Needs PHP on the PATH (skipped, and said so, otherwise)."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent

PRELUDE = r"""<?php
function maybe_unserialize( $v ) { return $v; }
function maybe_serialize( $v ) { return serialize( $v ); }
function clean_post_cache( $id ) {}
function wp_cache_delete( $a, $b = '' ) {}
function wp_cache_flush() {}
function wp_json_encode( $v ) { return json_encode( $v ); }
class Fake_Wpdb {
	public $posts = 'wp_posts'; public $postmeta = 'wp_postmeta'; public $options = 'wp_options'; public $log = array(); public $rows; public $engine;
	function prepare( $q, ...$a ) { foreach ( $a as $v ) { $q = preg_replace( '/%[ds]/', is_int( $v ) ? (string) $v : "'" . $v . "'", $q, 1 ); } return $q; }
	function get_var( $q ) {
		$this->log[] = $q;
		if ( false !== strpos( $q, 'information_schema' ) ) { return $this->engine; }
		return preg_match( '/ID = (\d+)/', $q, $m ) ? ( $this->rows[ (int) $m[1] ] ?? null ) : null;
	}
	function query( $q ) { $this->log[] = $q; return 1; }
	function update( $t, $data, $where ) { $this->log[] = 'UPDATE ' . $t; $this->rows[ (int) $where['ID'] ] = $data['post_content']; return 1; }
}
global $wpdb, $args;
$wpdb = new Fake_Wpdb();
$spec = json_decode( file_get_contents( $argv[2] ), true );
$wpdb->rows = array_map( 'strval', array_combine( array_keys( $spec['rows'] ), $spec['rows'] ) );
$wpdb->engine = $spec['engine'];
$args = array( $argv[3] );
register_shutdown_function( function () use ( $wpdb, $argv ) { file_put_contents( $argv[4], json_encode( $wpdb->log ) ); } );
include $argv[1];
"""


def md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def apply(php: str, engine: str, stored: str, expected: str) -> tuple[int, str, list[str]]:
    """Run apply-content.php for one posts record whose export hashed `expected`; returns (exit code, stderr, statement log)."""
    with tempfile.TemporaryDirectory() as td:
        d = Path(td)
        (d / "prelude.php").write_text(PRELUDE, encoding="utf-8")
        (d / "spec.json").write_text(json.dumps({"engine": engine, "rows": {"5": stored}}), encoding="utf-8")
        (d / "in.json").write_text(json.dumps([{"store": "posts", "ID": 5, "sub": "", "md5": md5(expected), "content": "NEW"}]), encoding="utf-8")
        done = subprocess.run([php, str(d / "prelude.php"), str(HERE / "apply-content.php"), str(d / "spec.json"), str(d / "in.json"), str(d / "log.json")],
                              capture_output=True, text=True, encoding="utf-8")
        log = json.loads((d / "log.json").read_text(encoding="utf-8")) if (d / "log.json").exists() else []
    return done.returncode, done.stderr, log


def run(failures: list[str]) -> int:
    php = shutil.which("php")
    if not php:
        print("apply-content.php offline proof: SKIPPED (php not on the PATH)")
        return 0
    code, err, log = apply(php, "MyISAM", "OLD", "OLD")
    if code == 0 or "not InnoDB" not in err or any(q.startswith(("UPDATE", "START")) for q in log):
        failures.append(f"apply-content.php: a MyISAM table was not refused before any write: exit {code}, {err.strip()[:120]}, {log}")
    code, err, log = apply(php, "InnoDB", "OLD", "OLD")
    first_read = next((i for i, q in enumerate(log) if "FROM wp_posts" in q), -1)
    if code != 0 or "UPDATE wp_posts" not in log or first_read < log.index("START TRANSACTION") or "FOR UPDATE" not in log[first_read] or log[-1] != "COMMIT":
        failures.append(f"apply-content.php: the md5 re-check does not run under FOR UPDATE inside the transaction: exit {code}, {log}")
    code, err, log = apply(php, "InnoDB", "CHANGED", "OLD")
    if code == 0 or "changed since the export" not in err or "UPDATE wp_posts" in log or "ROLLBACK" not in log:
        failures.append(f"apply-content.php: a changed row was not refused with a rollback and no write: exit {code}, {err.strip()[:120]}, {log}")
    return 3
