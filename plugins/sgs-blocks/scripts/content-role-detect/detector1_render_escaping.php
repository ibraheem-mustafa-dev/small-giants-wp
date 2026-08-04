<?php
/**
 * Detector 1 — render.php output-escaping walk (structural, token-based).
 *
 * Finds every place a block attribute value flows (directly, or via a local
 * variable assignment) into an output-escaping call: esc_html/esc_html_e/
 * esc_textarea/wp_kses (SVG allow-list)/esc_url/esc_attr.
 *
 * Method: token_get_all() per file, split into top-level "logical statements"
 * (semicolon at paren-depth 0), track a simple sequential var->attr_key
 * symbol table (assignment left-to-right through the file, matching WP's
 * actual execution order for a directly-included render.php), then scan
 * each logical statement for escaping-function calls and resolve their
 * argument back to an attribute key either directly ($attributes['key'])
 * or via the symbol table.
 *
 * This is NOT a full data-flow engine (no branch-sensitivity, no function
 * boundaries beyond the file), but it is materially stronger than a
 * single-line regex: it follows `$var = sanitize_text_field($attributes['x'])`
 * on one line and `esc_html($var)` on a distant line, and it flattens
 * multi-line statements before matching so formatting can't hide a call.
 *
 * Output: NDJSON on stdout, one row per (file, attr_key, escaping_func) hit.
 *
 * Usage:
 *   php detector1_render_escaping.php <file1.php> [file2.php ...]
 *   php detector1_render_escaping.php --glob   (walks src/blocks/*\/render.php + includes/*.php)
 */

error_reporting(E_ALL & ~E_DEPRECATED);

function rglob_php(string $dir): array {
    $out = [];
    if (!is_dir($dir)) {
        return $out;
    }
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $file) {
        if ($file->isFile() && substr($file->getFilename(), -4) === '.php') {
            $out[] = str_replace('\\', '/', $file->getPathname());
        }
    }
    return $out;
}

/**
 * Every PHP file that can execute server-side for an sgs/* block, including
 * per-block helper files beyond render.php itself (e.g.
 * before-after/media-render.php, which is `require`d by render.php and is
 * where bgSvg-style content actually gets wp_kses()'d — a known blind spot
 * a render.php-only glob would miss) and the shared includes/ tree.
 */
function collect_default_files(string $repoRoot): array {
    $files = [];
    foreach (rglob_php($repoRoot . '/plugins/sgs-blocks/src/blocks') as $f) {
        $files[] = $f;
    }
    foreach (rglob_php($repoRoot . '/plugins/sgs-blocks/includes') as $f) {
        $files[] = $f;
    }
    return array_values(array_unique($files));
}

/**
 * Tokenize a PHP file and rebuild it as an array of "logical statements":
 * each entry is a flattened, whitespace-normalised string representing one
 * top-level statement (split on ';' when paren/bracket depth is 0), plus
 * the approximate starting line number of that statement.
 */
function tokenize_to_statements(string $code): array {
    $tokens = token_get_all($code);
    $statements = [];
    $buf = '';
    $parenDepth = 0;
    $line = 1;
    $stmtStartLine = 1;
    $bufNonEmpty = false;

    foreach ($tokens as $tok) {
        if (is_array($tok)) {
            [$id, $text, $tline] = $tok;
            if ($id === T_COMMENT || $id === T_DOC_COMMENT) {
                // Drop comments entirely (avoid false matches inside them).
                $line = $tline + substr_count($text, "\n");
                continue;
            }
            if ($id === T_WHITESPACE) {
                $buf .= ' ';
                $line = $tline + substr_count($text, "\n");
                continue;
            }
            if (!$bufNonEmpty) {
                $stmtStartLine = $tline;
                $bufNonEmpty = true;
            }
            $buf .= $text;
            $line = $tline + substr_count($text, "\n");
            if ($id === T_OPEN_TAG || $id === T_OPEN_TAG_WITH_ECHO) {
                // Statement boundary at PHP-open too (keeps HTML separate).
                continue;
            }
        } else {
            // Single-char token.
            if (!$bufNonEmpty && trim($tok) !== '') {
                $stmtStartLine = $line;
                $bufNonEmpty = true;
            }
            if ($tok === '(' || $tok === '[') {
                $parenDepth++;
            } elseif ($tok === ')' || $tok === ']') {
                $parenDepth = max(0, $parenDepth - 1);
            }
            $buf .= $tok;
            if ($tok === ';' && $parenDepth === 0) {
                $statements[] = ['line' => $stmtStartLine, 'text' => trim($buf)];
                $buf = '';
                $bufNonEmpty = false;
            }
        }
    }
    if (trim($buf) !== '') {
        $statements[] = ['line' => $stmtStartLine, 'text' => trim($buf)];
    }
    return $statements;
}

