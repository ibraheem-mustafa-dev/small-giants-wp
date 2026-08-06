<?php
/**
 * Detector 7 — CSS PAINT FLOW (forward variable tracking to a paint site).
 *
 * THE QUESTION THIS ANSWERS, and why it needed a new detector.
 *
 * Detector 1 tracks a value forward to an ESCAPED HTML OUTPUT site, which is how it
 * decides "content". Detector 4 asks whether an attribute is READ at all, and can only
 * conclude "styling" when the single consumer is the shared container wrapper. Neither
 * answers the question that leaves rows stranded in D4's needs-review bucket:
 *
 *     does this value, read into a variable here, end up PAINTING something later?
 *
 * D4's own comment names this gap exactly: "following that assignment to its paint site
 * is variable-flow analysis -- exactly what Detector 1 does for output escaping.
 * Reimplementing it here, badly, under time pressure, is how a confident wrong classifier
 * gets shipped." So this file does NOT re-implement statement splitting. It `require`s
 * detector1_render_escaping.php and reuses its tokenizer (`tokenize_to_statements`,
 * `match_assignment`, `extract_attr_keys`), which is already proven against the whole
 * 84-block tree. That file gained a CLI guard on 2026-08-06 purely to make this possible;
 * its own output was verified byte-identical before and after.
 *
 * TWO PAINT SHAPES, both derived by reading the real code, neither guessed from a name:
 *
 *   CSS_VALUE — the carrier reaches a CSS declaration, a custom property, or one of the
 *               shared CSS helpers. Grounding case: sgs/separator.gradientColourStart
 *               `$gradient_start = $attributes['gradientColourStart'] ?? '';` (render.php:84)
 *               landing at `sgs_colour_value( $gradient_start )` (render.php:146).
 *
 *   CSS_CLASS — the carrier is concatenated into a class list. A BEM modifier IS a paint
 *               instruction: the value selects which stylesheet rule applies. Grounding
 *               case: sgs/timeline.orientation `$orientation = $attributes['orientation']`
 *               (render.php:63) landing at
 *               `$wrapper_classes[] = 'sgs-timeline--' . $orientation;` (render.php:339).
 *
 * POSITIVE-ONLY BY CONSTRUCTION. A row with no proven landing produces NO verdict, ever.
 * Silence here means "this detector could not prove it", which is the honest output; the
 * row stays NULL and visible. Emitting a guess would defeat the entire point of the role
 * vocabulary, whose value is that `technical` and `styling` mean something was MEASURED.
 *
 * BLIND SPOTS, stated rather than discovered later:
 *  1. Single-file. It follows carriers within one render.php and does not cross into a
 *     helper's body, so a value passed to a shared function that paints internally is not
 *     seen (D4's wrapper rule covers the dominant instance of that).
 *  2. Bounded transitivity (MAX_HOPS). A carrier chained through more reassignments than
 *     that is dropped rather than followed with decreasing confidence.
 *  3. It reads CONTEXT, never the attribute's spelling. It cannot tell a class-selecting
 *     enum from a class-selecting free string, and does not try to -- both paint.
 *  4. It does not prove the CSS it lands in is ever loaded. "Paints" here means "reaches a
 *     paint site in source", not "was observed on a rendered page".
 */

require_once __DIR__ . '/detector1_render_escaping.php';

const MAX_HOPS = 3;

/**
 * Shared helpers that exist to build CSS. Membership is a property of the SUBSYSTEM,
 * established by reading them, not inferred from the names -- the same standard
 * detector4 applies to `includes/forms/`.
 */
/**
 * Helpers that exist SPECIFICALLY to resolve a colour. A carrier reaching one of these is
 * not merely "styling" — it is a colour value, which is the `color` role's own contract
 * ("an attr whose value is a colour"), and that role has a live consumer
 * (attr_is_colour_role(), converter/db/db_lookup.py). Kept separate from CSS_HELPERS so
 * the detector emits the SPECIFIC role rather than the coarsest one that fits.
 */
const COLOUR_HELPERS = array(
    'sgs_colour_value',
);

const CSS_HELPERS = array(
    'sgs_colour_value',
    'sgs_shadow_value',
    'sgs_css_length',
    'sgs_serialise_box_sides',
    'sgs_serialise_box_corners',
    'sgs_typography_css_rule',
    'sgs_button_element_style_css',
    'sgs_sanitize_grid_template',
    'wp_style_engine_get_styles',
    'safecss_filter_attr',
);

