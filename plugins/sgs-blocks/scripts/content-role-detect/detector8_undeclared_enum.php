<?php
/**
 * Detector 8 — UNDECLARED ENUM (a schema gap, not a role gap).
 *
 * WHAT IT FOUND, and why this is a scanner rather than another role-assigner.
 *
 * `eligible_pool()` in fingerprint_content_roles.py excludes every row with
 * `enum_values IS NOT NULL`. So by construction, every attribute still sitting unclassified
 * has NO `enum` declared in its block.json. Several of them are nonetheless enums in every
 * meaningful sense — the render.php validates the incoming value against a hard-coded list
 * of allowed strings and falls back to a default:
 *
 *     $source = in_array( $attributes['source'] ?? '', array( 'typed', 'menu' ), true )
 *         ? $attributes['source'] : 'typed';        // icon-list/render.php:158
 *
 * The allowed set exists and is enforced. It just lives in PHP instead of in the schema.
 *
 * WHY REPORT THE SCHEMA GAP INSTEAD OF SEEDING A ROLE. `/sgs-update` Stage 1 already reads
 * block.json enums into `block_attributes.enum_values` (sgs-update-v2.py:895), and
 * assign-canonical TIER 3.5 already seeds `enum-mode` deterministically from that column.
 * So declaring the enum makes the EXISTING machinery classify the row with no new role
 * logic at all. Three things improve at once:
 *   1. the row gets `enum-mode` from a mechanism that already exists and is already tested;
 *   2. WordPress itself validates the attribute (an out-of-enum value is coerced to the
 *      declared default rather than silently stored);
 *   3. the block editor can offer the client a proper select control instead of a free-text
 *      box — which is the whole point of Spec 35.
 * Seeding a role here would fix the symptom and leave the schema still lying.
 *
 * ⚠ IT REPORTS, IT DOES NOT WRITE. No block.json is edited and no DB row is touched. The
 * allowed-value list is EVIDENCE for a human's declaration, because choosing the canonical
 * order and the default is an authoring decision this scanner has no basis to make.
 *
 * BLIND SPOTS, stated rather than discovered later:
 *  1. Only `in_array(...)` allow-lists are recognised. A closed set expressed as a chain of
 *     `'left' === $x` comparisons (sgs/responsive-logo.align) is a real enum this misses --
 *     proving a comparison CHAIN is exhaustive is a different and much weaker inference,
 *     deliberately not attempted.
 *  2. Single-file: the allow-list must be in the block's own render.php.
 *  3. It does not verify the values are the COMPLETE intended set -- only that the code
 *     enforces exactly these today.
 */

require_once __DIR__ . '/detector7_css_paint_flow.php';

/**
 * Literal string members of an `array( 'a', 'b' )` / `[ 'a', 'b' ]` expression.
 *
 * ⚠ THE `[` ALTERNATIVE MUST NOT MATCH ARRAY ACCESS. The first version accepted a bare
 * `\[`, so on the real grounding statement
 *     in_array( $attributes['source'] ?? '', array( 'typed', 'menu' ), true )
 * it matched the `[` of `$attributes[` and returned the single value `source` — under the
 * >=2 guard that is silently "no enum here", i.e. the detector reported nothing and looked
 * like a world with no enums in it. Caught by its own positive check.
 *
 * `array( … )` is tried first; a short-syntax `[ … ]` is accepted only where an EXPRESSION
 * can begin (start of string, or after `,` `(` `=` `>`), which array access never is.
 */
function enum_literals_from_array_expr(string $expr): array {
    $inner = null;
    if (preg_match('/\barray\s*\((.*?)\)/s', $expr, $m)) {
        $inner = $m[1];
    } elseif (preg_match('/(?:^|[,(=>])\s*\[([^\]]*)\]/s', $expr, $m)) {
        $inner = $m[1];
    }
    if ($inner === null) {
        return array();
    }
    if (!preg_match_all('/([\'"])([^\'"]*)\1/', $inner, $lm)) {
        return array();
    }
    $vals = array_values(array_unique($lm[2]));
    // A single-member "list" is a comparison in disguise, not an enum worth declaring.
    return count($vals) >= 2 ? $vals : array();
}