/**
 * The tokenizer only splits logical statements on a top-level `;`. PHP
 * control-structure headers (`if (...) {`, `foreach (...) {`, `} elseif
 * (...) {`, bare `}`, bare `{`) end in `{`/`}`, not `;`, so they get glued
 * onto the FRONT of whatever statement follows — including the file's own
 * `<?php` open tag on the very first statement. Any of these glued prefixes
 * breaks a strict `^\$var` assignment anchor.
 *
 * CONFIRMED LIVE BUGS (2026-08-04):
 *   1. `<?php` glue (negative-control plant caught this one first) — fixed,
 *      then independent verification found a SECOND instance of the same
 *      bug class:
 *   2. `if ( 'svg' === $media_type ) { $svg_content_raw = isset(...) ...;`
 *      (media/render.php:681-682) — the assignment that sources
 *      `sgs/media.svgContent` never entered the symbol table because the
 *      `if (...) {` header was glued onto its front, so the later
 *      `wp_kses( $svg_content_raw, ... )` call (line 788) couldn't resolve
 *      back to the attribute key. This is NOT a rare shape — an assignment
 *      as the first statement inside an `if`/`foreach`/`while` block is
 *      routine PHP, so this bug was silently dropping var-tracking
 *      wherever it occurred, not just at this one call site.
 *
 * Fix: strip every leading control-structure header (repeatedly, since
 * `} elseif (...) {` glues a close-brace AND a new header together) before
 * anchoring the assignment regex. Parens are walked by depth-counting
 * rather than a recursive regex — simpler to audit and this codebase's
 * WPCS-formatted `if ( cond ) {` headers don't need PCRE recursion.
 */
function strip_statement_glue(string $stmt): string {
    $stmt = ltrim($stmt);
    $changed = true;
    while ($changed) {
        $changed = false;

        if (preg_match('/^(?:<\?php|<\?=)\s*/', $stmt, $m)) {
            $stmt = ltrim(substr($stmt, strlen($m[0])));
            $changed = true;
            continue;
        }

        // A lone closing brace from a previous block (e.g. the "}" in
        // "}     $allowed_svg_tags = ...").
        if (preg_match('/^\}\s*/', $stmt, $m)) {
            $stmt = ltrim(substr($stmt, strlen($m[0])));
            $changed = true;
            continue;
        }

        // Control-structure header: keyword, a depth-balanced (...), then
        // the opening `{`.
        if (preg_match('/^(if|elseif|foreach|while|for|switch)\s*\(/', $stmt, $m)) {
            $openParenPos = strpos($stmt, '(', strlen($m[1]));
            $depth = 0;
            $n = strlen($stmt);
            $i = $openParenPos;
            for (; $i < $n; $i++) {
                if ($stmt[$i] === '(') {
                    $depth++;
                } elseif ($stmt[$i] === ')') {
                    $depth--;
                    if ($depth === 0) {
                        $i++;
                        break;
                    }
                }
            }
            $rest = ltrim(substr($stmt, $i));
            if ($rest !== '' && $rest[0] === '{') {
                $stmt = ltrim(substr($rest, 1));
                $changed = true;
                continue;
            }
            // No `{` followed (single-statement-body form, e.g.
            // `if ( $x ) $y = 1;`) — nothing safe to strip; stop.
        }

        if (preg_match('/^else\s*\{\s*/', $stmt, $m)) {
            $stmt = ltrim(substr($stmt, strlen($m[0])));
            $changed = true;
            continue;
        }

        if (preg_match('/^\{\s*/', $stmt, $m)) {
            $stmt = ltrim(substr($stmt, strlen($m[0])));
            $changed = true;
            continue;
        }
    }
    return $stmt;
}

/**
 * From a logical statement, try to extract a simple assignment:
 *   $var = <expr>;
 * Returns [varName, exprText] or null.
 */
function match_assignment(string $stmt): ?array {
    $stmt = strip_statement_glue($stmt);
    if (preg_match('/^\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+);$/s', $stmt, $m)) {
        // Exclude comparisons that regex might mis-catch (==, ===, =>) —
        // require the char right after the var+= is not '=' or '>' (already
        // excluded by the non-greedy structure above since we anchored on
        // single '=' via the pattern's lack of alternation with == etc).
        return [$m[1], $m[2]];
    }
    return null;
}

/**
 * Find $attributes['key'] or $attributes["key"] occurrences inside a text
 * fragment. Returns array of keys (strings) found, or a special marker
 * '::DYNAMIC::<raw>' when a key expression is non-literal (e.g. concatenated
 * / template-style: $attributes[ $side . 'SvgContent' ]).
 */
