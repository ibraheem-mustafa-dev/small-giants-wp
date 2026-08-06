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
 *   php detector1_render_escaping.php --self-test
 *
 * A finding in a SHARED include (includes/**) is attributed to every block
 * that BOTH declares the attribute name AND can reach that file — see
 * collect_block_attr_index() + collect_block_consumers(). Those extra rows
 * carry "shared_include": true; the original unattributed
 * ("block_slug": null) row is always still emitted alongside them.
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
function strip_statement_glue(string $stmt, ?bool &$strippedDeclaration = null): string {
    $strippedDeclaration = false;
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

        // Class-like declaration header: `[final|abstract|readonly]
        // class|interface|trait|enum Name [extends X] [implements Y] {`.
        //
        // Needed because the tokenizer only breaks on `;`, so a class header
        // and the first statement of its first method arrive glued together
        // as ONE logical statement. Without this, every shared class file
        // silently lost the FIRST `$var = $attributes['key']` binding inside
        // it (see the function-header note below for the measured case).
        if (preg_match('/^(?:(?:final|abstract|readonly)\s+)*(?:class|interface|trait|enum)\s+[A-Za-z_][A-Za-z0-9_]*\b[^{;]*\{\s*/i', $stmt, $m)) {
            $stmt = ltrim(substr($stmt, strlen($m[0])));
            $strippedDeclaration = true;
            $changed = true;
            continue;
        }

        // Function / method declaration header: `[modifiers] function name(
        // ...args... ) [: ReturnType] {`.
        //
        // MEASURED ROOT CAUSE (2026-08-06). `includes/forms/field-render-
        // helpers.php:157` is the first statement of `field_input_attrs()`:
        //     } function field_input_attrs( string $field_id, array $attributes ): string { $field_name = $attributes['fieldName'] ?? '';
        // arrives as a single logical statement. `match_assignment()` anchors
        // on `^\$name =`, so the function header made the assignment invisible
        // and `$field_name` was never tracked — which killed the whole
        // fieldName -> field_slug -> submission_name chain and left EIGHT form
        // blocks with no D1 verdict at all. The `}`/`{`/`if(...)` strippers
        // above already existed for exactly this glue class; the declaration
        // form was simply never covered.
        //
        // The argument list is walked with a paren-balancing scan rather than
        // a regex because a default value can itself contain parentheses
        // (`function f( $x = array( 1 ) )`). An abstract/interface method
        // (`function f();`) has no `{` and is deliberately left alone.
        if (preg_match('/^(?:(?:final|abstract|public|protected|private|static)\s+)*function\s*&?\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/i', $stmt, $m)) {
            $openParenPos = strlen($m[0]) - 1;
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
            // Optional return type — `: string`, `: ?Foo`, `: A|B`, `: \NS\C`.
            if ($rest !== '' && $rest[0] === ':' && preg_match('/^:\s*[?\\\\A-Za-z_][A-Za-z0-9_\\\\|&\s]*/', $rest, $rm)) {
                $rest = ltrim(substr($rest, strlen($rm[0])));
            }
            if ($rest !== '' && $rest[0] === '{') {
                $stmt = ltrim(substr($rest, 1));
                $strippedDeclaration = true;
                $changed = true;
                continue;
            }
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
function match_assignment(string $stmt, ?bool &$behindDeclaration = null): ?array {
    $stmt = strip_statement_glue($stmt, $behindDeclaration);
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
/**
 * Map every attribute NAME to the block slug(s) whose block.json declares it.
 *
 * This is what makes a finding in a SHARED include attributable. D1 walks
 * `includes/` already (collect_default_files()), but `infer_block_slug()` can
 * only name a block from a `src/blocks/<slug>/render.php` path, so every
 * finding in a shared helper came out with `block_slug: null` and was
 * unusable downstream — the FILE SCOPE was never the problem, the ATTRIBUTION
 * was. Detector 4 already searches the shared trees per-block for exactly
 * this reason (its own comment records that scoping a consumption search to a
 * block's own directory produced a wrong "dead attribute" finding for
 * `sgs/google-reviews.gap`).
 *
 * An attribute name declared by NO block maps to nothing and is therefore
 * never attributed — that is the negative control the --self-test asserts.
 */
function collect_block_attr_index(string $repoRoot): array {
    $index = [];
    foreach (glob($repoRoot . '/plugins/sgs-blocks/src/blocks/*/block.json') as $bj) {
        $json = json_decode((string) file_get_contents($bj), true);
        if (!is_array($json)) {
            continue;
        }
        $slug = isset($json['name']) && is_string($json['name']) && '' !== $json['name']
            ? $json['name']
            : 'sgs/' . basename(dirname(str_replace('\\', '/', $bj)));
        if (!isset($json['attributes']) || !is_array($json['attributes'])) {
            continue;
        }
        foreach (array_keys($json['attributes']) as $attr) {
            $index[(string) $attr][$slug] = true;
        }
    }
    foreach ($index as $attr => $slugs) {
        $slugs = array_keys($slugs);
        sort($slugs);
        $index[$attr] = $slugs;
    }
    ksort($index);
    return $index;
}

/**
 * Which block slugs can actually REACH a given shared include.
 *
 * Attributing by declared attribute NAME alone over-attributes whenever two
 * unrelated blocks happen to name an attribute the same way. Measured on the
 * first cut (2026-08-06): `includes/product-card-builtin-render.php` escapes
 * `imageAlt`, and `sgs/decorative-image` also declares an attribute called
 * `imageAlt` — but that block never touches the product-card helper. Handing
 * it a non-content verdict there would manufacture exactly the kind of veto
 * that licenses the `technical` role, from evidence about a different block.
 *
 * Reachability is established from the shared file's own SYMBOLS: the
 * functions and classes it defines. A block reaches the file when any PHP
 * under `src/blocks/<slug>/` names one of them (or names the file itself, for
 * a plain `require` of a file that defines nothing). This is the same shape
 * Detector 4 uses — search the shared trees per block — just inverted for
 * speed, and it is strictly NARROWER than name-only attribution, so it can
 * only reduce what gets attributed, never add.
 */
function collect_block_consumers(string $repoRoot, string $sharedFile): array {
    static $blockSources = null;
    static $cache = [];

    $key = str_replace('\\', '/', $sharedFile);
    if (isset($cache[$key])) {
        return $cache[$key];
    }

    if (null === $blockSources) {
        $blockSources = [];
        foreach (rglob_php($repoRoot . '/plugins/sgs-blocks/src/blocks') as $f) {
            if (!preg_match('#/src/blocks/([a-z0-9-]+)/#', str_replace('\\', '/', $f), $m)) {
                continue;
            }
            $slug = 'sgs/' . $m[1];
            $blockSources[$slug] = ($blockSources[$slug] ?? '') . "\n" . (string) file_get_contents($f);
        }
    }

    $code = (string) @file_get_contents($sharedFile);
    $symbols = [];
    if (preg_match_all('/(?:^|\s)function\s+&?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/m', $code, $m)) {
        $symbols = array_merge($symbols, $m[1]);
    }
    if (preg_match_all('/(?:^|\s)(?:class|interface|trait)\s+([A-Za-z_][A-Za-z0-9_]*)/m', $code, $m)) {
        $symbols = array_merge($symbols, $m[1]);
    }
    // A file that defines nothing is reached by name (`require ... /x.php`).
    $symbols[] = basename($key);
    $symbols = array_values(array_unique($symbols));

    $consumers = [];
    foreach ($blockSources as $slug => $src) {
        foreach ($symbols as $sym) {
            if (false !== strpos($src, $sym)) {
                $consumers[$slug] = true;
                break;
            }
        }
    }
    $consumers = array_keys($consumers);
    sort($consumers);
    $cache[$key] = $consumers;
    return $consumers;
}

function run(array $files, array $eligibleSet, array $attrIndex = [], string $repoRoot = ''): void {
    foreach ($files as $file) {
        if (!is_file($file)) {
            fwrite(STDERR, "WARN: file not found: $file\n");
            continue;
        }
        $code = file_get_contents($file);
        $statements = tokenize_to_statements($code);

        $varToAttr = []; // varName => attrKey (or ::DYNAMIC...:: marker)
        // WEAK TIER (2026-08-06). Bindings recovered from a statement that was
        // GLUED to a class/function declaration header — i.e. the first
        // statement of a function body, which `match_assignment()` could not
        // see at all until the declaration-header strip was added.
        //
        // They are kept in a SEPARATE map, consulted only when the strong map
        // yields nothing, because recovering them makes variables trackable
        // that were invisible when every existing verdict was measured, and
        // multi-hop provenance credits the FIRST tracked variable it finds.
        // Measured: `includes/product-card-builtin-render.php:106`
        //     $sgs_pcard_feat_badge = ( 'featured' === $sgs_pcard_variant ) ? $sgs_pcard_feat : '';
        // The newly-recovered `$sgs_pcard_variant` (bound at :47, the first
        // statement inside `sgs_product_card_builtin_render()`) is textually
        // first, so it displaced `$sgs_pcard_feat` and flipped two correct
        // `featuredTag` rows to `variantStyle`. A newly-recovered binding is
        // strictly NEW information; it must be able to ADD a verdict and never
        // to overturn one measured without it. Same discipline as the existing
        // "INHERITANCE NEVER OVERWRITES A DIRECT BINDING" rule below.
        $varToAttrWeak = [];
        $blockSlugGuess = infer_block_slug($file);
        $forwardContextCache = []; // varName => string|false (false = "looked, found nothing")

        foreach ($statements as $stmt) {
            $text = $stmt['text'];
            $line = $stmt['line'];

            // 1) Track assignments: $var = <expr containing $attributes[...]>
            $behindDeclaration = false;
            $assign = match_assignment($text, $behindDeclaration);
            $assignTargetVar = null;
            if ($assign !== null) {
                [$varName, $exprText] = $assign;
                $assignTargetVar = $varName;
                $keys = extract_attr_keys($exprText);
                if (!empty($keys)) {
                    // Take the first resolved key as the var's provenance.
                    if ($behindDeclaration) {
                        if (!isset($varToAttr[$varName])) {
                            $varToAttrWeak[$varName] = $keys[0];
                        }
                    } else {
                        $varToAttr[$varName] = $keys[0];
                    }
                } else {
                    // MULTI-HOP PROVENANCE (2026-08-05). Previously this branch
                    // matched ONLY a bare alias (`$var2 = $var1;`), anchored
                    // `^\$name$`, so any assignment that WRAPPED a tracked
                    // variable in an expression broke the chain and the
                    // attribute became invisible to D1 — silently, with no
                    // ::UNRESOLVED:: marker, exactly like the wp_kses_post
                    // allowlist gap.
                    //
                    // Three real rows measured NULL because of it, each a
                    // two-hop chain no single-hop tracker can follow:
                    //   sgs/icon.ariaLabel
                    //     $aria_label = $attributes['ariaLabel'] ?? '';        (hop 1)
                    //     $emoji_aria_label = '' !== $aria_label ? ... ;       (hop 2 — ternary)
                    //     esc_attr( $emoji_aria_label )  into aria-label="%s"
                    //   sgs/buybox.addToCartLabel
                    //     $add_to_cart_label_raw = $attributes['addToCartLabel'] ?? '';
                    //     $add_to_cart_label = '' !== sanitize_text_field( $add_to_cart_label_raw )
                    //                          ? sanitize_text_field( $add_to_cart_label_raw ) : __( ... );
                    //     esc_html( $add_to_cart_label )
                    //   sgs/whatsapp-cta.message
                    //     $encoded_message = $message ? rawurlencode( $message ) : '';
                    //
                    // The rule now mirrors what the ESCAPING-CALL resolver at
                    // step 2 already does (it credits EVERY variable in the
                    // argument, not just a leading one): an assignment whose
                    // expression names a tracked variable inherits that
                    // variable's provenance. First tracked variable wins, the
                    // same "first resolved key" convention used directly above.
                    //
                    // Bounded by construction: provenance only ever ADDS usage
                    // sites for an attribute. It cannot un-assign a row — the
                    // aggregator takes any content verdict over non-content
                    // ones (fingerprint_content_roles.py:311) — so the worst
                    // case is a spurious NOT-content verdict on a row that had
                    // no content verdict anyway, which turns "unreached" into
                    // "vetoed". Both leave role NULL, and vetoed is the
                    // VISIBLE state of the two.
                    //
                    // INHERITANCE NEVER OVERWRITES A DIRECT BINDING. Measured
                    // regression on the first cut of this change (2026-08-05):
                    // sgs/nav-menu.navLabel LOST its correct a11y-text
                    // assignment. `$nav_label` is bound directly at
                    // nav-menu/render.php:639
                    //     $nav_label = trim( (string) ( $attributes['navLabel'] ?? '' ) );
                    // then CONDITIONALLY reassigned at :653 from unrelated
                    // locals (`$stripped` / `$derived`) — a fallback branch that
                    // may never execute. Letting a weak inherited binding
                    // clobber a strong direct one traded a true positive for a
                    // false one. Direct `$attributes[...]` provenance is the
                    // strongest evidence available and is never displaced here;
                    // a straight-line tracker cannot know which branch ran, so
                    // it keeps the binding it can prove.
                    //
                    // TWO-TIER SCAN (2026-08-06): the strong map first, the
                    // weak (declaration-header-recovered) map only if the
                    // strong map yields nothing — see $varToAttrWeak above.
                    // The inherited binding takes on the tier of whichever
                    // source won, so weakness propagates down a chain and a
                    // newly-recovered binding can never displace a verdict
                    // measured before it existed.
                    if (!isset($varToAttr[$varName]) && !isset($varToAttrWeak[$varName])
                        && preg_match_all('/\$([A-Za-z_][A-Za-z0-9_]*)/', $exprText, $mm)) {
                        $sourceTiers = [];
                        foreach ($mm[1] as $srcVar) {
                            if ($srcVar !== $varName && isset($varToAttr[$srcVar])) {
                                $sourceTiers[] = $srcVar;
                            }
                        }
                        $weakOnly = empty($sourceTiers);
                        if ($weakOnly) {
                            foreach ($mm[1] as $srcVar) {
                                if ($srcVar !== $varName && isset($varToAttrWeak[$srcVar])) {
                                    $sourceTiers[] = $srcVar;
                                }
                            }
                        }
                        $mm[1] = $sourceTiers;
                        foreach ($mm[1] as $src) {
                            // Never let a variable inherit from itself
                            // (`$x = trim( $x );` is a no-op for provenance,
                            // and self-inheritance on an UNtracked var would
                            // read the entry this branch is about to write).
                            if ($src === $varName) {
                                continue;
                            }
                            $srcKey = $weakOnly ? ($varToAttrWeak[$src] ?? null) : ($varToAttr[$src] ?? null);
                            if (null !== $srcKey) {
                                // FRAGMENT vs WHOLE VALUE. Every content-bearing
                                // role is a WHOLE-VALUE contract: `link-href`
                                // extracts the nearest <a href> entire,
                                // `text-content` the element's entire rich text.
                                // An attribute CONCATENATED into a larger string
                                // is a fragment of that value, not the value, so
                                // it must never inherit a whole-value role.
                                //
                                // Measured live on the first cut of multi-hop
                                // (2026-08-05): sgs/whatsapp-cta.phoneNumber was
                                // assigned `link-href` off
                                //     whatsapp-cta/render.php:56
                                //     $wa_url = 'https://wa.me/' . $clean_phone;
                                //     ...  href="[php] echo esc_url( $wa_url ); [/php]"
                                //     (written [php] not the real tag: a literal
                                //     PHP close tag inside a // comment ENDS php
                                //     mode and truncates the file — this comment
                                //     did exactly that until it was caught by
                                //     `php -l`.)
                                // D1's observation is true — the digits do reach
                                // an href — but the role's own consumer
                                // (field_extractors.py:248-253) would write the
                                // WHOLE `https://wa.me/44...?text=...` back into
                                // an attribute render.php treats as bare digits
                                // and re-prefixes with `https://wa.me/`. A
                                // plausible role that corrupts the value on the
                                // next clone is worse than NULL.
                                //
                                // Transforms and branches are NOT fragments: a
                                // ternary (`$x = $cond ? $tracked : 'fallback';`)
                                // or a wrapping call (`preg_replace(...,$tracked)`)
                                // still yields the whole value. Only literal
                                // concatenation splits it, so that is what is
                                // detected — `'lit' . $var` or `$var . 'lit'`,
                                // including the `.=` append form.
                                $isFragment = (bool) preg_match(
                                    '/[\'"]\s*\.\s*\$|\$[A-Za-z_][A-Za-z0-9_]*\s*\.\s*[\'"]/',
                                    $exprText
                                ) || (bool) preg_match(
                                    '/^\$' . preg_quote($varName, '/') . '\s*\.=/',
                                    strip_statement_glue($text)
                                );
                                if ($isFragment) {
                                    // Recorded, not dropped. A dropped row is
                                    // indistinguishable from a row no detector
                                    // ever reached; this one WAS reached and
                                    // deliberately rejected, and that must stay
                                    // visible in the output.
                                    $srcKey = '::FRAGMENT::' . $srcKey;
                                }
                                if ($weakOnly) {
                                    $varToAttrWeak[$varName] = $srcKey;
                                } else {
                                    $varToAttr[$varName] = $srcKey;
                                }
                                break;
                            }
                        }
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
                            // Strong tier first; the weak (declaration-header-
                            // recovered) tier only for variables the strong
                            // tier has never heard of, so a weak binding can
                            // only ADD a row, never restate an existing one
                            // with a different key.
                            $vk = $varToAttr[$vn] ?? ($varToAttrWeak[$vn] ?? null);
                            if (null !== $vk && !isset($seenKeys[$vn])) {
                                $seenKeys[$vn] = true;
                                $resolvedPairs[] = ['key' => $vk, 'var' => $vn];
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

                        // Unwrap the fragment marker written by the multi-hop
                        // provenance branch. The KEY must be the real attribute
                        // name (a marker-prefixed key would match nothing in the
                        // eligible pool, so the row would silently disappear —
                        // the opposite of the visibility this records). The
                        // fragment fact travels as its own field instead.
                        $isFragmentKey = false;
                        if (strpos($key, '::FRAGMENT::') === 0) {
                            $isFragmentKey = true;
                            $key = substr($key, strlen('::FRAGMENT::'));
                        }

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
                            // True when this attribute reached the escaping call
                            // only as a CONCATENATED PIECE of a larger value
                            // (see the fragment note in the provenance branch).
                            // The Python stage turns this into an explicit
                            // 'value-fragment' verdict so the row is reported,
                            // not silently dropped.
                            'fragment' => $isFragmentKey,
                        ];
                        echo json_encode($row) . "\n";

                        // SHARED-INCLUDE ATTRIBUTION (2026-08-06).
                        //
                        // The row above is emitted UNCHANGED — including its
                        // `block_slug: null` — so nothing that already
                        // consumed this output can shift. What follows are
                        // ADDITIONAL rows: one per block whose block.json
                        // declares this attribute name, so a finding made in
                        // a helper shared by N blocks reaches all N.
                        //
                        // Eight form blocks needed this. `fieldName` becomes
                        // the form's POST key inside the SHARED helper
                        // `includes/forms/field-render-helpers.php` (the
                        // `name="sgs-field-{slug}"` at :174), never inside any
                        // one block's render.php, so no single block could be
                        // named as its owner and the verdict was discarded.
                        //
                        // Same shape Detector 4 already uses (it searches the
                        // shared trees per-block because scoping a
                        // consumption search to a block's own directory
                        // produced a wrong "dead attribute" finding for
                        // `sgs/google-reviews.gap`).
                        //
                        // A DYNAMIC key (`$prefix . 'ImageAlt'`) is never a
                        // real attribute name, so it can never match the
                        // index and is skipped explicitly rather than left to
                        // fail the lookup by luck.
                        //
                        // Two conditions, both required: the block must
                        // DECLARE the attribute AND be able to REACH this
                        // file (see collect_block_consumers()).
                        if (null === $blockSlugGuess && !$isDynamic && isset($attrIndex[$key])) {
                            $reachable = '' !== $repoRoot
                                ? collect_block_consumers($repoRoot, $file)
                                : [];
                            $owners = array_values(array_intersect($attrIndex[$key], $reachable));
                            foreach ($owners as $ownerSlug) {
                                $shared = $row;
                                $shared['block_slug'] = $ownerSlug;
                                // Marks the row as attributed-by-declaration
                                // rather than observed in the block's own
                                // render.php, so a consumer can tell the two
                                // apart. Present ONLY on these added rows.
                                $shared['shared_include'] = true;
                                echo json_encode($shared) . "\n";
                            }
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

/**
 * Capture `run()`'s NDJSON output as decoded rows.
 */
function d1_collect(array $files, array $attrIndex, string $repoRoot): array {
    ob_start();
    run($files, [], $attrIndex, $repoRoot);
    $out = (string) ob_get_clean();

    $rows = [];
    foreach (explode("\n", $out) as $line) {
        $line = trim($line);
        if ('' === $line) {
            continue;
        }
        $row = json_decode($line, true);
        if (is_array($row)) {
            $rows[] = $row;
        }
    }
    return $rows;
}

/**
 * `--self-test` — proves the shared-include attribution can FAIL.
 *
 * Five checks, each with an explicit vacuity guard (a check that cannot fail
 * when the thing it measures is absent reads green forever):
 *
 *   1  index is non-empty and `fieldName` resolves to the seven form-field
 *      blocks that consume it through the shared helper;
 *   2  NEGATIVE CONTROL — an attribute name declared by NO block is absent
 *      from the index, and a synthetic shared-include file that escapes it
 *      yields EXACTLY ONE row, `block_slug: null`, with zero attributed rows.
 *      This is the check that fails if the attribution rule is ever loosened
 *      to "attribute to every block" or to a fuzzy name match;
 *   3  positive control on the REAL helper — `fieldName` reaches
 *      `sgs/form-field-text` with `shared_include: true`;
 *   4  glue control — an assignment behind a function-declaration header is
 *      matched by match_assignment() (the root cause that hid `fieldName`);
 *   5  block-scoped rows are NEVER given a `shared_include` marker, so a
 *      consumer can trust the two row kinds apart.
 */
function d1_self_test(string $repoRoot): int {
    $failures = [];
    $index = collect_block_attr_index($repoRoot);

    // --- 1. index sanity + fieldName ownership -------------------------------
    if (count($index) < 50) {
        $failures[] = 'CHECK 1: attribute index looks empty/degenerate (' . count($index) . ' names) — every check below would be vacuous.';
    }
    $expectedFieldNameOwners = [
        'sgs/form-field-date',
        'sgs/form-field-email',
        'sgs/form-field-number',
        'sgs/form-field-phone',
        'sgs/form-field-select',
        'sgs/form-field-text',
        'sgs/form-field-textarea',
    ];
    $actualOwners = $index['fieldName'] ?? [];
    foreach ($expectedFieldNameOwners as $slug) {
        if (!in_array($slug, $actualOwners, true)) {
            $failures[] = "CHECK 1: fieldName index is missing $slug (got: " . implode(',', $actualOwners) . ')';
        }
    }

    // --- 2. NEGATIVE CONTROL -------------------------------------------------
    $ghostAttr = 'zzzAttributeDeclaredByNoBlockWhatsoever';
    if (isset($index[$ghostAttr])) {
        $failures[] = "CHECK 2: negative control is void — '$ghostAttr' is actually declared by a block.";
    }
    // The fixture deliberately defines `field_input_attrs` — the SAME symbol
    // the real shared helper defines — so the seven form-field blocks DO
    // reach it and the reachability constraint is satisfied. Without that,
    // the reachability check alone would reject the fixture and this negative
    // control would pass for the wrong reason: measured 2026-08-06, a fixture
    // defining a symbol nothing references stayed green even with the
    // declared-attribute lookup deliberately removed. A control shielded by a
    // second gate is not a control.
    $tmp = rtrim(sys_get_temp_dir(), "/\\") . '/d1_selftest_shared_include.php';
    file_put_contents($tmp, "<?php\nfunction field_input_attrs( array \$attributes ): string {\n\t\$ghost = \$attributes['$ghostAttr'] ?? '';\n\treturn 'x=\"' . esc_attr( \$ghost ) . '\"';\n}\n");
    $ghostReach = collect_block_consumers($repoRoot, $tmp);
    $ghostRows = d1_collect([$tmp], $index, $repoRoot);
    @unlink($tmp);

    // Vacuity guard 1: if the fixture produced NO rows at all, "zero
    // attributed rows" would be trivially true and would prove nothing.
    if (count($ghostRows) === 0) {
        $failures[] = 'CHECK 2: fixture yielded no rows at all — the negative control is vacuous (is the function-header glue strip still in place?).';
    }
    // Vacuity guard 2: if no block can reach the fixture, reachability alone
    // rejects it and the DECLARED-ATTRIBUTE rule is never exercised.
    if (!in_array('sgs/form-field-text', $ghostReach, true)) {
        $failures[] = 'CHECK 2: no block reaches the fixture — reachability would reject it regardless, so the declared-attribute rule is untested here.';
    }
    foreach ($ghostRows as $r) {
        if (null !== $r['block_slug']) {
            $failures[] = 'CHECK 2: undeclared attribute was attributed to ' . $r['block_slug'] . ' — negative control BROKEN.';
        }
        if (!empty($r['shared_include'])) {
            $failures[] = 'CHECK 2: undeclared attribute produced a shared_include row — negative control BROKEN.';
        }
    }

    // --- 3. positive control on the real shared helper ------------------------
    $helper = $repoRoot . '/plugins/sgs-blocks/includes/forms/field-render-helpers.php';
    if (!is_file($helper)) {
        $failures[] = "CHECK 3: shared helper not found at $helper";
    } else {
        $helperRows = d1_collect([$helper], $index, $repoRoot);
        $sawNullFieldName = false;
        $sawAttributed = [];
        foreach ($helperRows as $r) {
            if ('fieldName' !== $r['attr_key']) {
                continue;
            }
            if (null === $r['block_slug']) {
                $sawNullFieldName = true;
            } elseif (!empty($r['shared_include'])) {
                $sawAttributed[$r['block_slug']] = true;
            }
        }
        if (!$sawNullFieldName) {
            $failures[] = 'CHECK 3: the original unattributed fieldName row is gone — the added rows must be ADDITIVE, never replacements.';
        }
        foreach ($expectedFieldNameOwners as $slug) {
            if (!isset($sawAttributed[$slug])) {
                $failures[] = "CHECK 3: fieldName never reached $slug from the shared helper.";
            }
        }
    }

    // --- 4. glue control -----------------------------------------------------
    $glued = "} function field_input_attrs( string \$field_id, array \$attributes ): string { \$field_name = \$attributes['fieldName'] ?? '';";
    $assign = match_assignment($glued);
    if (null === $assign || 'field_name' !== $assign[0]) {
        $failures[] = 'CHECK 4: an assignment behind a function-declaration header is still invisible to match_assignment() — this is the exact root cause that hid fieldName.';
    } elseif ([] === extract_attr_keys($assign[1])) {
        $failures[] = 'CHECK 4: the assignment matched but its $attributes[...] key did not resolve.';
    }

    // --- 5. block-scoped rows carry no shared_include marker -----------------
    $blockRender = $repoRoot . '/plugins/sgs-blocks/src/blocks/form-field-consent/render.php';
    if (!is_file($blockRender)) {
        $failures[] = "CHECK 5: block render not found at $blockRender";
    } else {
        $blockRows = d1_collect([$blockRender], $index, $repoRoot);
        if (count($blockRows) === 0) {
            $failures[] = 'CHECK 5: block render yielded no rows — check is vacuous.';
        }
        foreach ($blockRows as $r) {
            if (!empty($r['shared_include'])) {
                $failures[] = 'CHECK 5: a block-scoped row was marked shared_include (' . $r['attr_key'] . ').';
            }
            if (null === $r['block_slug']) {
                $failures[] = 'CHECK 5: a src/blocks/*/render.php row lost its block_slug (' . $r['attr_key'] . ').';
            }
        }
    }

    // --- 6. SECOND NEGATIVE CONTROL: name collision without reachability -----
    //
    // `includes/product-card-builtin-render.php` escapes `imageAlt`, and
    // `sgs/decorative-image` ALSO declares an attribute called `imageAlt` —
    // but never calls that helper. Declaring the name must not be enough.
    $pcHelper = $repoRoot . '/plugins/sgs-blocks/includes/product-card-builtin-render.php';
    if (!is_file($pcHelper)) {
        $failures[] = "CHECK 6: helper not found at $pcHelper";
    } elseif (!in_array('sgs/decorative-image', $index['imageAlt'] ?? [], true)) {
        // Vacuity guard: with no collision there is nothing to reject.
        $failures[] = 'CHECK 6: sgs/decorative-image no longer declares imageAlt — the collision this check rejects is gone, pick a live one.';
    } else {
        $pcRows = d1_collect([$pcHelper], $index, $repoRoot);
        if (count($pcRows) === 0) {
            $failures[] = 'CHECK 6: helper yielded no rows — check is vacuous.';
        }
        $sawReachable = false;
        foreach ($pcRows as $r) {
            if ('sgs/decorative-image' === $r['block_slug']) {
                $failures[] = 'CHECK 6: imageAlt was attributed to sgs/decorative-image, which cannot reach this helper — reachability constraint BROKEN.';
            }
            if ('sgs/product-card' === $r['block_slug']) {
                $sawReachable = true;
            }
        }
        if (!$sawReachable) {
            $failures[] = 'CHECK 6: the helper never attributed anything to sgs/product-card, which DOES call it — reachability is over-tight.';
        }
    }

    if ([] !== $failures) {
        foreach ($failures as $f) {
            fwrite(STDERR, "FAIL: $f\n");
        }
        fwrite(STDERR, 'SELF-TEST: ' . count($failures) . " failure(s).\n");
        return 1;
    }
    fwrite(STDERR, "SELF-TEST: PASS (6 checks, 2 negative controls included).\n");
    return 0;
}

// --- entry point ---
//
// GUARDED SO THIS FILE CAN BE `require`d (2026-08-06). Detector 7 reuses
// `tokenize_to_statements()` / `match_assignment()` / `extract_attr_keys()` from here
// rather than re-implementing PHP statement splitting in Python — this file's own
// sibling (detector4) records why that matters: "Reimplementing it here, badly, under
// time pressure, is how a confident wrong classifier gets shipped."
//
// Without the guard, `require`ing this file would run the WHOLE 84-block scan as a side
// effect of importing one function. The guard changes NOTHING about CLI behaviour:
// verified by diffing the full `--glob` output before and after (515 lines, md5
// 4470199B3328377E39829BE4FDDAEE57, byte-identical). That 515/md5 pair is the
// HISTORICAL baseline for the guard change, not the current output: shared-
// include attribution (2026-08-06) took `--glob` to 1061 lines as a strict
// SUPERSET — all 515 baseline lines still present, verbatim and in order, with
// 546 added.
if (PHP_SAPI === 'cli' && isset($argv[0]) && realpath($argv[0]) === realpath(__FILE__)) {
    $args = array_slice($argv, 1);
    $repoRoot = 'c:/Users/Bean/Projects/small-giants-wp';

    if (!empty($args) && $args[0] === '--self-test') {
        exit(d1_self_test($repoRoot));
    }

    if (empty($args) || $args[0] === '--glob') {
        $files = collect_default_files($repoRoot);
    } else {
        $files = $args;
    }

    run($files, [], collect_block_attr_index($repoRoot), $repoRoot);
}
