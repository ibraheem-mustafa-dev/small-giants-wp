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
 *
 * $printfContext / $forwardContext are optional fallback "before" windows
 * (see printf_placeholder_context()/forward_variable_context() below) tried
 * in order when the immediate same-statement text doesn't show an HTML
 * attribute name. Two blind spots closed 2026-08-05 (independent-verification
 * pass): (1) `printf`/`sprintf` split the HTML attribute name (in the format
 * string) from the escaped value (a positional argument) — the immediate
 * "text right before the call" is the wrong place to look; (2) a value is
 * escaped INTO a local variable at assignment time (e.g. button's
 * `$aria_label = ... ? esc_attr( $attributes['ariaLabel'] ) : ...;`) and the
 * HTML attribute it becomes lives in a LATER statement where that variable
 * is read — D1 already tracked attribute->variable; this closes the other
 * direction, variable->use-site.
 */
function classify_call(string $func, string $stmt, ?string $printfContext = null, ?string $forwardContext = null): string {
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
        $idx = strpos($stmt, $func);
        $before = substr($stmt, 0, $idx !== false ? $idx : 0);

        $result = classify_esc_attr_window($before);
        if ($result !== 'esc_attr-unclassified') {
            return $result;
        }
        if (null !== $printfContext) {
            $result = classify_esc_attr_window($printfContext);
            if ($result !== 'esc_attr-unclassified') {
                return $result;
            }
        }
        if (null !== $forwardContext) {
            $result = classify_esc_attr_window($forwardContext);
            if ($result !== 'esc_attr-unclassified') {
                return $result;
            }
        }
        return 'esc_attr-unclassified';
    }
    return 'unclassified-' . $lower;
}

/**
 * Given a "before" window (the text immediately preceding an esc_attr* call,
 * from ANY of the three candidate windows above), decide what the value
 * feeds. Kept intentionally narrow — this PHP-side field is a diagnostic
 * mirror of classify_detector1.py's classify_esc_attr(), which is the field
 * actually consumed downstream (its output wins via `final_category` in
 * fingerprint_content_roles.py); the two are kept in sync deliberately so
 * this raw-fact stage is trustworthy on its own if ever read directly.
 */
function classify_esc_attr_window(string $before): string {
    // STYLING — feeds a style="" attribute, either HTML or PHP array-key form.
    if (preg_match('/style\s*=\s*[\'"]{0,2}\s*\.?\s*$/i', $before)) {
        return 'STYLING-exclude';
    }
    if (preg_match('/[\'"]style[\'"]\s*=>\s*$/i', $before)) {
        return 'STYLING-exclude';
    }
    // a11y-metadata — aria-label=, alt=, title=, placeholder=. Deliberately
    // NOT a blanket `aria-[a-z]+`: most other aria-* attributes
    // (aria-describedby, aria-controls, aria-owns...) hold ID REFERENCES or
    // boolean state, not accessible TEXT.
    // SPLIT 2026-08-05 (Bean challenged the lumping). `alt` and `placeholder` were
    // classified 'a11y-metadata' alongside aria-label/title. That routes them to the
    // a11y-text role, classification styling-behaviour -- EXCLUDED from the content walk.
    // Both are wrong there:
    //   * alt         -- a client AUTHORS alt text and edits it; it must transfer.
    //   * placeholder -- D482 ruled explicitly "a placeholder is content"; 13 rows were
    //                    reclassified from 'behaviour' to content on exactly that basis.
    // aria-label/title ARE functional accessible names, often DERIVED in render.php rather
    // than authored (responsive-logo builds a fallback from the site name), so they stay
    // a11y-metadata. One coarse category made two real content shapes invisible.
    if (preg_match('/(^|[^a-z-])(alt|placeholder)\s*=\s*[\'"]{0,2}\s*\.?\s*$/i', $before)) {
        return 'authored-alt-text';
    }
    if (preg_match('/(aria-label|title)\s*=\s*[\'"]{0,2}\s*\.?\s*$/i', $before)) {
        return 'a11y-metadata';
    }
    // PHP associative-array literal form: 'aria-label' => esc_attr( $x ) —
    // the SGS_Container_Wrapper::render() `extra_attrs` shape (sgs/nav-menu).
    if (preg_match('/[\'"](alt|placeholder)[\'"]\s*=>\s*$/i', $before)) {
        return 'authored-alt-text';
    }
    if (preg_match('/[\'"](aria-label|title)[\'"]\s*=>\s*$/i', $before)) {
        return 'a11y-metadata';
    }
    return 'esc_attr-unclassified';
}

