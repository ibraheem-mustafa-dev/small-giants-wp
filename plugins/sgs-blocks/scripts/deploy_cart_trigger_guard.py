"""Deploy refusal: a build with the shared cart trigger settings never ships to a target whose saved content still holds the old ones.

The `sgs/cart` block used to keep separate padding, size and radius settings for its icon button and its text pill
(`pillPadding`, `pillMinHeight`, `iconTriggerSize`, `pillBorderRadius`, `iconTriggerRadius`). The new block reads `triggerPadding`,
`triggerSize` and `triggerBorderRadius` only, so a deploy before the sweep (`sweep-cart-trigger-attrs.php`) drops a header's
padding, height and radius. This guard runs the sweep's own rewrite (`lib/cart-trigger-sweep.php`, sent inside the command so the
target needs no copy of it) as a read-only dry run on the target and refuses while any post would change.
"""
from __future__ import annotations

import base64
import gzip
import json
import re
import shlex
import shutil
import subprocess
import tempfile
from pathlib import Path

from deploy_common import REPO_ROOT, err, log, ssh_base_cmd
from deploy_scratch import scratch_dir

MAX_REMOTE_COMMAND = 8000
MARKER = "SGS_CART_SWEEP "
SWEEP_LIB = Path(__file__).resolve().parent / "lib" / "cart-trigger-sweep.php"
CART_BLOCK_JSON = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks" / "cart" / "block.json"

_DRY_RUN_PHP = r"""
global $wpdb;
$rows = $wpdb->get_results( "SELECT ID, post_type, post_name, post_content FROM {$wpdb->posts} WHERE post_type NOT IN ('revision','auto-draft') AND post_content LIKE '%wp:sgs/cart%' ORDER BY ID" );
$changed = array();
foreach ( $rows as $row ) {
	$result = sgs_cart_trigger_sweep_content( (string) $row->post_content );
	if ( $result['changed'] > 0 ) {
		$changed[] = array( 'ID' => (int) $row->ID, 'post_type' => $row->post_type, 'post_name' => $row->post_name, 'blocks' => $result['changed'], 'keys' => array_keys( $result['keys'] ), 'conflicts' => count( $result['conflicts'] ) );
	}
}
echo "\n" . '__MARKER__' . wp_json_encode( array( 'scanned' => count( $rows ), 'changed' => $changed ) ) . "\n";
"""


def build_has_shared_trigger() -> bool:
    """True when this build's `sgs/cart` declares `triggerPadding`, the marker that the old settings are gone from it."""
    try:
        attrs = json.loads(CART_BLOCK_JSON.read_text(encoding="utf-8")).get("attributes", {})
    except (OSError, ValueError) as e:
        raise RuntimeError(f"cart block.json unreadable: {e}") from e
    return "triggerPadding" in attrs


def check_php(lib_source: str | None = None) -> str:
    """The PHP the target runs: the sweep's rewrite functions, then a loop that collects the posts the rewrite would change."""
    source = SWEEP_LIB.read_text(encoding="utf-8") if lib_source is None else lib_source
    return re.sub(r"^\s*<\?php", "", source, count=1) + _DRY_RUN_PHP.replace("__MARKER__", MARKER)


def remote_command(wp_root: str, lib_source: str | None = None) -> str:
    """One read-only shell command: `wp eval` of `check_php()`, carried inside the command so the target needs no file."""
    encoded = base64.b64encode(gzip.compress(check_php(lib_source).encode("utf-8"), mtime=0)).decode("ascii")
    cmd = f'cd {shlex.quote(wp_root)} && wp eval "$(echo {encoded} | base64 -d | gunzip)"'
    if len(cmd) > MAX_REMOTE_COMMAND:
        raise ValueError(f"the check command is {len(cmd)} characters, over the {MAX_REMOTE_COMMAND} an ssh on Windows carries")
    return cmd


