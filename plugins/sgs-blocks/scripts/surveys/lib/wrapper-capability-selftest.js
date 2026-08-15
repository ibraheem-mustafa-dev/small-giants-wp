/**
 * wrapper-capability-selftest.js
 *
 * Self-test for the wrapper-capability census.
 *
 * EVERY RULE CARRIES A POSITIVE **AND** A NEGATIVE CONTROL. A rule with only a
 * positive control cannot distinguish "working" from "always returns true" —
 * this repo has shipped a survey leg that passed an EMPTY canonical set, so
 * every correct mount printed as non-canonical and the leg could only ever
 * report one answer.
 *
 * The negative controls here are not decorative. Each one is the exact wrong
 * answer an earlier version of this analyser actually produced, measured on the
 * live tree during construction:
 *
 *   1. minHeight read as all-kinds because unguarded PLUMBING lines re-widened
 *      the mask (no path-sensitivity).
 *   2. minHeight still all-kinds because the guard was carried by a VARIABLE
 *      (`$has_responsive_min_height`), not a literal `$is_section`.
 *   3. minHeight still all-kinds because taint followed a BOOLEAN FLAG into an
 *      unrelated all-kinds aggregate (`$has_responsive_attr`).
 *   4. Nine attributes read as reaching paint under NO kind, because the
 *      boolean-flag cut-off dropped boolean attributes whose whole semantic IS
 *      the flag.
 *   5. contentWidthTablet read as NONE because a ternary containing `||` was
 *      misclassified as a boolean flag.
 *
 * `--self-test-demonstrate-failure` proves the harness is not hard-wired green.
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const kindLib = require( './php-kind-consumption.js' );

const ROOT = path.join( __dirname, '..', '..', '..' );
const WRAPPER_PHP = path.join( ROOT, 'includes', 'class-sgs-container-wrapper.php' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );

let failures = 0;
let checks = 0;

function assert( label, actual, expected ) {
	checks++;
	const a = JSON.stringify( actual );
	const e = JSON.stringify( expected );
	if ( a === e ) {
		process.stdout.write( `  PASS  ${ label }\n` );
	} else {
		failures++;
		process.stdout.write( `  FAIL  ${ label }\n        expected ${ e }\n        actual   ${ a }\n` );
	}
}

function run( demonstrateFailure = false ) {
	process.stdout.write( '[survey-wrapper-capability --self-test]\n\n' );

	// -----------------------------------------------------------------------
	// RULE 1 — comment blanking
	// -----------------------------------------------------------------------
	process.stdout.write( 'RULE 1 — PHP comments are blanked before analysis\n' );
	{
		const src = [
			'<?php',
			"// $attributes['inAComment'] must not be seen",
			"/* $attributes['inABlockComment'] neither */",
			"$x = $attributes['realRead'];",
		].join( '\n' );
		const out = kindLib.blankPhpComments( src );
		// POSITIVE: the real read survives.
		assert( 'real read survives blanking', /realRead/.test( out ), true );
		// NEGATIVE: commented reads are gone.
		assert( 'line-comment read removed', /inAComment/.test( out ), false );
		assert( 'block-comment read removed', /inABlockComment/.test( out ), false );
		// Offsets preserved, or every reported file:line is wrong.
		assert( 'length preserved', out.length === src.length, true );
		assert( 'line count preserved', out.split( '\n' ).length === src.split( '\n' ).length, true );
	}

	// -----------------------------------------------------------------------
	// RULE 2 — kind mask from a boolean expression
	// -----------------------------------------------------------------------
	process.stdout.write( '\nRULE 2 — guard expressions narrow to the right kinds\n' );
	{
		const m = ( e, g ) => kindLib.maskOfExpr( e, g || new Map() );
		assert( 'AND with $is_section', m( '$is_section && $foo' ), [ 'section' ] );
		assert( 'OR of both flags', m( '$is_section || $is_layout' ), [ 'section', 'layout' ] );
		assert( 'parenthesised OR', m( "( $is_section || $is_layout ) && 'grid' === $layout" ), [ 'section', 'layout' ] );
		// NEGATIVE: a non-kind condition must NOT narrow.
		assert( 'unrelated condition does not narrow', m( "'grid' === $layout" ), [ 'section', 'layout', 'content' ] );
		// NEGATIVE: negation must widen, never invert — a wrong narrowing here
		// silently deletes a real consumer from the census.
		assert( 'negation does not narrow', m( '! $is_section' ), [ 'section', 'layout', 'content' ] );
	}

	// -----------------------------------------------------------------------
	// RULE 3 — guard carried by a VARIABLE
	// -----------------------------------------------------------------------
	process.stdout.write( '\nRULE 3 — a variable can carry the kind guard\n' );
	{
		const lines = [
			'$flag = $is_section && ( 1 === 1 );',
			'$unrelated = $foo || $bar;',
		];
		const g = kindLib.findGuardVars( lines );
		assert( 'guard variable detected', g.get( 'flag' ), [ 'section' ] );
		// NEGATIVE: a boolean with no kind input is NOT a guard variable.
		assert( 'non-guard variable not claimed', g.has( 'unrelated' ), false );
		assert( 'if() on a guard var narrows', kindLib.maskOfExpr( '$flag', g ), [ 'section' ] );
	}

	// -----------------------------------------------------------------------
	// RULE 4 — boolean flag vs value
	// -----------------------------------------------------------------------
	process.stdout.write( '\nRULE 4 — boolean flags are effects, ternaries are values\n' );
	{
		const analyse = ( src ) => kindLib.analyseKindConsumption( src ).kindsByAttr;
		// POSITIVE: a boolean attribute reaches paint (it is the flag).
		const boolSrc = [
			'<?php',
			"$ken = ! empty( $attributes['bgKenBurns'] );",
			'if ( $ken ) { $classes[] = 5; }',
		].join( '\n' );
		assert( 'boolean attr reaches paint', analyse( boolSrc ).get( 'bgKenBurns' ), [ 'section', 'layout', 'content' ] );

		// POSITIVE: a ternary containing `||` is a VALUE, not a flag.
		const ternarySrc = [
			'<?php',
			'$is_section = 1; $is_layout = 1;',
			"$cw = ( $is_section || $is_layout ) ? $attributes['contentWidthTablet'] : '';",
			"$css .= 'width:' . $cw;",
		].join( '\n' );
		assert( 'ternary value keeps its guard', analyse( ternarySrc ).get( 'contentWidthTablet' ), [ 'section', 'layout' ] );
	}

	// -----------------------------------------------------------------------
	// RULE 5 — THE DISCRIMINATING PAIR, on the real tree
	// -----------------------------------------------------------------------
	process.stdout.write( '\nRULE 5 — real-tree discriminating pair (paint channel, not editor channel)\n' );
	{
		const { kindsByAttr } = kindLib.analyseKindConsumption(
			fs.readFileSync( WRAPPER_PHP, 'utf8' )
		);
		const survey = require( '../survey-wrapper-capability.js' );

		const ctaKinds = survey.paintKindsOf( path.join( BLOCKS_DIR, 'cta-section', 'render.php' ) ).kinds;
		const accKinds = survey.paintKindsOf( path.join( BLOCKS_DIR, 'accordion', 'render.php' ) ).kinds;
		assert( 'cta-section paints section', ctaKinds, [ 'section' ] );
		assert( 'accordion paints layout', accKinds, [ 'layout' ] );

		const minHeight = kindsByAttr.get( 'minHeight' );
		assert( 'minHeight is section-only', minHeight, [ 'section' ] );

		// The pair: same attribute, opposite verdicts, decided by PAINT kind.
		assert(
			'minHeight CONSUMED by cta-section',
			ctaKinds.some( ( k ) => minHeight.includes( k ) ),
			true
		);
		assert(
			'minHeight NOT consumed by accordion',
			accKinds.some( ( k ) => minHeight.includes( k ) ),
			false
		);

		// A rule reading the EDITOR channel would get cta-section wrong: it
		// mounts named panels directly and passes no editor kind at all.
		const schema = require( '../../check-shared-panel-schema.js' );
		const wrapperSrc = fs.readFileSync(
			path.join( BLOCKS_DIR, 'container', 'components', 'ContainerWrapperControls.js' ),
			'utf8'
		);
		const kindPanels = schema.buildKindPanelsTable( wrapperSrc );
		const ctaMounts = schema.findMounts(
			path.join( BLOCKS_DIR, 'cta-section' ),
			'sgs/cta-section',
			kindPanels
		);
		assert(
			'cta-section has NO aggregator mount (editor channel is silent)',
			ctaMounts.some( ( m ) => m.kindOf === 'aggregator' ),
			false
		);
		assert( 'cta-section does mount panels directly', ctaMounts.length > 0, true );
	}

	// -----------------------------------------------------------------------
	// RULE 6 — no attribute may be stranded
	// -----------------------------------------------------------------------
	process.stdout.write( '\nRULE 6 — every attribute the PHP reads resolves to at least one kind\n' );
	{
		const { kindsByAttr } = kindLib.analyseKindConsumption(
			fs.readFileSync( WRAPPER_PHP, 'utf8' )
		);
		const stranded = [ ...kindsByAttr ].filter( ( [ , v ] ) => v.length === 0 );
		// An empty mask means "reaches paint under no kind at all", which for an
		// attribute the wrapper demonstrably reads is an analyser failure, not a
		// finding. Nine attributes sat here mid-construction.
		assert( 'no stranded attributes', stranded.map( ( [ k ] ) => k ), [] );
	}

	// -----------------------------------------------------------------------
	// RULE 7 — control detection by BEHAVIOUR, not component name
	// -----------------------------------------------------------------------
	process.stdout.write( '\nRULE 7 — control detection resolves the shapes this codebase actually uses\n' );
	{
		const cd = require( './control-detection.js' );
		const schema7 = require( '../../check-shared-panel-schema.js' );

		// POSITIVE: computed key — the shape sgs/accordion uses for its tiers.
		const computed = `setAttributes( { [ tier === "tablet" ? "paddingTablet" : "paddingMobile" ]: next } );`;
		const c1 = cd.attrsWrittenBySetAttributes( computed );
		assert( 'computed key resolves both branches', [ c1.has( 'paddingTablet' ), c1.has( 'paddingMobile' ) ], [ true, true ] );

		// POSITIVE: literal key still works.
		assert( 'literal key resolves', cd.attrsWrittenBySetAttributes( 'setAttributes( { gap: v } );' ).has( 'gap' ), true );

		// NEGATIVE: a bare mention is NOT a control.
		assert( 'bare mention is not a control', cd.attrsWrittenBySetAttributes( 'const x = attributes.gap;' ).has( 'gap' ), false );

		// POSITIVE + NEGATIVE: native supports.
		const nat = cd.attrsFromNativeSupports( { supports: { spacing: { padding: true } } } );
		assert( 'native supports.spacing.padding counts as a control', nat.has( 'padding' ), true );
		assert( 'absent native support claims nothing', nat.has( 'margin' ), false );

		// REAL TREE — the case that drove this module. sgs/accordion writes its
		// padding tiers ONLY via a computed key and has no literal `paddingTablet:`.
		const accJson = JSON.parse(
			fs.readFileSync( path.join( BLOCKS_DIR, 'accordion', 'block.json' ), 'utf8' )
		);
		const accSrc = schema7.blankComments(
			fs.readFileSync( path.join( BLOCKS_DIR, 'accordion', 'edit.js' ), 'utf8' )
		);
		const accCtl = cd.findControlledAttrs( accSrc, accJson ).controlled;
		assert( 'accordion paddingTablet detected as controlled', accCtl.has( 'paddingTablet' ), true );
		assert(
			'…and it is NOT findable as a literal key (proving the rule earns its keep)',
			/setAttributes\s*\(\s*\{[^}]*\bpaddingTablet\s*:/.test( accSrc ),
			false
		);

		const conJson = JSON.parse(
			fs.readFileSync( path.join( BLOCKS_DIR, 'container', 'block.json' ), 'utf8' )
		);
		const conSrc = schema7.blankComments(
			fs.readFileSync( path.join( BLOCKS_DIR, 'container', 'edit.js' ), 'utf8' )
		);
		const conCtl = cd.findControlledAttrs( conSrc, conJson ).controlled;
		assert( 'container tagName controlled', conCtl.has( 'tagName' ), true );

		// ⛔ REGRESSION CONTROLS — this file previously asserted the OPPOSITE.
		//
		// It encoded "container overlay family genuinely uncontrolled" as a
		// passing test, so the self-test actively defended a false finding: 36
		// colour controls reported missing that are all live. Corrected 2026-08-15
		// after Bean supplied the file:line evidence.
		//
		// Both shapes below are resolved only through the SHARED-COMPONENT corpus,
		// so if that corpus is ever dropped these two go red immediately.
		const sharedDirs = [
			path.join( ROOT, 'src', 'components' ),
			path.join( BLOCKS_DIR, 'container', 'components' ),
		];
		const sharedFiles = [];
		for ( const d of sharedDirs ) {
			if ( ! fs.existsSync( d ) ) continue;
			for ( const f of fs.readdirSync( d ) ) {
				if ( f.endsWith( '.js' ) ) sharedFiles.push( path.join( d, f ) );
			}
		}
		const sharedCtl = cd.attrsFromSharedComponents(
			( f ) => schema7.blankComments( fs.readFileSync( f, 'utf8' ) ),
			sharedFiles
		);

		// FORM A — name lives in another file's DEFAULT PARAMETER map.
		// GradientOverlayControl.js:196-202 + :308, mounted prop-less at
		// ContainerWrapperControls.js:796.
		assert( 'overlay solid colour IS controlled (two-hop default map)', sharedCtl.has( 'backgroundOverlayColour' ), true );
		assert( 'overlay gradient family IS controlled', sharedCtl.has( 'overlayGradientFrom' ), true );

		// FORM B — name lives in a local const holding a ternary.
		// ContainerWrapperControls.js:867 / :998.
		assert( 'background art-direction tier IS controlled (local const key)', sharedCtl.has( 'backgroundImageTablet' ), true );
		assert( 'background video tier IS controlled', sharedCtl.has( 'bgVideoMobile' ), true );

		// ⭐ THIS ASSERTION WAS INVERTED ON 2026-08-15, AND THAT IS THE POINT.
		//
		// It previously read `bgSvgMinHeight has NO control` — true at the time:
		// six blocks declared and painted it with no picker anywhere in src/.
		// A control was then added to BackgroundPanel, and this assertion went
		// red on the next run. The instrument noticed the world had changed
		// rather than quietly agreeing with it, which is the whole job of a
		// negative control. Flipped to lock the fix in: if the control is ever
		// removed, this goes red again.
		assert( 'bgSvgMinHeight now HAS a control (added 2026-08-15)', sharedCtl.has( 'bgSvgMinHeight' ), true );

		// Replacement over-claim guard: the corpus must still not claim an
		// attribute nothing writes. `verticalAlign` was unified away onto
		// `alignItems` (2026-08-12) and nothing writes it anywhere.
		assert( 'corpus does not over-claim a retired attribute', sharedCtl.has( 'verticalAlign' ), false );
	}

	// -----------------------------------------------------------------------
	// RULE 8 — the JS blanker is used on JS
	// -----------------------------------------------------------------------
	process.stdout.write( '\nRULE 8 — JS sources are blanked with the JS blanker\n' );
	{
		const schema8 = require( '../../check-shared-panel-schema.js' );
		const kind8 = require( './php-kind-consumption.js' );
		const raw = fs.readFileSync( path.join( BLOCKS_DIR, 'container', 'edit.js' ), 'utf8' );
		const dense = ( s ) => s.replace( /\s/g, '' ).length;
		const viaJs = dense( schema8.blankComments( raw ) );
		const viaPhp = dense( kind8.blankPhpComments( raw ) );

		// The PHP blanker mangles JSX. This asserts the gap is real, so nobody
		// "simplifies" the census by reusing one blanker for both languages.
		assert( 'JS blanker preserves most of the file', viaJs > dense( raw ) * 0.5, true );
		assert( 'PHP blanker demonstrably destroys JSX', viaPhp < viaJs, true );
	}

	// -----------------------------------------------------------------------
	// META — prove the harness can fail
	// -----------------------------------------------------------------------
	if ( demonstrateFailure ) {
		process.stdout.write( '\nMETA — deliberate failure injection (harness must go red)\n' );
		const before = failures;
		assert( 'INTENTIONAL: this assertion must fail', 1 + 1, 3 );
		if ( failures === before ) {
			process.stdout.write(
				'\n⛔ META-CHECK FAILED: the harness did not register a deliberate failure.\n'
			);
			process.exit( 1 );
		}
		process.stdout.write(
			`\n✅ Harness proven able to fail (${ failures - before } injected failure registered).\n`
		);
		process.exit( 0 );
	}

	process.stdout.write( `\n${ checks - failures }/${ checks } checks passed\n` );
	process.exit( failures > 0 ? 1 : 0 );
}

module.exports = { run };