/**
 * Depth-balanced split of a comma-separated argument list into
 * ['text' => .., 'start' => absolute offset, 'end' => absolute offset]
 * entries, respecting quoted strings and nested ()/[] so a comma inside a
 * string literal or a nested call never splits an argument.
 */
function split_top_level_args(string $s, int $baseOffset): array {
    $args = [];
    $depth = 0;
    $inStr = null;
    $start = 0;
    $n = strlen($s);
    for ($i = 0; $i < $n; $i++) {
        $ch = $s[$i];
        if (null !== $inStr) {
            if ('\\' === $ch) {
                $i++;
                continue;
            }
            if ($ch === $inStr) {
                $inStr = null;
            }
            continue;
        }
        if ("'" === $ch || '"' === $ch) {
            $inStr = $ch;
            continue;
        }
        if ('(' === $ch || '[' === $ch) {
            $depth++;
            continue;
        }
        if (')' === $ch || ']' === $ch) {
            $depth--;
            continue;
        }
        if (',' === $ch && 0 === $depth) {
            $args[] = ['text' => trim(substr($s, $start, $i - $start)), 'start' => $baseOffset + $start, 'end' => $baseOffset + $i];
            $start = $i + 1;
        }
    }
    if ('' !== trim(substr($s, $start))) {
        $args[] = ['text' => trim(substr($s, $start)), 'start' => $baseOffset + $start, 'end' => $baseOffset + $n];
    }
    return $args;
}

/**
 * Depth/quote-aware split on the top-level '.' concatenation operator —
 * used to read a printf()/sprintf() format-string expression built from
 * plain string-literal concatenation ('a' . 'b' . 'c'), the WPCS multi-line
 * pattern used throughout this codebase's render.php files.
 */
function split_dot_concat(string $expr): array {
    $parts = [];
    $depth = 0;
    $inStr = null;
    $start = 0;
    $n = strlen($expr);
    for ($i = 0; $i < $n; $i++) {
        $ch = $expr[$i];
        if (null !== $inStr) {
            if ('\\' === $ch) {
                $i++;
                continue;
            }
            if ($ch === $inStr) {
                $inStr = null;
            }
            continue;
        }
        if ("'" === $ch || '"' === $ch) {
            $inStr = $ch;
            continue;
        }
        if ('(' === $ch || '[' === $ch) {
            $depth++;
            continue;
        }
        if (')' === $ch || ']' === $ch) {
            $depth--;
            continue;
        }
        if ('.' === $ch && 0 === $depth) {
            $parts[] = trim(substr($expr, $start, $i - $start));
            $start = $i + 1;
        }
    }
    $parts[] = trim(substr($expr, $start));
    return $parts;
}

/**
 * Resolve a printf() format-string ARGUMENT EXPRESSION to its literal text,
 * ONLY when it is built entirely from plain string-literal concatenation
 * ('a' . 'b' . 'c'). Returns null for anything else (a variable, a
 * translation-wrapped string, a function call) — deliberately conservative;
 * a wrong literal would misplace every downstream placeholder lookup.
 */