def parse_result(raw: str) -> dict:
    """The check's JSON from the first output line that starts with the marker (warnings before it are skipped)."""
    for line in raw.splitlines():
        if line.startswith(MARKER):
            data = json.loads(line[len(MARKER):])
            if isinstance(data, dict) and isinstance(data.get("changed"), list) and isinstance(data.get("scanned"), int):
                return data
    raise ValueError("no sweep result in the check output")


def refusal_lines(target_key: str, wp_content: str, data: dict) -> list[str]:
    """What the refusal prints: the posts, then the backup and sweep commands in order."""
    wp_root = wp_content.rsplit("/wp-content", 1)[0]
    lines = [f"[cart-trigger-guard] REFUSED: target {target_key} still holds the old cart trigger settings in {len(data['changed'])} post(s):"]
    for post in data["changed"][:10]:
        lines.append(f"  #{post['ID']} {post['post_type']} {post['post_name']}: {post['blocks']} sgs/cart block(s), old settings {', '.join(post['keys'])}")
    if len(data["changed"]) > 10:
        lines.append(f"  ... and {len(data['changed']) - 10} more")
    lines += [
        "this build reads triggerPadding, triggerSize and triggerBorderRadius only: deployed first, the header loses its padding, height and radius.",
        "sweep first, then deploy straight after:",
        f"  1. bash scripts/local-wp/backup-remote-db.sh {target_key} cart-trigger",
        "  2. ssh hd \"mkdir -p ~/lib\" && scp plugins/sgs-blocks/scripts/sweep-cart-trigger-attrs.php hd:~/ && scp plugins/sgs-blocks/scripts/lib/cart-trigger-sweep.php hd:~/lib/",
        f"  3. ssh hd \"cd {wp_root} && wp eval-file ~/sweep-cart-trigger-attrs.php --user=1\"   (dry run: it must list every post above)",
        f"  4. ssh hd \"cd {wp_root} && wp eval-file ~/sweep-cart-trigger-attrs.php apply --user=1\"   (it refuses a post whose two styles carried different corner radii: pick one radius in the editor, or add the word accept-conflicts after `apply` to keep the one it lists)",
    ]
    return lines


def step_cart_trigger_guard(dry_run: bool, use_alias: bool, target_key: str, wp_content: str, fetch=None, has_marker=None) -> int:
    """Return 0 to continue, 1 to refuse. `fetch` and `has_marker` are test seams; the real ones use SSH and the cart block.json."""
    try:
        shared = build_has_shared_trigger() if has_marker is None else has_marker
    except RuntimeError as e:
        err(f"[cart-trigger-guard] {e}")
        return 1
    if not shared:
        log("[cart-trigger-guard] SKIPPED: this build's sgs/cart still reads the old trigger settings")
        return 0
    if dry_run:
        log("[cart-trigger-guard] SKIPPED (--dry-run); would run the sweep's dry run on the target")
        return 0
    wp_root = wp_content.rsplit("/wp-content", 1)[0]
    log(f"[cart-trigger-guard] running the cart trigger sweep as a dry run on {target_key} (read-only)")
    try:
        if fetch is None:
            out = subprocess.run(ssh_base_cmd(use_alias) + [remote_command(wp_root)], capture_output=True, text=True, encoding="utf-8",
                                 errors="replace", timeout=180)
            if out.returncode != 0:
                raise RuntimeError(f"SSH check failed (exit {out.returncode}): {(out.stderr or '').strip()[:300]}")
            raw = out.stdout
        else:
            raw = fetch(target_key)
        data = parse_result(raw)
    except (RuntimeError, subprocess.SubprocessError, OSError, ValueError) as e:
        err(f"[cart-trigger-guard] {target_key}: cannot read saved content: {e}")
        err("fail-closed on purpose: unchecked saved content cannot be shown free of the old cart trigger settings")
        return 1
    if not data["changed"]:
        log(f"[cart-trigger-guard] PASS: {data['scanned']} post(s) hold a basket, none holds an old trigger setting")
        return 0
    for line in refusal_lines(target_key, wp_content, data):
        err(line)
    return 1