/**
 * Find `in_array( <carrier-or-attribute>, array( ... ) )` for the given attribute.
 *
 * @return array{values:array<int,string>,line:int}|null
 */
function find_enum_allowlist(array $statements, string $attr, array $carriers): ?array {
    foreach ($statements as $st) {
        $text = is_array($st) ? ($st['text'] ?? '') : (string) $st;
        $line = is_array($st) ? (int) ($st['line'] ?? 0) : 0;
        if (stripos($text, 'in_array') === false) {
            continue;
        }
        // The subject must be THIS attribute, either read directly or via a carrier --
        // never merely "an in_array somewhere in the same statement".
        $subject = preg_match(
            '/\$attributes\s*\[\s*[\'"]' . preg_quote($attr, '/') . '[\'"]\s*\]/',
            $text
        );
        if (!$subject) {
            foreach (array_keys($carriers) as $var) {
                if (preg_match('/in_array\s*\(\s*\$' . preg_quote($var, '/') . '\b/', $text)) {
                    $subject = true;
                    break;
                }
            }
        }
        if (!$subject) {
            continue;
        }
        $vals = enum_literals_from_array_expr($text);
        if ($vals) {
            return array('values' => $vals, 'line' => $line);
        }
    }
    return null;
}

/** Already declared in block.json? Then there is nothing to report. */
function block_json_declares_enum(string $blockSlug, string $attr): bool {
    $slug = substr($blockSlug, strpos($blockSlug, '/') + 1);
    $path = dirname(__DIR__, 2) . '/src/blocks/' . $slug . '/block.json';
    if (!is_file($path)) {
        return false;
    }
    $json = json_decode((string) file_get_contents($path), true);
    $decl = $json['attributes'][$attr] ?? null;
    return is_array($decl) && isset($decl['enum']);
}

/**
 * @param array<int,array{0:string,1:string}> $candidates
 * @return array<int,array<string,mixed>>
 */
function detect_undeclared_enums(array $candidates): array {
    $out = array();
    foreach ($candidates as $cand) {
        list($slug, $attr) = $cand;
        if (block_json_declares_enum($slug, $attr)) {
            continue;
        }
        $file = render_file_for($slug);
        if ($file === null) {
            continue;
        }
        $statements = tokenize_to_statements((string) file_get_contents($file));
        $carriers = carriers_for($statements, $attr);
        $hit = find_enum_allowlist($statements, $attr, $carriers);
        if ($hit === null) {
            continue;
        }
        $out[] = array(
            'block_slug'     => $slug,
            'attr_name'      => $attr,
            'allowed_values' => $hit['values'],
            'evidence_file'  => 'plugins/sgs-blocks/src/blocks/'
                . substr($slug, strpos($slug, '/') + 1) . '/render.php',
            'evidence_line'  => $hit['line'],
            'action'         => 'declare "enum" on this attribute in block.json; '
                . '/sgs-update Stage 1 then fills enum_values and assign-canonical '
                . 'TIER 3.5 seeds role=enum-mode with no new role logic',
        );
    }
    return $out;
}