function extract_attr_keys(string $expr): array {
    $keys = [];
    // Literal key: $attributes['key'] or $attributes["key"]
    if (preg_match_all('/\$attributes\s*\[\s*([\'"])([A-Za-z0-9_]+)\1\s*\]/', $expr, $m)) {
        foreach ($m[2] as $k) {
            $keys[] = $k;
        }
    }
    // Dynamic key: $attributes[ <non-literal expression> ]
    if (preg_match_all('/\$attributes\s*\[\s*([^\'"\]][^\]]*)\]/', $expr, $m)) {
        foreach ($m[1] as $rawExpr) {
            $rawExpr = trim($rawExpr);
            // Try to resolve simple concatenation of a variable + literal
            // suffix/prefix, e.g. `$side . 'SvgContent'` or `"{$side}SvgContent"`.
            if (preg_match('/\.\s*([\'"])([A-Za-z0-9_]+)\1\s*$/', $rawExpr, $mm)) {
                $keys[] = '::DYNAMIC_SUFFIX::' . $mm[2] . '::EXPR::' . $rawExpr;
            } elseif (preg_match('/^([\'"])([A-Za-z0-9_]+)\1\s*\./', $rawExpr, $mm)) {
                $keys[] = '::DYNAMIC_PREFIX::' . $mm[2] . '::EXPR::' . $rawExpr;
            } else {
                $keys[] = '::DYNAMIC_UNRESOLVED::EXPR::' . $rawExpr;
            }
        }
    }
    return $keys;
}

/**
 * Classify an escaping call by function name + surrounding statement text.
 */
function classify_call(string $func, string $stmt): string {
    $lower = strtolower($func);
    if (in_array($lower, ['esc_html', 'esc_html__', 'esc_html_e', 'esc_textarea'], true)) {
        return 'visible-text';
    }
    if ($lower === 'esc_url' || $lower === 'esc_url_raw') {
        return 'link-href';
    }
    if ($lower === 'wp_kses' || $lower === 'wp_kses_post') {
        // SVG allow-list heuristic: nearby mention of 'svg' allow-list array
        // or the statement itself references svg tags.
        //
        // CONFIRMED LIVE BUG (2026-08-04): `wp_kses_post()` was missing from
        // the tracked-function list entirely (only bare `wp_kses` was
        // tracked). `sgs/hero.svgContent` is sanitised via
        // `wp_kses_post( $svg_content )` (hero/render.php:831) — a
        // completely different call than `sgs/media.svgContent`'s
        // `wp_kses( $svg_content_raw, $allowed_svg_tags )`
        // (media/render.php:788), which WAS tracked. This attribute went
        // undetected not because the shape was hard, but because the
        // function-name allowlist was incomplete — a class of miss the
        // dynamic-suffix cases documented in the report do not resemble at
        // all; it is a much simpler, and more embarrassing, gap.
        if (stripos($stmt, 'svg') !== false || stripos($stmt, 'allowed_svg') !== false) {
            return 'svg-markup';
        }
        return 'wp_kses-other';
    }
    if ($lower === 'esc_attr' || $lower === 'esc_attr_e' || $lower === 'esc_attr__') {
        // Look at the statement text around the call for the HTML attribute
        // it is feeding: aria-label=, alt=, title=  -> a11y-metadata
        // style=  -> STYLING (exclude)
        if (preg_match('/style\s*=\s*[\'"]?[^;]{0,60}$/i', substr($stmt, 0, strpos($stmt, $func) ?: 0))) {
            return 'STYLING-exclude';
        }
        // Search whole statement for nearest preceding HTML-attr token.
        $before = substr($stmt, 0, strpos($stmt, $func) ?: 0);
        if (preg_match('/(aria-label|alt|title)\s*=\s*[\'"]?\s*$/i', $before, $m)) {
            return 'a11y-metadata';
        }
        if (preg_match('/style\s*[:=]/i', $before)) {
            return 'STYLING-exclude';
        }
        return 'esc_attr-unclassified';
    }
    return 'unclassified-' . $lower;
}