/**
 * A custom property (`--x:`) or a CSS function call. PRECISE SIGNALS ONLY.
 *
 * ⚠ A generic "declaration shape" regex was here in the first draft — any quoted string
 * containing `word:`. Its own negative control killed it: `sgs/post-grid.orderBy`, a
 * WP_Query key that paints nothing, was claimed CSS_VALUE at line 353, because that
 * pattern matches URLs, PHP array text, ternaries and prose alike. Detecting "looks a bit
 * like CSS" is not evidence, and a detector that over-claims is worse than one that stays
 * quiet — every verdict it gives becomes unusable.
 *
 * Recognising an arbitrary CSS property name WOULD need the `property_suffixes` table
 * (R-31-1 forbids a hardcoded property dict). That is a real extension, deliberately not
 * bodged in here: the two signals below plus the helper list already cover every row this
 * detector currently resolves, and a narrower detector that is RIGHT beats a wider one
 * that has to be second-guessed.
 */
function looks_like_css_text(string $s): bool {
    if (preg_match('/--[a-z0-9-]+\s*:/i', $s)) {
        return true;
    }
    return (bool) preg_match('/\b(linear-gradient|radial-gradient|calc|clamp)\s*\(/i', $s);
}

/**
 * The carrier's value is concatenated onto a BEM `--modifier` prefix.
 *
 * NARROWED 2026-08-06 from "appears in any class context" to "IS the modifier suffix".
 * The wider form matched a value merely mentioned near a class list, which is not the
 * same claim and cannot support the specific role below.
 *
 * This shape maps to `enum-class-probe`, NOT to generic `styling`: that role's own
 * definition is "a BEM `--modifier` class carries this attr's value ... never as a CSS
 * declaration", and it has a live cloning consumer (db_lookup.py:4889-4896) that matches
 * the modifier against the draft's actual BEM class. Seeding `styling` here would be
 * measuring the right thing and then filing it under the coarsest role available, losing
 * that consumer.
 */
function is_bem_modifier_sink(string $s, string $var): bool {
    $v = preg_quote(ltrim($var, '$'), '/');
    // 'sgs-timeline--' . $orientation   /   "sgs-x--" . $var
    return (bool) preg_match('/[\'"][A-Za-z0-9_-]*--[\'"]\s*\.\s*\$' . $v . '\b/', $s);
}

function calls_colour_helper(string $s, string $var): bool {
    foreach (COLOUR_HELPERS as $fn) {
        if (preg_match('/\b' . preg_quote($fn, '/') . '\s*\([^)]*\$' . preg_quote(ltrim($var, '$'), '/') . '\b/i', $s)) {
            return true;
        }
    }
    return false;
}

function calls_css_helper(string $s, string $var): bool {
    foreach (CSS_HELPERS as $fn) {
        if (preg_match('/\b' . preg_quote($fn, '/') . '\s*\([^)]*\$' . preg_quote(ltrim($var, '$'), '/') . '\b/i', $s)) {
            return true;
        }
    }
    return false;
}

/**
 * Collect the variables that carry $attributes['attr'], transitively, up to MAX_HOPS.
 * Returns [varName => true].
 */
function carriers_for(array $statements, string $attr): array {
    $carriers = array();
    for ($hop = 0; $hop <= MAX_HOPS; $hop++) {
        $grew = false;
        foreach ($statements as $st) {
            $text = is_array($st) ? ($st['text'] ?? '') : (string) $st;
            $assign = match_assignment($text);
            if (!$assign) {
                continue;
            }
            // match_assignment() returns a POSITIONAL [varName, expr] pair, not a keyed
            // array. Read it from the function, not from memory: the first draft of this
            // file assumed ['var'] / ['expr'], which silently produced NULL for every row
            // and made the detector claim nothing at all — a shape mismatch reads exactly
            // like "the world is empty".
            $lhs = ltrim((string) ($assign[0] ?? ''), '$');
            if ($lhs === '' || isset($carriers[$lhs])) {
                continue;
            }
            $rhs = (string) ($assign[1] ?? $text);

            // Hop 0: the direct read of $attributes['attr'].
            if ($hop === 0) {
                $keys = extract_attr_keys($rhs);
                if (in_array($attr, $keys, true)) {
                    $carriers[$lhs] = true;
                    $grew = true;
                }
                continue;
            }
            // Later hops: IDENTITY MUST SURVIVE THE HOP.
            //
            // Naive "RHS mentions a carrier" propagation was measured wrong on 2026-08-06
            // and produced six verdicts that contradicted the hand investigation. Example:
            // option-picker.defaultSelected chained
            //   default_selected -> sanitised_default -> resolved_default -> is_checked
            //   -> checked_str
            // and then "landed in a class". But `is_checked` is a BOOLEAN COMPARING the
            // default against the current option — it is no longer the attribute's value,
            // so where it lands says nothing about the attribute. Transitive tracking that
            // ignores identity launders a derived value back into evidence about its source.
            //
            // Two structural guards, no name-matching:
            //  (a) COMBINATION DILUTES. If the RHS mentions more than one distinct
            //      variable, the result is a combination of several values and no single
            //      one owns it. `$has_gradient = $gradient_enabled && '' !== $gradient_start
            //      && '' !== $gradient_end;` must not make has_gradient a carrier.
            //  (b) A PREDICATE IS NOT ITS SUBJECT. A comparison yields a boolean ABOUT the
            //      value, not the value.
            $vars = array();
            if (preg_match_all('/\$([A-Za-z_][A-Za-z0-9_]*)\b/', $rhs, $vm)) {
                $vars = array_values(array_unique($vm[1]));
            }
            if (count($vars) !== 1) {
                continue;
            }
            if (preg_match('/(===|!==|==|!=|<=|>=|<|>)/', $rhs)) {
                continue;
            }
            if (isset($carriers[$vars[0]])) {
                $carriers[$lhs] = true;
                $grew = true;
            }
        }
        if (!$grew && $hop > 0) {
            break;
        }
    }
    return $carriers;
}

