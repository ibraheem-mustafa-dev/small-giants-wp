'use strict';

/**
 * migrate-icon-gradient-css.js
 *
 * Migrates the remaining `sgs_svg_stroke_gradient()` direct-call sites onto
 * the shared `sgs_icon_gradient_css()` composer (built 2026-09-05 as
 * `sgs/icon`'s proof-of-concept — `includes/helpers-svg-gradient.php:274`).
 *
 * WHY A CODEMOD, NOT HAND-EDITS: the night this rollout started, 3 blocks
 * (cart, accordion-item, before-after) were hand-migrated — but only their
 * HOVER state. Base state was left on the old call in all three, undetected
 * until the next session's survey. `.claude/THE-MIGRATION-METHOD.md`'s
 * 3-block threshold exists exactly to prevent this: a codemod applied in one
 * pass treats base+hover as one shape and cannot silently do half the job
 * across separate files. See `.claude/prompts/2026-09-06-colour-conformance-
 * paint-target-grouping.md` Correction 3.
 *
 * THE SHAPE: each TARGET_ROW is a hand-verified (block, exact old statement)
 * pair — like `migrate-fill-custom-property-gradient.js`, this is NOT a
 * general AST recogniser. Each row's selector/icon-source expression and
 * surrounding statement differs per block (confirmed by direct read of each
 * render.php this session), so each carries its own exact `oldStmt`/
 * `newStmt` pair rather than a parameterised template. `classifyRow()`
 * requires the OLD statement to appear EXACTLY ONCE, verbatim, in the
 * target file — never a fuzzy match, never a guess.
 *
 * REFUSES (never guesses) one real different shape found while scoping this
 * script: `icon-list.iconColourGradient` applies to a list of items whose
 * OWN icon source varies per item (each item declares its own `iconSource`,
 * unlike every other row here which has exactly ONE icon per block). A
 * single `sgs_icon_gradient_css(iconSource, ...)` call cannot know which of
 * potentially several different sources to resolve against — this needs its
 * own per-item design, not a call-site swap. See KNOWN_DIFFERENT_SHAPE.
 *
 * Modes: --survey | --fix [--apply] | --check | --self-test
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { BLOCKS_DIR } = require( './survey.js' );

/**
 * Each row: `block` (dir name under BLOCKS_DIR), `attr` (the gradient
 * attribute this row is keyed on, for reporting only), `oldStmt` (exact
 * substring expected in render.php, must occur exactly once), `newStmt`
 * (its verbatim replacement).
 */