function run(array $files, array $eligibleSet): void {
    foreach ($files as $file) {
        if (!is_file($file)) {
            fwrite(STDERR, "WARN: file not found: $file\n");
            continue;
        }
        $code = file_get_contents($file);
        $statements = tokenize_to_statements($code);

        $varToAttr = []; // varName => attrKey (or ::DYNAMIC...:: marker)
        $blockSlugGuess = infer_block_slug($file);

        foreach ($statements as $stmt) {
            $text = $stmt['text'];
            $line = $stmt['line'];

            // 1) Track assignments: $var = <expr containing $attributes[...]>
            $assign = match_assignment($text);
            if ($assign !== null) {
                [$varName, $exprText] = $assign;
                $keys = extract_attr_keys($exprText);
                if (!empty($keys)) {
                    // Take the first resolved key as the var's provenance.
                    $varToAttr[$varName] = $keys[0];
                } elseif (preg_match('/^\$([A-Za-z_][A-Za-z0-9_]*)$/', trim($exprText), $mm)) {
                    // $var2 = $var1;  (alias) — chase through symbol table.
                    $src = $mm[1];
                    if (isset($varToAttr[$src])) {
                        $varToAttr[$varName] = $varToAttr[$src];
                    }
                }
            }

            // 2) Find escaping-function calls in this statement.
            // `wp_kses_post` added 2026-08-04 (was missing entirely — see
            // classify_call()'s comment on the confirmed bug this caused).
            // `esc_attr__`/`esc_html__` also added the same day as a
            // defensive completeness pass, per the enumerated-function-name
            // audit (`grep -rhoE '\b(esc_[a-z_]+|wp_kses[a-z_]*)\s*\('`)
            // that surfaced the `wp_kses_post` gap in the first place —
            // every current call site of these two wraps a literal
            // hardcoded string (verified: zero matches for
            // `esc_attr__( \$` / `esc_html__( \$` across src/blocks +
            // includes), so this specific fix changes NO row in the
            // eligible-262 pool today, but closes the same allowlist-gap
            // shape before a future block wraps an attribute default with
            // one of these instead of `esc_attr`/`esc_html`.
            if (preg_match_all(
                '/\b(esc_html_e|esc_html__|esc_html|esc_textarea|esc_url_raw|esc_url|esc_attr_e|esc_attr__|esc_attr|wp_kses_post|wp_kses)\s*\(\s*([^,()]+(?:\([^()]*\))?[^,()]*)/',
                $text,
                $calls,
                PREG_SET_ORDER
            )) {
                foreach ($calls as $c) {
                    $func = $c[1];
                    $argRaw = trim($c[2]);

                    // Resolve argument to an attribute key.
                    $resolvedKeys = [];
                    $directKeys = extract_attr_keys($argRaw);
                    if (!empty($directKeys)) {
                        $resolvedKeys = $directKeys;
                    } elseif (preg_match_all('/\$([A-Za-z_][A-Za-z0-9_]*)/', $argRaw, $mm)) {
                        // EVERY variable in the argument, not just the first.
                        //
                        // Fixed 2026-08-04. This was `preg_match('/^\$.../')` — anchored to
                        // the START of the argument — so a concatenation credited only its
                        // leading variable. sgs/counter's
                        //     echo esc_html( $prefix . $formatted_number . $suffix );
                        // (render.php:381) resolved to `prefix` alone, so `suffix` looked
                        // as though it were never rendered as visible text and was VETOED,
                        // while its identical twin `prefix` was assigned. Two attributes,
                        // one line, opposite verdicts — which is how the bug surfaced.
                        // Under-reports silently on every multi-variable escaped concat.
                        foreach (array_unique($mm[1]) as $varName) {
                            if (isset($varToAttr[$varName])) {
                                $resolvedKeys[] = $varToAttr[$varName];
                            }
                        }
                        $resolvedKeys = array_values(array_unique($resolvedKeys));
                    }

                    foreach ($resolvedKeys as $key) {
                        $category = classify_call($func, $text);
                        $isDynamic = str_starts_with($key, '::DYNAMIC');
                        $rows = [];
                        if ($isDynamic) {
                            // Emit a dynamic-key marker row; the caller
                            // (Python side) will expand against the real
                            // eligible attr list by suffix/prefix match.
                            $rows[] = [
                                'file' => $file,
                                'block_slug' => $blockSlugGuess,
                                'line' => $line,
                                'attr_key' => $key,
                                'func' => $func,
                                'category' => $category,
                                'statement' => mb_substr($text, 0, 220),
                                'dynamic' => true,
                            ];
                        } else {
                            $rows[] = [
                                'file' => $file,
                                'block_slug' => $blockSlugGuess,
                                'line' => $line,
                                'attr_key' => $key,
                                'func' => $func,
                                'category' => $category,
                                'statement' => mb_substr($text, 0, 220),
                                'dynamic' => false,
                            ];
                        }
                        foreach ($rows as $r) {
                            echo json_encode($r) . "\n";
                        }
                    }
                }
            }
        }
    }
}

function infer_block_slug(string $file): ?string {
    // .../src/blocks/<slug>/render.php -> sgs/<slug>
    if (preg_match('#/src/blocks/([a-z0-9-]+)/render\.php$#', str_replace('\\', '/', $file), $m)) {
        return 'sgs/' . $m[1];
    }
    return null; // shared include file — not block-scoped.
}

// --- entry point ---
$args = array_slice($argv, 1);
$repoRoot = 'c:/Users/Bean/Projects/small-giants-wp';

if (empty($args) || $args[0] === '--glob') {
    $files = collect_default_files($repoRoot);
} else {
    $files = $args;
}

run($files, []);
