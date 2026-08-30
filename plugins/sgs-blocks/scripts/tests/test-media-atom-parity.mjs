/**
 * Standing gate: for every media ATOM, the JS value-setter and the PHP value-
 * setter must emit BYTE-IDENTICAL custom-property declarations for a fixed
 * attribute set.
 *
 * WHY THIS SHAPE
 * --------------
 * Architecture v2 L4 claims one stylesheet, one descriptor, two thin value-
 * setters. The two setters cannot "run the same function" - one is JS for the
 * editor canvas, one is PHP for the page - so the achievable, testable claim is
 * that they AGREE. This is the fixture that holds them to it.
 *
 * A disagreement here is the worst kind of bug in this layer: the canvas shows
 * the client one thing and the published page shows another, both render fine,
 * and nothing errors.
 *
 * ⛔ IT MUST NOT PASS VACUOUSLY. Ten atoms are declared in the registry; their
 * value-setters land per atom. A harness that finds none and reports success is
 * the `zeroIsAClaim` failure - a green run that proves only that it did nothing.
 * So the number of IMPLEMENTED atoms is declared below as a ratchet: the run
 * fails if fewer atoms are implemented than last recorded, and tells you to
 * raise the number when more land.
 *
 * Run:  node scripts/tests/test-media-atom-parity.mjs
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BS = String.fromCharCode( 92 );
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = path.resolve( HERE, '..', '..' );
const P = PLUGIN.split( BS ).join( '/' );

/**
 * How many atoms currently ship BOTH value-setters.
 *
 * ⛔ RATCHET. Raise this in the same commit that implements an atom. Never lower
 * it to make a run go green - a lowered ratchet is how a deleted implementation
 * passes as progress.
 */
const IMPLEMENTED_ATOMS = 10;

const { MEDIA_ATOMS, MEDIA_ATOM_IDS } = await import(
	'file:///' + P + '/src/components/media/atoms/registry.js'
);

let fail = 0;
const ck = ( name, cond, extra = '' ) => {
	process.stdout.write(
		'  ' + ( cond ? 'ok   ' : 'FAIL ' ) + name + ( cond ? '' : '  ' + extra ) + '\n'
	);
	if ( ! cond ) {
		fail++;
	}
};

/** An atom's JS module path, if it has shipped one. */
const jsModule = ( id ) =>
	path.join( PLUGIN, 'src', 'components', 'media', 'atoms', `${ id }.js` );

/** An atom's PHP twin, if it has shipped one. */
const phpModule = ( id ) =>
	path.join( PLUGIN, 'includes', 'media', 'atoms', `${ id }.php` );

/**
 * The attribute set every atom is measured against.
 *
 * IT MUST EXERCISE EVERY ATOM. An earlier fixture carried only presentation
 * keys, so source / meaning / media-type / video-behaviour / intrinsic all
 * reported 'identical declarations (0)' - a green tick for comparing two empty
 * arrays. Branch A flagged it rather than banking the pass. Parity between
 * nothing and nothing is not parity.
 *
 * Values are deliberately NON-DEFAULT wherever a default exists, so an emitter
 * that silently returns early still shows up as a zero.
 */
const FIXTURE = {
	prefix: '',
	blockSlug: 'sgs/parity-probe',
	attributes: {
		// source - a paintable backdrop image, plus tiers.
		imageId: 41,
		imageUrl: 'https://example.test/hero.jpg',
		imageUrlTablet: 'https://example.test/hero-tablet.jpg',
		imageUrlMobile: 'https://example.test/hero-mobile.jpg',
		svgContent: '<svg viewBox="0 0 10 10"></svg>',
		// media-type
		mediaType: 'image',
		// meaning
		imageAlt: 'A parity probe',
		imageIsDecorative: false,
		// intrinsic
		imageWidth: 1600,
		imageHeight: 900,
		// video-behaviour
		videoAutoplay: true,
		videoMuted: false,
		videoPlaysInline: false,
		videoLoop: true,
		// svg-presentation
		svgOpacity: 0.4,
		svgMinHeight: '220px',
		svgPosition: 'center',
		// object-fit / focal-point
		objectFit: 'contain',
		objectPosition: '30% 70%',
		objectPositionMobile: '50% 20%',
		size: 'cover',
		position: 'center top',
		// box-shape
		mediaSizing: 'ratio',
		aspectRatio: '16 / 9',
		shape: 'circle',
		height: { desktop: 320, tablet: 240 },
		heightUnit: 'px',
		minHeight: { desktop: '40vh' },
		// overlay
		overlayColour: 'primary',
		overlayOpacity: 40,
		overlayBlendMode: 'multiply',
	},
};

/**
 * Atoms whose whole job produces CSS, so a ZERO from them is a defect.
 *
 * The others legitimately emit nothing and say so in their own docblocks:
 * `meaning` and `intrinsic` reach the page as HTML attributes, `media-type` is
 * a markup discriminator, and `video-behaviour` is element state. Asserting
 * '>0' across the board would be wrong; asserting it nowhere makes every tick
 * vacuous.
 */