const TARGET_ROWS = [
	{
		block: 'notice-banner',
		attr: 'iconColourGradient',
		note: 'REAL BUG — iconSource can be dashicon/emoji here; the old call silently no-ops for both.',
		oldStmt:
			"$sgs_notice_banner_stroke_grad = sgs_svg_stroke_gradient( $icon_colour_gradient, $uid . '-ig' );\n" +
			"if ( '' !== $sgs_notice_banner_stroke_grad['defs'] ) {\n" +
			"\t$icon_html    = sgs_svg_inject_defs( $icon_html, $sgs_notice_banner_stroke_grad['defs'] );\n" +
			"\t$scoped_css[] = $root_sel . ' .sgs-notice-banner__icon svg{' . $sgs_notice_banner_stroke_grad['css'] . ';}';\n" +
			'}',
		newStmt:
			"$sgs_notice_banner_stroke_grad = sgs_icon_gradient_css( $resolved_source, $icon_colour_gradient, $uid . '-ig', $root_sel . ' .sgs-notice-banner__icon svg' );\n" +
			"if ( '' !== $sgs_notice_banner_stroke_grad['defs'] ) {\n" +
			"\t$icon_html    = sgs_svg_inject_defs( $icon_html, $sgs_notice_banner_stroke_grad['defs'] );\n" +
			"\t$scoped_css[] = $root_sel . ' .sgs-notice-banner__icon svg{' . $sgs_notice_banner_stroke_grad['css'] . ';}';\n" +
			'}',
	},
	{
		block: 'cart',
		attr: 'iconColourGradient',
		note: 'Consistency swap — lucide-only, no functional bug. Base state; hover already migrated.',
		oldStmt:
			"$sgs_cart_stroke_grad = sgs_svg_stroke_gradient( $icon_colour_gradient, $uid . '-ig' );\n" +
			"if ( '' !== $sgs_cart_stroke_grad['defs'] ) {\n" +
			'\t$icon_svg     = sgs_svg_inject_defs( $icon_svg, $sgs_cart_stroke_grad[\'defs\'] );\n' +
			'\t$scoped_css[] = "{$sel} .sgs-cart__icon svg{" . $sgs_cart_stroke_grad[\'css\'] . \';}\';\n' +
			'}',
		newStmt:
			'$sgs_cart_stroke_grad = sgs_icon_gradient_css( \'lucide\', $icon_colour_gradient, $uid . \'-ig\', "{$sel} .sgs-cart__icon svg" );\n' +
			"if ( '' !== $sgs_cart_stroke_grad['defs'] ) {\n" +
			'\t$icon_svg     = sgs_svg_inject_defs( $icon_svg, $sgs_cart_stroke_grad[\'defs\'] );\n' +
			'\t$scoped_css[] = "{$sel} .sgs-cart__icon svg{" . $sgs_cart_stroke_grad[\'css\'] . \';}\';\n' +
			'}',
	},
	{
		block: 'accordion-item',
		attr: 'iconColourGradient',
		note: 'Consistency swap — lucide-only, no functional bug. Base state; hover already migrated.',
		oldStmt:
			"$sgs_ai_stroke_grad = sgs_svg_stroke_gradient( $icon_col_gradient, $uid . '-ig' );\n" +
			"if ( '' !== $sgs_ai_stroke_grad['css'] ) {\n" +
			"\t$responsive_css .= $root_sel . ' .sgs-accordion-item__icon-open svg,' . $root_sel . ' .sgs-accordion-item__icon-close svg{' . $sgs_ai_stroke_grad['css'] . '}';\n" +
			'}',
		newStmt:
			"$sgs_ai_stroke_grad = sgs_icon_gradient_css( 'lucide', $icon_col_gradient, $uid . '-ig', '' );\n" +
			"if ( '' !== $sgs_ai_stroke_grad['css'] ) {\n" +
			"\t$responsive_css .= $root_sel . ' .sgs-accordion-item__icon-open svg,' . $root_sel . ' .sgs-accordion-item__icon-close svg{' . $sgs_ai_stroke_grad['css'] . '}';\n" +
			'}',
	},
	{
		block: 'before-after',
		attr: 'handleIconGradient',
		note: 'Consistency swap — lucide/wp-icon only, no functional bug. Base state; hover already migrated (and already uses the real $handle_icon_source variable, mirrored here).',
		oldStmt:
			"$sgs_handle_icon_grad = sgs_svg_stroke_gradient( $handle_icon_gradient, $handle_icon_grad_id, 'stroke' );\n" +
			"if ( '' !== $sgs_handle_icon_grad['defs'] ) {\n" +
			"\t$root_var_decls[] = '--sgs-before-after-handle-icon-colour:url(#' . $handle_icon_grad_id . ')';\n" +
			'} elseif ( $handle_icon_col ) {\n' +
			"\t$root_var_decls[] = '--sgs-before-after-handle-icon-colour:' . sgs_colour_value( $handle_icon_col );\n" +
			'}',
		newStmt:
			"$sgs_handle_icon_grad = sgs_icon_gradient_css( $handle_icon_source, $handle_icon_gradient, $handle_icon_grad_id, '' );\n" +
			"if ( '' !== $sgs_handle_icon_grad['defs'] ) {\n" +
			"\t$root_var_decls[] = '--sgs-before-after-handle-icon-colour:url(#' . $handle_icon_grad_id . ')';\n" +
			'} elseif ( $handle_icon_col ) {\n' +
			"\t$root_var_decls[] = '--sgs-before-after-handle-icon-colour:' . sgs_colour_value( $handle_icon_col );\n" +
			'}',
	},
	{
		block: 'social-icons',
		attr: 'iconGlyphColourGradient+Hover',
		note: 'Consistency swap — lucide-only, no functional bug (Bean’s direction: match the shared convention). Both base AND hover still on the old call; the custom (uploaded image) icon platform is a separate, unfixable-here gap (no <svg>/<span> to paint) — not touched by this row.',
		oldStmt:
			"$sgs_social_stroke_grad       = sgs_svg_stroke_gradient( $icon_glyph_colour_gradient, $uid . '-ig' );\n" +
			"$sgs_social_stroke_grad_hover = sgs_svg_stroke_gradient( $icon_glyph_colour_hover_gradient, $uid . '-igh' );\n" +
			"if ( '' !== $sgs_social_stroke_grad['css'] ) {\n" +
			'\t$scoped_css[] = "{$root_sel} .sgs-social-icons__item svg{" . $sgs_social_stroke_grad[\'css\'] . \';}\';\n' +
			'}\n' +
			"if ( '' !== $sgs_social_stroke_grad_hover['css'] ) {\n" +
			'\t$scoped_css[] = sgs_hover_guarded_rule( "{$root_sel} .sgs-social-icons__item:hover svg", $sgs_social_stroke_grad_hover[\'css\'] );\n' +
			'}',
		newStmt:
			'$sgs_social_stroke_grad       = sgs_icon_gradient_css( \'lucide\', $icon_glyph_colour_gradient, $uid . \'-ig\', "{$root_sel} .sgs-social-icons__item svg" );\n' +
			'$sgs_social_stroke_grad_hover = sgs_icon_gradient_css( \'lucide\', $icon_glyph_colour_hover_gradient, $uid . \'-igh\', "{$root_sel} .sgs-social-icons__item:hover svg" );\n' +
			"if ( '' !== $sgs_social_stroke_grad['css'] ) {\n" +
			'\t$scoped_css[] = "{$root_sel} .sgs-social-icons__item svg{" . $sgs_social_stroke_grad[\'css\'] . \';}\';\n' +
			'}\n' +
			"if ( '' !== $sgs_social_stroke_grad_hover['css'] ) {\n" +
			'\t$scoped_css[] = sgs_hover_guarded_rule( "{$root_sel} .sgs-social-icons__item:hover svg", $sgs_social_stroke_grad_hover[\'css\'] );\n' +
			'}',
	},
];