/**
 * Locate the paint site and name the SPECIFIC role it implies.
 *
 * EACH SHAPE RESOLVES TO ITS OWN ROLE (2026-08-06, Bean). The first cut of this detector
 * emitted `styling` for everything it found. That was measuring the right thing and then
 * filing it under the coarsest role that fits — which throws away the consumer that makes
 * the specific role worth having (the BEM-modifier probe for `enum-class-probe`,
 * attr_is_colour_role() for `color`). Generic `styling` is the FALLBACK, not the answer.
 *
 * @return array{shape:string,role:string,line:int}|null
 */
function find_paint_site(array $statements, array $carriers): ?array {
    foreach ($statements as $st) {
        $text = is_array($st) ? ($st['text'] ?? '') : (string) $st;
        $line = is_array($st) ? (int) ($st['line'] ?? 0) : 0;
        foreach (array_keys($carriers) as $var) {
            if (!preg_match('/\$' . preg_quote($var, '/') . '\b/', $text)) {
                continue;
            }
            // Skip the assignment that CREATED this carrier -- a read is not a paint.
            $assign = match_assignment($text);
            $isOwnAssign = $assign && ltrim((string) ($assign[0] ?? ''), '$') === $var;

            // A BEM modifier sink is checked FIRST and is exempt from the own-assignment
            // skip: `$slot_class = 'sgs-site-header-row--' . $row_slot;` is BOTH an
            // assignment and the paint instruction, so skipping it would lose the row.
            if (is_bem_modifier_sink($text, $var)) {
                return array('shape' => 'BEM_MODIFIER', 'role' => 'enum-class-probe', 'line' => $line);
            }
            if (calls_colour_helper($text, $var)) {
                return array('shape' => 'CSS_COLOUR', 'role' => 'color', 'line' => $line);
            }
            if ($isOwnAssign && !looks_like_css_text($text) && !calls_css_helper($text, $var)) {
                continue;
            }
            if (calls_css_helper($text, $var) || looks_like_css_text($text)) {
                return array('shape' => 'CSS_VALUE', 'role' => 'styling', 'line' => $line);
            }
        }
    }
    return null;
}

function render_file_for(string $blockSlug): ?string {
    $slug = substr($blockSlug, strpos($blockSlug, '/') === false ? 0 : strpos($blockSlug, '/') + 1);
    $path = dirname(__DIR__, 2) . '/src/blocks/' . $slug . '/render.php';
    return is_file($path) ? $path : null;
}

/**
 * @param array<int,array{0:string,1:string}> $candidates
 * @return array<int,array<string,mixed>>
 */
function detect_css_paint(array $candidates): array {
    $out = array();
    foreach ($candidates as $cand) {
        list($slug, $attr) = $cand;
        $file = render_file_for($slug);
        if ($file === null) {
            continue;
        }
        $statements = tokenize_to_statements((string) file_get_contents($file));
        $carriers = carriers_for($statements, $attr);
        if (!$carriers) {
            continue;
        }
        $paint = find_paint_site($statements, $carriers);
        if ($paint === null) {
            continue;
        }
        $out[] = array(
            'block_slug'    => $slug,
            'attr_name'     => $attr,
            'role'          => $paint['role'],
            'mechanism'     => 'css-paint-flow',
            'shape'         => $paint['shape'],
            'carriers'      => array_keys($carriers),
            'evidence_file' => 'plugins/sgs-blocks/src/blocks/'
                . substr($slug, strpos($slug, '/') + 1) . '/render.php',
            'evidence_line' => $paint['line'],
        );
    }
    return $out;
}