const EMITS_CSS = [
	'source',
	'svg-presentation',
	'object-fit',
	'focal-point',
	'box-shape',
	'overlay',
];
/** Run one atom's PHP emitter through the CLI and return its declarations. */
function phpDeclarations( id ) {
	const fn = `sgs_media_atom_${ id.replace( /-/g, '_' ) }_css`;
	const body =
		`define("ABSPATH","${ P }/");` +
		'function esc_attr($s){return $s;} function esc_html($s){return $s;}' +
		'function __($s,$d=null){return $s;} function esc_html__($s,$d=null){return $s;}' +
		'function _doing_it_wrong($f,$m,$v){}' +
		`require "${ P }/includes/media/atoms/${ id }.php";` +
		`$out=${ fn }(` +
		`json_decode(${ JSON.stringify( JSON.stringify( FIXTURE.attributes ) ) },true),` +
		`${ JSON.stringify( FIXTURE.prefix ) },${ JSON.stringify( FIXTURE.blockSlug ) });` +
		'echo json_encode(array_values($out));';
	return JSON.parse( execFileSync( 'php', [ '-r', body ], { encoding: 'utf8' } ) );
}

process.stdout.write( 'media atom value-setter parity\n\n' );

let implemented = 0;
let totalDecls = 0;
const pending = [];

for ( const id of MEDIA_ATOM_IDS ) {
	const hasJs = fs.existsSync( jsModule( id ) );
	const hasPhp = fs.existsSync( phpModule( id ) );

	if ( ! hasJs && ! hasPhp ) {
		pending.push( id );
		continue;
	}

	// A HALF-implemented atom is worse than an unimplemented one: the editor
	// styles the canvas and the page renders nothing, or the reverse.
	ck( `${ id }: both halves present`, hasJs && hasPhp,
		`js=${ hasJs } php=${ hasPhp }` );
	if ( ! hasJs || ! hasPhp ) {
		continue;
	}

	implemented++;

	const mod = await import( 'file:///' + jsModule( id ).split( BS ).join( '/' ) );
	const jsOut = mod.css( {
		attributes: FIXTURE.attributes,
		prefix: FIXTURE.prefix,
		blockSlug: FIXTURE.blockSlug,
	} );
	const phpOut = phpDeclarations( id );

	const a = [ ...jsOut ].sort();
	const b = [ ...phpOut ].sort();
	const onlyJs = a.filter( ( d ) => ! b.includes( d ) );
	const onlyPhp = b.filter( ( d ) => ! a.includes( d ) );

	ck(
		`${ id }: JS and PHP emit identical declarations (${ a.length })`,
		! onlyJs.length && ! onlyPhp.length,
		`JS-only: [${ onlyJs.join( ', ' ) }]  PHP-only: [${ onlyPhp.join( ', ' ) }]`
	);

	// An atom whose job IS css must emit some against this fixture. Otherwise
	// 'identical declarations (0)' is a green tick for comparing two empty
	// arrays - the vacuity branch A caught in the first pass.
	if ( EMITS_CSS.includes( id ) ) {
		ck(
			`${ id }: emits a NON-ZERO declaration set`,
			a.length > 0,
			'0 declarations - the emitter returns early, or the fixture lacks the '
				+ 'keys this atom reads'
		);
	}

	// Every declaration must be a custom property. A raw property here would
	// mean the atom is writing a RULE, which belongs in media-element.css alone.
	totalDecls += a.length;
	const raw = a.filter( ( d ) => ! d.trim().startsWith( '--' ) );
	ck( `${ id }: emits only custom properties, never rules`, ! raw.length,
		`offending: [${ raw.join( ', ' ) }]` );
}

process.stdout.write(
	`\nimplemented: ${ implemented }/${ MEDIA_ATOM_IDS.length }` +
	`  ·  declarations compared: ${ totalDecls }`
);
if ( pending.length ) {
	process.stdout.write( `  ·  pending: ${ pending.join( ', ' ) }` );
}
process.stdout.write( '\n' );

// ── The vacuity guard ────────────────────────────────────────────────────────
ck(
	`ratchet: at least ${ IMPLEMENTED_ATOMS } atom(s) implemented`,
	implemented >= IMPLEMENTED_ATOMS,
	`found ${ implemented } — an implementation was removed, or the ratchet is wrong`
);
if ( implemented > IMPLEMENTED_ATOMS ) {
	process.stdout.write(
		`\n  ⬆  RAISE THE RATCHET: ${ implemented } atoms now implemented, ` +
			`IMPLEMENTED_ATOMS still says ${ IMPLEMENTED_ATOMS }.\n` +
			'     Edit it in this file, in the same commit as the atom.\n'
	);
	fail++;
}
// The registry itself must stay whole, or "0 implemented" could just mean the
// registry failed to load and every atom looked absent.
ck( 'registry loaded and still declares ten atoms', MEDIA_ATOM_IDS.length === 10,
	`got ${ MEDIA_ATOM_IDS.length }` );
ck( 'every atom id resolves to a registry entry',
	MEDIA_ATOM_IDS.every( ( id ) => !! MEDIA_ATOMS[ id ] ) );

// Report what was actually COMPARED, never a blanket agreement claim. With no
// atoms implemented, "JS and PHP agree" would be a claim nothing tested - the
// precise shape of vacuity this harness exists to avoid.
if ( fail ) {
	process.stdout.write( '\nFAIL - ' + fail + ' problem(s)\n' );
} else if ( implemented === 0 ) {
	process.stdout.write(
		'\nPASS (structure only) - no atom value-setters exist yet, so NOTHING was ' +
			'compared. This run proves the registry is whole and the ratchet holds; ' +
			'it proves nothing about JS/PHP agreement.\n'
	);
} else {
	process.stdout.write(
		'\nPASS - JS and PHP agree across ' + implemented + ' implemented atom(s)\n'
	);
}

process.exit( fail ? 1 : 0 );