// ---------------------------------------------------------------------------
function self_test_d8(): int {
    $failures = array();

    // 1. POSITIVE — icon-list.source is validated against array('typed','menu') at
    //    render.php:158 and block.json declares no enum for it.
    $r = detect_undeclared_enums(array(array('sgs/icon-list', 'source')));
    if (count($r) !== 1) {
        $failures[] = 'icon-list.source produced NO finding; it is validated against '
            . "array('typed','menu') in render.php and has no declared enum. A zero here "
            . 'means the scan is broken, not that the world is empty.';
    } elseif (array_values(array_diff(array('typed', 'menu'), $r[0]['allowed_values']))) {
        $failures[] = 'icon-list.source values were ' . implode('|', $r[0]['allowed_values'])
            . ", expected to contain typed+menu.";
    }

    // 2. POSITIVE via a CARRIER, not a direct read. mega-panel.viewAllPlacement is
    //    in_array'd on the raw attribute; timeline.orientation is in_array'd on the
    //    VARIABLE ($orientation, render.php:72) one line after the read. If carrier
    //    resolution regresses, this is the check that notices.
    $r = detect_undeclared_enums(array(array('sgs/timeline', 'orientation')));
    if (count($r) !== 1 || count($r[0]['allowed_values']) < 2) {
        $failures[] = 'timeline.orientation produced no carrier-based finding — the '
            . 'allow-list is applied to the variable, not to $attributes[...], so this '
            . 'proves carrier resolution still works.';
    }

    // 3. NEGATIVE CONTROL — an attribute with NO allow-list must NOT be reported.
    //    post-grid.orderBy is sanitize_key()'d, never enumerated.
    $r = detect_undeclared_enums(array(array('sgs/post-grid', 'orderBy')));
    if (count($r) !== 0) {
        $failures[] = 'post-grid.orderBy was reported as an undeclared enum ('
            . implode('|', $r[0]['allowed_values']) . '). It is sanitize_key()d with no '
            . 'allow-list — the scan is matching an unrelated in_array in the file.';
    }

    // 4. NEGATIVE CONTROL — an attribute that ALREADY declares an enum must not be
    //    reported, or the scanner would generate permanent phantom work.
    $withEnum = null;
    foreach (glob(dirname(__DIR__, 2) . '/src/blocks/*/block.json') as $bj) {
        $json = json_decode((string) file_get_contents($bj), true);
        foreach (($json['attributes'] ?? array()) as $name => $decl) {
            if (is_array($decl) && isset($decl['enum'])) {
                $withEnum = array('sgs/' . basename(dirname($bj)), $name);
                break 2;
            }
        }
    }
    if ($withEnum === null) {
        $failures[] = 'could not find ANY block.json declaring an enum — check 4 cannot '
            . 'run, so the already-declared guard is unproven.';
    } elseif (block_json_declares_enum($withEnum[0], $withEnum[1]) !== true) {
        $failures[] = 'block_json_declares_enum() returned false for ' . $withEnum[0] . '.'
            . $withEnum[1] . ', which demonstrably declares one — the guard is inverted '
            . 'and every already-declared attr would be re-reported forever.';
    }

    // 5. A fabricated attribute must produce nothing.
    if (count(detect_undeclared_enums(array(array('sgs/icon-list', 'zzzNotReal')))) !== 0) {
        $failures[] = 'a fabricated attribute name produced a finding.';
    }

    if ($failures) {
        echo 'DETECTOR-8 SELF-TEST FAILED (' . count($failures) . " checks)\n";
        foreach ($failures as $f) {
            echo '  - ' . $f . "\n";
        }
        return 1;
    }
    echo "DETECTOR-8 SELF-TEST PASSED — 5 checks green.\n";
    return 0;
}

if (PHP_SAPI === 'cli' && isset($argv[0]) && realpath($argv[0]) === realpath(__FILE__)) {
    $a = array_slice($argv, 1);
    if (in_array('--self-test', $a, true)) {
        exit(self_test_d8());
    }
    if (count($a) >= 2 && $a[0] === '--candidates') {
        $raw = json_decode((string) file_get_contents($a[1]), true);
        $c = array();
        foreach ((array) $raw as $row) {
            $c[] = array($row[0], $row[1]);
        }
        foreach (detect_undeclared_enums($c) as $row) {
            echo json_encode($row) . "\n";
        }
        exit(0);
    }
    fwrite(STDERR, "usage: detector8_undeclared_enum.php --self-test | --candidates <file.json>\n");
    exit(2);
}