// ---------------------------------------------------------------------------
function self_test(): int {
    $failures = array();

    // 1. POSITIVE — CSS_COLOUR -> role `color`. Real row: separator.gradientColourStart
    //    is read at render.php:84 and reaches sgs_colour_value() at :145.
    //    The ROLE is asserted, not just the shape: emitting the right shape under the
    //    wrong role is the exact defect this pass fixed.
    $r = detect_css_paint(array(array('sgs/separator', 'gradientColourStart')));
    if (count($r) !== 1 || $r[0]['shape'] !== 'CSS_COLOUR' || $r[0]['role'] !== 'color') {
        $failures[] = 'separator.gradientColourStart did not resolve to CSS_COLOUR/color (got '
            . (count($r) ? $r[0]['shape'] . '/' . $r[0]['role'] : 'NOTHING') . '). This is a '
            . 'grounding case; a miss means the flow tracking is broken, not that the world is empty.';
    }

    // 2. POSITIVE — BEM_MODIFIER -> role `enum-class-probe`. Real row: timeline.orientation
    //    reaches `$wrapper_classes[] = 'sgs-timeline--' . $orientation` at render.php:339.
    $r = detect_css_paint(array(array('sgs/timeline', 'orientation')));
    if (count($r) !== 1 || $r[0]['shape'] !== 'BEM_MODIFIER' || $r[0]['role'] !== 'enum-class-probe') {
        $failures[] = 'timeline.orientation did not resolve to BEM_MODIFIER/enum-class-probe (got '
            . (count($r) ? $r[0]['shape'] . '/' . $r[0]['role'] : 'NOTHING') . ').';
    }

    // 2b. POSITIVE — the modifier sink that is ALSO its own assignment.
    //     `$slot_class = 'sgs-site-header-row--' . $row_slot;` (render.php:59) would be
    //     skipped by the own-assignment guard if the modifier check did not run first.
    $r = detect_css_paint(array(array('sgs/site-header-row', 'rowSlot')));
    if (count($r) !== 1 || $r[0]['role'] !== 'enum-class-probe') {
        $failures[] = 'site-header-row.rowSlot did not resolve to enum-class-probe (got '
            . (count($r) ? $r[0]['role'] : 'NOTHING') . ') — the own-assignment guard is '
            . 'swallowing a sink that is itself an assignment.';
    }

    // 3. NEGATIVE CONTROL — a real attribute that must NOT be claimed. post-grid.orderBy
    //    is sanitize_key()'d into a WP_Query arg; it paints nothing. If this is claimed,
    //    the detector is matching ambient CSS-ish text anywhere in the file rather than
    //    the carrier's own landing site, and every verdict it gives is worthless.
    $r = detect_css_paint(array(array('sgs/post-grid', 'orderBy')));
    if (count($r) !== 0) {
        $failures[] = 'post-grid.orderBy WAS claimed (' . $r[0]['shape'] . ' at line '
            . $r[0]['evidence_line'] . '). It is a WP_Query key and paints nothing — the '
            . 'detector is over-claiming.';
    }

    // 4. A fabricated attribute must resolve to nothing, or checks 1-2 prove nothing.
    $r = detect_css_paint(array(array('sgs/separator', 'zzzNotARealAttribute')));
    if (count($r) !== 0) {
        $failures[] = 'a fabricated attribute name produced a verdict — the carrier search '
            . 'is matching something it should not.';
    }

    // 5. A block with no render.php must be skipped, not crash.
    $r = detect_css_paint(array(array('sgs/zzz-no-such-block', 'anything')));
    if (count($r) !== 0) {
        $failures[] = 'a non-existent block produced a verdict.';
    }

    if ($failures) {
        echo 'DETECTOR-7 SELF-TEST FAILED (' . count($failures) . " checks)\n";
        foreach ($failures as $f) {
            echo '  - ' . $f . "\n";
        }
        return 1;
    }
    echo "DETECTOR-7 SELF-TEST PASSED — 6 checks green.\n";
    return 0;
}

if (PHP_SAPI === 'cli' && isset($argv[0]) && realpath($argv[0]) === realpath(__FILE__)) {
    $a = array_slice($argv, 1);
    if (in_array('--self-test', $a, true)) {
        exit(self_test());
    }
    if (count($a) >= 1 && $a[0] === '--candidates') {
        $raw = json_decode((string) file_get_contents($a[1]), true);
        $cands = array();
        foreach ((array) $raw as $row) {
            $cands[] = array($row[0], $row[1]);
        }
        foreach (detect_css_paint($cands) as $row) {
            echo json_encode($row) . "\n";
        }
        exit(0);
    }
    fwrite(STDERR, "usage: detector7_css_paint_flow.php --self-test | --candidates <file.json>\n");
    exit(2);
}