def self_test() -> list[str]:
    """A swept target passes, an old key refuses (negative control), an unreadable result fails closed, and the command fits. No network."""
    failures: list[str] = []
    clean = MARKER + json.dumps({"scanned": 3, "changed": []})
    dirty = MARKER + json.dumps({"scanned": 3, "changed": [{"ID": 7, "post_type": "wp_template_part", "post_name": "header", "blocks": 1,
                                                            "keys": ["pillPadding"], "conflicts": 0}]})
    root = "/x/wp-content"

    def no_fetch(_t):
        raise AssertionError("skip must not fetch")

    if step_cart_trigger_guard(False, False, "t", root, fetch=no_fetch, has_marker=False) != 0:
        failures.append("cart trigger guard: a build that still reads the old settings did not skip")
    if step_cart_trigger_guard(False, False, "t", root, fetch=lambda _t: "Warning: x\n" + clean, has_marker=True) != 0:
        failures.append("cart trigger guard: a swept target was refused")
    if step_cart_trigger_guard(False, False, "t", root, fetch=lambda _t: dirty, has_marker=True) != 1:
        failures.append("cart trigger guard NEGATIVE CONTROL: a target holding an old key was not refused")
    if step_cart_trigger_guard(False, False, "t", root, fetch=lambda _t: "not json", has_marker=True) != 1:
        failures.append("cart trigger guard: an unreadable result did not fail closed")
    text = "\n".join(refusal_lines("t", "/a/domains/h/public_html/wp-content", json.loads(dirty[len(MARKER):])))
    for needle in ("backup-remote-db.sh t ", "sweep-cart-trigger-attrs.php", "#7 "):
        if needle not in text:
            failures.append(f"cart trigger guard: the refusal does not name {needle!r}")
    try:
        remote_command("/x")
    except ValueError as e:
        failures.append(f"cart trigger guard: the check command no longer fits one ssh command: {e}")
    failures.extend(_self_test_php())
    return failures


_PHP_STUB = r"""<?php
function wp_json_encode( $v ) { return json_encode( $v ); }
function serialize_block_attributes( $a ) { return json_encode( $a ); }
$wpdb = new class {
	public $posts = 'wp_posts';
	public function get_results( $q ) {
		return array(
			(object) array( 'ID' => 1, 'post_type' => 'page', 'post_name' => 'old', 'post_content' => '<!-- wp:sgs/cart {"pillMinHeight":{"desktop":"20px"},"triggerStyle":"pill"} /-->' ),
			(object) array( 'ID' => 2, 'post_type' => 'page', 'post_name' => 'new', 'post_content' => '<!-- wp:sgs/cart {"triggerPadding":{"desktop":{"top":"1px"}}} /-->' ),
		);
	}
};
"""


def _self_test_php() -> list[str]:
    """Run the exact PHP the target evaluates against a stub database: it must name the one post that holds an old key."""
    php = shutil.which("php")
    if php is None:
        log("[cart-trigger-guard] self-test: php not found, the check's PHP was not run")
        return []
    with tempfile.TemporaryDirectory(dir=scratch_dir()) as td:
        script = Path(td) / "check.php"
        script.write_text(_PHP_STUB + check_php(), encoding="utf-8")
        out = subprocess.run([php, str(script)], capture_output=True, text=True, encoding="utf-8")
    try:
        data = parse_result(out.stdout)
    except ValueError:
        return [f"cart trigger guard: the check's PHP printed no result: {(out.stderr or out.stdout).strip()[:200]}"]
    if data["scanned"] != 2 or [p["ID"] for p in data["changed"]] != [1]:
        return [f"cart trigger guard NEGATIVE CONTROL: the check's PHP did not name only the old-key post: {data}"]
    return []