// Rows in this backlog that do NOT match this shape — named so nobody
// re-investigates them believing this script should have covered them.
const KNOWN_DIFFERENT_SHAPE = {
	'icon-list.iconColourGradient':
		'each list item declares its OWN iconSource (dashicon/emoji/lucide/wp-icon can differ per item in the same list); a single sgs_icon_gradient_css(iconSource, ...) call cannot resolve one gradient CSS technique for a set of items whose sources vary — needs a per-item design, not a call-site swap. Real bug still applies (dashicon/emoji items silently get no gradient) but the fix shape is different from every TARGET_ROW here.',
	'trust-bar.iconColourGradient': 'lucide-only in practice, correct mechanism already — swap is pure convention polish, not in scope (Bean’s direction, 2026-09-06)',
	'button.iconColourGradient': 'icon source picker exists but its value is discarded before render (render.php always calls sgs_get_lucide_icon()) — functionally lucide-only, correct mechanism already, not in scope',
	'business-info.iconColourGradient': 'lucide-only (hardcoded, no picker), correct mechanism already, not in scope',
	'google-reviews.starColourGradient': 'fixed inline SVG star-fill shape, no iconSource concept at all — sgs_svg_stroke_gradient(...,\'fill\') is the correct and only applicable mechanism',
	'star-rating.starColourGradient': 'fixed inline SVG star-fill shape, no iconSource concept at all — correct mechanism already, not in scope',
};

// ---------------------------------------------------------------------------
// Detection — the OLD statement must appear EXACTLY ONCE, verbatim.
// ---------------------------------------------------------------------------

function countOccurrences( haystack, needle ) {
	if ( '' === needle ) return 0;
	let count = 0;
	let idx = haystack.indexOf( needle );
	while ( idx !== -1 ) {
		count++;
		idx = haystack.indexOf( needle, idx + needle.length );
	}
	return count;
}