function resolve_literal_string_concat(string $expr): ?string {
    $out = '';
    foreach (split_dot_concat($expr) as $part) {
        if (preg_match('/^\'((?:[^\'\\\\]|\\\\.)*)\'$/s', $part, $m)) {
            $out .= str_replace(["\\'", '\\\\'], ["'", '\\'], $m[1]);
        } elseif (preg_match('/^"((?:[^"\\\\]|\\\\.)*)"$/s', $part, $m)) {
            $out .= str_replace(['\\"', '\\\\'], ['"', '\\'], $m[1]);
        } else {
            return null;
        }
    }
    return $out;
}

/**
 * Blind Spot #3 closure (printf/sprintf splits the HTML attribute name from
 * the escaped value across positional arguments). Given the FULL raw
 * statement text and the byte offset of an escaping-call match within it,
 * find the nearest enclosing printf()/sprintf() call, resolve its literal
 * format string, locate the value-argument's matching placeholder
 * (positional `%N$s` preferred, else the Nth plain `%s`/`%d` in source
 * order), and return the format-string text immediately preceding that
 * placeholder — the SAME shape classify_esc_attr_window() already parses
 * (e.g. `alt="%4$s"` -> `alt="`).
 */
function printf_placeholder_context(string $text, int $matchStart, int $matchEnd): ?string {
    if (!preg_match_all('/\b(?:printf|sprintf)\s*\(/', $text, $pm, PREG_OFFSET_CAPTURE)) {
        return null;
    }
    $best = null;
    foreach ($pm[0] as $m) {
        $openParenPos = $m[1] + strlen($m[0]) - 1;
        $depth = 0;
        $n = strlen($text);
        $closeParenPos = null;
        for ($i = $openParenPos; $i < $n; $i++) {
            if ('(' === $text[$i]) {
                $depth++;
            } elseif (')' === $text[$i]) {
                $depth--;
                if (0 === $depth) {
                    $closeParenPos = $i;
                    break;
                }
            }
        }
        if (null === $closeParenPos) {
            continue;
        }
        if ($matchStart > $openParenPos && $matchEnd <= $closeParenPos) {
            // The innermost (closest-opening) enclosing call wins.
            if (null === $best || $openParenPos > $best['open']) {
                $best = ['open' => $openParenPos, 'close' => $closeParenPos];
            }
        }
    }
    if (null === $best) {
        return null;
    }

    $argsText = substr($text, $best['open'] + 1, $best['close'] - $best['open'] - 1);
    $args = split_top_level_args($argsText, $best['open'] + 1);
    if (count($args) < 2) {
        return null;
    }

    $format = resolve_literal_string_concat($args[0]['text']);
    if (null === $format) {
        return null;
    }

    $valueIndex = null; // 1-based among value args (args[0] is the format string).
    for ($i = 1, $len = count($args); $i < $len; $i++) {
        if ($matchStart >= $args[$i]['start'] && $matchStart < $args[$i]['end']) {
            $valueIndex = $i;
            break;
        }
    }
    if (null === $valueIndex) {
        return null;
    }

    $placeholderPos = null;
    if (preg_match('/%' . $valueIndex . '\$[sd]/', $format, $pm2, PREG_OFFSET_CAPTURE)) {
        $placeholderPos = $pm2[0][1];
    } elseif (preg_match_all('/%(?!\d+\$)[sd]/', $format, $pm3, PREG_OFFSET_CAPTURE)) {
        if (isset($pm3[0][$valueIndex - 1])) {
            $placeholderPos = $pm3[0][$valueIndex - 1][1];
        }
    }
    if (null === $placeholderPos) {
        return null;
    }

    return substr($format, max(0, $placeholderPos - 80), min(80, $placeholderPos));
}

/**
 * D1 forward variable-tracking closure (2026-08-05). D1 already tracks
 * attribute -> variable (backwards, via $varToAttr, populated left-to-right
 * as the file is walked). The gap is the OTHER direction: variable -> the
 * later statement where it is actually read into an HTML attribute — e.g.
 * button's `$aria_label = ... esc_attr( $attributes['ariaLabel'] ) ...;`
 * followed ~880 lines later by
 * `' aria-label="' . esc_attr( $aria_label ) . '"'`. Scans every statement
 * in the file (order-agnostic — the use site can be above OR below the
 * assignment) for the variable landing inside an HTML-attribute-name
 * context, either literal HTML syntax (`aria-label="..."`) or a PHP
 * associative-array literal passed to a shared helper
 * (`'aria-label' => esc_attr( $var )`, the SGS_Container_Wrapper::render()
 * `extra_attrs` shape used by sgs/nav-menu).
 *
 * Returns the matched window (ending exactly where the variable token
 * begins, with any single intervening wrapper-escaping call stripped off
 * the tail) so classify_esc_attr_window() can parse it with the SAME regexes
 * it already applies to a same-statement "before" window — no separate rule
 * set to keep in sync.
 */
function forward_variable_context(string $varName, array $statements): ?string {
    $needle = '$' . $varName;
    $needleLen = strlen($needle);
    $wrapStrip = '/(?:esc_attr(?:_e|__)?|esc_html(?:_e|__)?|wp_kses(?:_post)?)\s*\(\s*$/i';

    foreach ($statements as $stmt) {
        $text = $stmt['text'];
        $offset = 0;
        while (false !== ($pos = strpos($text, $needle, $offset))) {
            $after = $pos + $needleLen;
            $offset = $pos + 1;
            // Require a whole-variable match — not a longer identifier
            // sharing this name as a prefix (e.g. $aria_label_extra).
            if ($after < strlen($text) && (ctype_alnum($text[$after]) || '_' === $text[$after])) {
                continue;
            }

            $window = substr($text, max(0, $pos - 100), min(100, $pos));
            $window = preg_replace($wrapStrip, '', $window);

            if (preg_match('/(aria-label|alt|title|placeholder)\s*=\s*[\'"]{0,2}\s*\.?\s*$/i', $window)
                || preg_match('/[\'"](aria-label|alt|title|placeholder)[\'"]\s*=>\s*$/i', $window)
                || preg_match('/style\s*=\s*[\'"]{0,2}\s*\.?\s*$/i', $window)
                || preg_match('/[\'"]style[\'"]\s*=>\s*$/i', $window)
            ) {
                return $window;
            }
        }
    }
    return null;
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
        $forwardContextCache = []; // varName => string|false (false = "looked, found nothing")

        foreach ($statements as $stmt) {
            $text = $stmt['text'];
            $line = $stmt['line'];

            // 1) Track assignments: $var = <expr containing $attributes[...]>
            $assign = match_assignment($text);
            $assignTargetVar = null;
            if ($assign !== null) {
                [$varName, $exprText] = $assign;
                $assignTargetVar = $varName;
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
            //
            // PREG_OFFSET_CAPTURE added 2026-08-05 — the printf/sprintf
            // placeholder resolution (Blind Spot #3) needs each match's byte
            // offset in $text to identify WHICH positional argument it is.
            if (preg_match_all(
                '/\b(esc_html_e|esc_html__|esc_html|esc_textarea|esc_url_raw|esc_url|esc_attr_e|esc_attr__|esc_attr|wp_kses_post|wp_kses)\s*\(\s*([^,()]+(?:\([^()]*\))?[^,()]*)/',
                $text,
                $calls,
                PREG_SET_ORDER | PREG_OFFSET_CAPTURE
            )) {
                foreach ($calls as $c) {
                    $func = $c[1][0];
                    $argRaw = trim($c[2][0]);
                    $matchStart = $c[0][1];
                    $matchEnd = $matchStart + strlen($c[0][0]);
                    $funcLower = strtolower($func);
                    $isEscAttrFamily = in_array($funcLower, ['esc_attr', 'esc_attr_e', 'esc_attr__'], true);

                    // Resolve argument to (key, sourceVar) pairs — sourceVar
                    // is null when the key came from a direct
                    // $attributes['key'] access (no variable indirection),
                    // otherwise the variable name that carried it.
                    $resolvedPairs = [];
                    $directKeys = extract_attr_keys($argRaw);
                    if (!empty($directKeys)) {
                        foreach ($directKeys as $k) {
                            $resolvedPairs[] = ['key' => $k, 'var' => null];
                        }
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
                        $seenKeys = [];
                        foreach (array_unique($mm[1]) as $vn) {
                            if (isset($varToAttr[$vn]) && !isset($seenKeys[$vn])) {
                                $seenKeys[$vn] = true;
                                $resolvedPairs[] = ['key' => $varToAttr[$vn], 'var' => $vn];
                            }
                        }
                    }

                    // Blind Spot #3 (printf/sprintf placeholder split) —
                    // computed once per match, independent of which key(s)
                    // resolved from it. Only meaningful for esc_attr-family
                    // calls (the only ones classify_esc_attr_window() reads).
                    $printfContext = $isEscAttrFamily
                        ? printf_placeholder_context($text, $matchStart, $matchEnd)
                        : null;

                    foreach ($resolvedPairs as $pair) {
                        $key = $pair['key'];
                        $sourceVar = $pair['var'];

                        // Forward variable->use-site tracking (D1 fix,
                        // 2026-08-05). Candidate variable is EITHER the one
                        // that carried the key INTO this call (when resolved
                        // via indirection, e.g. responsive-logo's $alt / nav-
                        // menu's $nav_label) OR — ONLY when this call's own
                        // argument was a DIRECT $attributes[key] access
                        // ($sourceVar === null) — this statement's assignment
                        // TARGET (button's shape: the call is on
                        // `$attributes['ariaLabel']` directly, but the
                        // ESCAPED RESULT is what `$aria_label` becomes, and
                        // THAT variable is what later lands in
                        // `aria-label="..."`).
                        //
                        // CONFIRMED LIVE BUG caught by the full-glob
                        // before/after diff (2026-08-05): using
                        // assignTargetVar for EVERY resolved pair in the
                        // statement — not just direct-resolution ones — cross-
                        // contaminated button's OWN `$label` row (the
                        // ternary's OTHER branch, a completely different
                        // attribute) with `$aria_label`'s forward context,
                        // wrongly turning button.label into a11y-metadata.
                        // Restricting to $sourceVar === null keeps the
                        // fallback scoped to the call that actually feeds the
                        // assignment's result, not every call syntactically
                        // inside the same statement.
                        $forwardContext = null;
                        if ($isEscAttrFamily) {
                            $candidateVars = null === $sourceVar
                                ? array_unique(array_filter([$assignTargetVar]))
                                : [$sourceVar];
                            foreach ($candidateVars as $candidateVar) {
                                if (!array_key_exists($candidateVar, $forwardContextCache)) {
                                    $forwardContextCache[$candidateVar] = forward_variable_context($candidateVar, $statements) ?? false;
                                }
                                if (false !== $forwardContextCache[$candidateVar]) {
                                    $forwardContext = $forwardContextCache[$candidateVar];
                                    break;
                                }
                            }
                        }

                        $category = classify_call($func, $text, $printfContext, $forwardContext);
                        $isDynamic = str_starts_with($key, '::DYNAMIC');

                        $row = [
                            'file' => $file,
                            'block_slug' => $blockSlugGuess,
                            'line' => $line,
                            'attr_key' => $key,
                            'func' => $func,
                            'category' => $category,
                            'statement' => mb_substr($text, 0, 220),
                            'dynamic' => $isDynamic,
                            'printf_context' => $printfContext,
                            'forward_context' => $forwardContext,
                        ];
                        echo json_encode($row) . "\n";
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