function classifyRow( row ) {
	const renderFile = path.join( BLOCKS_DIR, row.block, 'render.php' );
	if ( ! fs.existsSync( renderFile ) ) return { ok: false, reason: 'no-render-php' };
	const php = fs.readFileSync( renderFile, 'utf8' );

	const occurrences = countOccurrences( php, row.oldStmt );
	if ( occurrences === 0 ) {
		// Already migrated (or the file changed underneath us) is NOT an
		// error condition worth failing on — report it distinctly so
		// --survey/--check can tell "nothing to do" from "couldn't find it".
		const alreadyDone = countOccurrences( php, row.newStmt ) > 0;
		return { ok: false, reason: alreadyDone ? 'already-migrated' : 'old-statement-not-found', renderFile, php };
	}
	if ( occurrences > 1 ) {
		return { ok: false, reason: 'old-statement-occurs-more-than-once-ambiguous', renderFile, php };
	}

	return { ok: true, renderFile, php };
}

function planRow( row ) {
	const cls = classifyRow( row );
	if ( ! cls.ok ) return cls;
	const newText = cls.php.replace( row.oldStmt, row.newStmt );
	return { ok: true, renderFile: cls.renderFile, newText };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function rowLabel( row ) {
	return row.block + '.' + row.attr;
}

function runSurvey() {
	console.log( 'migrate-icon-gradient-css — SURVEY\n' );
	for ( const row of TARGET_ROWS ) {
		const plan = planRow( row );
		console.log( '  ' + ( plan.ok ? 'FIXABLE ' : 'REFUSED ' ).padEnd( 9 ) + rowLabel( row ) + ( plan.ok ? '' : '  — ' + plan.reason ) );
	}
	console.log( '\nKnown different-shape rows in this backlog bucket (not attempted by this script):' );
	for ( const [ key, reason ] of Object.entries( KNOWN_DIFFERENT_SHAPE ) ) {
		console.log( '  ' + key + '  — ' + reason );
	}
}

function runFix( apply ) {
	console.log( 'migrate-icon-gradient-css — FIX' + ( apply ? ' (writing)' : ' (dry run)' ) + '\n' );
	let fixed = 0;
	let refused = 0;
	for ( const row of TARGET_ROWS ) {
		const plan = planRow( row );
		if ( ! plan.ok ) {
			console.log( '  REFUSED  ' + rowLabel( row ) + '  — ' + plan.reason );
			refused++;
			continue;
		}
		console.log( '  FIXABLE  ' + rowLabel( row ) + '  (' + row.note + ')' );
		if ( apply ) {
			fs.writeFileSync( plan.renderFile, plan.newText );
		}
		fixed++;
	}
	console.log( '\n' + ( apply ? 'Applied' : 'Would apply' ) + ' ' + fixed + ' fix(es), ' + refused + ' refused.' );
}

function runCheck() {
	// Binary gate: asserts the ABSENCE of the old shape (per THE-MIGRATION-
	// METHOD.md Step 4's CLI contract), not the presence of the new one — a
	// row already migrated by other means still passes.
	let bad = 0;
	for ( const row of TARGET_ROWS ) {
		const renderFile = path.join( BLOCKS_DIR, row.block, 'render.php' );
		if ( ! fs.existsSync( renderFile ) ) continue;
		const php = fs.readFileSync( renderFile, 'utf8' );
		if ( countOccurrences( php, row.oldStmt ) > 0 ) {
			console.log( '[check] STILL ON OLD CALL: ' + rowLabel( row ) );
			bad++;
		}
	}
	if ( bad === 0 ) {
		console.log( '[check] PASS — no targeted row still calls sgs_svg_stroke_gradient() directly.' );
	} else {
		console.log( '[check] FAIL — ' + bad + ' row(s) still on the old call.' );
		process.exitCode = 1;
	}
}

function runSelfTest() {
	let failures = 0;
	function assert( cond, msg ) {
		if ( ! cond ) { console.log( '  FAIL: ' + msg ); failures++; }
	}

	// Positive control — a synthetic fixture matching one real row's exact shape.
	const positiveRow = {
		block: '__fixture_positive__',
		attr: 'fooGradient',
		oldStmt: "$x = sgs_svg_stroke_gradient( $foo_gradient, $uid . '-ig' );\nif ( '' !== $x['css'] ) {\n\t$out[] = $x['css'];\n}",
		newStmt: "$x = sgs_icon_gradient_css( 'lucide', $foo_gradient, $uid . '-ig', '' );\nif ( '' !== $x['css'] ) {\n\t$out[] = $x['css'];\n}",
	};
	const positivePhp = "// preamble\n" + positiveRow.oldStmt + "\n// trailer\n";
	assert( countOccurrences( positivePhp, positiveRow.oldStmt ) === 1, 'positive fixture: old statement found exactly once' );
	const positiveAfter = positivePhp.replace( positiveRow.oldStmt, positiveRow.newStmt );
	assert( positiveAfter.includes( 'sgs_icon_gradient_css' ), 'positive fixture: transform produces the new call' );
	assert( ! positiveAfter.includes( 'sgs_svg_stroke_gradient' ), 'positive fixture: transform removes the old call' );

	// Negative control — a file with no matching statement at all must refuse,
	// never guess. Byte-identical after (this script never touches such a file).
	const negativePhp = '// nothing icon-gradient-shaped here at all\n$y = 1;\n';
	assert( countOccurrences( negativePhp, positiveRow.oldStmt ) === 0, 'negative control: no match found' );

	// Edge — already-migrated file: old statement absent, new statement
	// present. Must classify distinctly from "not found at all" (checked via
	// classifyRow's alreadyDone branch, exercised against the real fixture
	// object shape, not just the raw substring functions).
	const alreadyDonePhp = '// preamble\n' + positiveRow.newStmt + '\n// trailer\n';
	const alreadyDoneCls = classifyRow( { ...positiveRow, block: '__nonexistent_block_for_self_test__' } );
	assert( alreadyDoneCls.reason === 'no-render-php', 'edge case: a block with no render.php refuses distinctly (sanity check on classifyRow plumbing)' );
	assert( countOccurrences( alreadyDonePhp, positiveRow.oldStmt ) === 0 && countOccurrences( alreadyDonePhp, positiveRow.newStmt ) === 1, 'edge case: already-migrated text has zero old occurrences and one new occurrence' );

	// Ambiguous — the old statement appearing twice must refuse, never guess
	// which one to fix.
	const ambiguousPhp = positiveRow.oldStmt + '\n' + positiveRow.oldStmt;
	assert( countOccurrences( ambiguousPhp, positiveRow.oldStmt ) === 2, 'ambiguous case: both occurrences found (classifyRow refuses on count>1, checked by caller)' );

	// Idempotence — applying the transform to already-new text is a no-op
	// (the old statement is absent, so String.replace with a string needle
	// that doesn't occur returns the input unchanged).
	const idempotent = alreadyDonePhp.replace( positiveRow.oldStmt, positiveRow.newStmt );
	assert( idempotent === alreadyDonePhp, 'idempotence: re-running the transform on already-migrated text changes nothing' );

	// Every TARGET_ROW's oldStmt and newStmt must actually differ (a copy-paste
	// bug that made them identical would silently "succeed" while changing
	// nothing).
	for ( const row of TARGET_ROWS ) {
		assert( row.oldStmt !== row.newStmt, rowLabel( row ) + ': oldStmt and newStmt are not identical' );
		assert( row.oldStmt.includes( 'sgs_svg_stroke_gradient' ), rowLabel( row ) + ': oldStmt names the function being replaced' );
		assert( row.newStmt.includes( 'sgs_icon_gradient_css' ), rowLabel( row ) + ': newStmt names the replacement function' );
	}

	console.log( '\n' + ( failures === 0 ? 'ALL SELF-TESTS PASSED' : failures + ' SELF-TEST(S) FAILED' ) + '\n' );
	return failures === 0;
}

function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) { process.exit( runSelfTest() ? 0 : 1 ); return; }
	if ( argv.includes( '--survey' ) ) return runSurvey();
	if ( argv.includes( '--fix' ) ) return runFix( argv.includes( '--apply' ) );
	if ( argv.includes( '--check' ) ) return runCheck();
	console.log( 'Usage: node migrate-icon-gradient-css.js --survey | --fix [--apply] | --check | --self-test' );
	process.exitCode = 1;
}

if ( require.main === module ) main();

module.exports = { TARGET_ROWS, KNOWN_DIFFERENT_SHAPE, classifyRow, planRow };
