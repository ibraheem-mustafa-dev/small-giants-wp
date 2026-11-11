/**
 * Standing gate (Spec 49 C3, PS-7): for every case in `tests/fixtures/media/sizing-cases.json` and `matrix.json`, and
 * for a set of cases that exercises every atom, the PHP emitter `sgs_media_atom_<id>_emit()` and the JS emitter
 * `emit()` must print IDENTICAL CSS, byte for byte. It also holds the sizing emitter to the fixture's declarations,
 * runs `breakouts.json` through the value helpers and the emitters, and counts the cases that printed something so a
 * green run cannot be two empty strings compared.
 *
 * Run: node scripts/tests/test-media-emitter-parity.mjs
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { register } from 'node:module';

// The mask shapes come from a JSON file that the editor bundle imports; plain Node needs the import attribute.
register(
	'data:text/javascript,' +
		encodeURIComponent(
			"export async function load(url, context, nextLoad){ return url.endsWith('.json') ? nextLoad(url, { ...context, importAttributes: { type: 'json' } }) : nextLoad(url, context); }"
		)
);

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = path.resolve( HERE, '..', '..' );
const FIXTURES = path.join( PLUGIN, 'tests', 'fixtures', 'media' );
const load = ( rel ) => import( pathToFileURL( path.join( PLUGIN, rel ) ).href );
const readJson = ( name ) => JSON.parse( fs.readFileSync( path.join( FIXTURES, name ), 'utf8' ) );

const { MEDIA_EMITTERS } = await load( 'src/components/media/emit/emitters.js' );
const values = await load( 'src/components/media/emit/values.js' );

let fail = 0;
const ck = ( name, cond, extra = '' ) => {
	process.stdout.write( `  ${ cond ? 'ok   ' : 'FAIL ' }${ name }${ cond ? '' : '  ' + extra }\n` );
	if ( ! cond ) {
		fail++;
	}
};

const PREFIX = 'media';
const sizing = readJson( 'sizing-cases.json' );
const matrix = readJson( 'matrix.json' );
const breakouts = readJson( 'breakouts.json' );

/** Settings keyed by base name become attributes keyed `{prefix}{Base}`. */
const toAttrs = ( settings, file ) => {
	const attrs = {};
	for ( const [ base, value ] of Object.entries( settings ) ) {
		attrs[ PREFIX + base ] = value;
	}
	attrs[ PREFIX + 'Source' ] = { kind: 'image', width: file.width, height: file.height };
	return attrs;
};

const FILE = sizing.context.file;
const cases = [];
const add = ( label, atom, attrs, helper, wrapper ) =>
	cases.push( {
		id: `${ label }|${ atom }|h${ helper ? 1 : 0 }|w${ wrapper ? 1 : 0 }`,
		label,
		atom,
		slot: { prefix: PREFIX, wrapper },
		attrs,
		uid: 'u1',
		helper,
	} );

const attrSets = [];
for ( const c of [ ...sizing.cases, ...sizing.responsive ] ) {
	attrSets.push( { label: `sizing:${ c.id }`, attrs: toAttrs( c.settings, c.file || FILE ), helper: c.helper } );
}
for ( const s of matrix.slots ) {
	attrSets.push( { label: `matrix:${ s.id }`, attrs: toAttrs( s.settings, FILE ), helper: false } );
	attrSets.push( { label: `matrix:${ s.id }`, attrs: toAttrs( s.settings, FILE ), helper: true } );
}

const T = ( d, t, m ) => ( { desktop: d, tablet: t, mobile: m } );
const extras = {
	'fit-tile': { Fit: T( 'tile', 'cover' ), Repeat: 'repeat-x', TileSize: '120px', Pinned: true },
	'fit-all': { Fit: T( 'contain', 'fill', 'scale-down' ) },
	focal: { Focal: T( { x: 0.3, y: 0.7 }, { x: 0.333, y: 0.5 }, { x: 1, y: 0 } ) },
	opacity: { Opacity: T( 100, 40, 0 ), Blend: 'multiply' },
	filter: { Colour: T( 'greyscale', 'natural', 'white' ), Greyscale: 60 },
	'filter-default-strength': { Colour: 'greyscale' },
	layout: { Alignment: T( 'center', 'end', 'start' ), Order: T( -3, 25, 4 ) },
	padding: { Padding: T( { top: 10, left: '2rem' }, { top: '40px' }, {} ), Background: 'primary' },
	'shape-radius': { Shape: T( { shape: 'circle' }, 'pill', 'none' ), Radius: { desktop: { topLeft: 8, bottomRight: '1rem' } } },
	'shape-mask': { Shape: T( { shape: 'hexagon' }, { shape: 'star', proportions: 'keep' }, 'none' ), BoxShadow: '0 4px 12px', BoxShadowColour: 'rgba(0,0,0,.3)' },
	'shape-border': { BorderWidth: { top: 2, right: 2, bottom: 2, left: 2 }, BorderStyle: 'dashed', BorderColour: '#ff0000', BorderColourHover: 'secondary', Radius: { desktop: { topLeft: 4 } } },
	'shape-border-gradient': { BorderWidth: { top: 3, right: 3, bottom: 3, left: 3 }, BorderColour: '#ff0000', BorderColourGradient: 'linear-gradient(90deg, #f00, #00f)', BorderColourHoverGradient: 'linear-gradient(0deg, #0f0, #00f)', Shape: { shape: 'circle' } },
	'shape-border-gradient-padded': { BorderWidth: { top: 2 }, BorderColourGradient: 'linear-gradient(90deg, #f00, #00f)', BorderColourHover: 'secondary', Background: '#fff', Radius: { desktop: { topLeft: 8 } } },
	'shape-border-hover-gradient-only': { BorderWidth: { top: 2 }, BorderColour: 'primary', BorderColourHoverGradient: 'linear-gradient(90deg, #f00, #00f)', Background: 'primary' },
	'shape-border-gradient-mask': { BorderWidth: { top: 2 }, BorderColourGradient: 'linear-gradient(90deg, #f00, #00f)', Shape: { shape: 'hexagon' } },
	shadow: { BoxShadow: '0 8px 24px', BoxShadowColour: '#00000040', BoxShadowColourHover: 'primary' },
	'shadow-none': { BoxShadow: 'none' },
	overlay: { OverlayColour: 'primary', OverlayOpacity: T( 40, 20, 0 ), OverlayBlend: 'multiply', OverlayColourHover: '#000' },
	'overlay-gradient': { OverlayColour: 'primary', OverlayGradient: 'linear-gradient(180deg, transparent, #000)', OverlayGradientHover: 'linear-gradient(0deg, #000, transparent)' },
	'overlay-mask': { OverlayColour: '#000', Shape: { shape: 'diamond' } },
	svg: { SvgLayer: 'front', SvgTextShadow: true },
	'svg-behind': { SvgLayer: 'behind' },
	'source-sizes': { Source: T( { kind: 'image', width: 800, height: 400 }, { kind: 'image', width: 400, height: 400 }, undefined ), Height: '300px', Width: 'auto' },
	empty: {},
};
// One case per registry mask shape, stretched and kept, with a shadow (the shadow follows the shape).
for ( const entry of JSON.parse( fs.readFileSync( path.join( PLUGIN, 'includes/data/icon-shapes.json' ), 'utf8' ) ).shapes ) {
	if ( entry.d && entry.surfaces.includes( 'media' ) ) {
		for ( const proportions of [ 'stretch', 'keep' ] ) {
			extras[ `shape-each-${ entry.slug }-${ proportions }` ] = { Shape: { shape: entry.slug, proportions }, BoxShadow: '0 4px 12px', BoxShadowColour: 'rgba(0,0,0,.3)' };
		}
	}
}
for ( const [ label, settings ] of Object.entries( extras ) ) {
	const attrs = toAttrs( {}, FILE );
	for ( const [ base, value ] of Object.entries( settings ) ) {
		attrs[ PREFIX + base ] = value;
	}
	attrSets.push( { label: `extra:${ label }`, attrs, helper: false } );
	attrSets.push( { label: `extra:${ label }`, attrs, helper: true } );
}

// Breakouts: every refused value, in every setting that takes its type of value.
const BREAKOUT_BASES = {
	any: [ 'Height', 'Width', 'MaxWidth', 'MinHeight', 'Ratio', 'OverlayColour', 'OverlayGradient', 'OverlayColourHover', 'Background', 'BorderColour', 'BoxShadow', 'BoxShadowColour', 'OverlayBlend', 'Blend', 'Alignment', 'Padding' ],
	length: [ 'Height', 'Width', 'MaxWidth', 'MinHeight', 'Padding' ],
	colour: [ 'OverlayColour', 'Background', 'BorderColour', 'BoxShadowColour' ],
	gradient: [ 'OverlayGradient', 'OverlayColour', 'BorderColourGradient', 'BorderColourHoverGradient' ],
	url: [],
};
const refused = [ ...breakouts.refuse.any, ...breakouts.refuse.length, ...breakouts.refuse.colour, ...breakouts.refuse.gradient, ...breakouts.refuse.url ];
for ( const [ group, bases ] of Object.entries( BREAKOUT_BASES ) ) {
	breakouts.refuse[ group ].forEach( ( bad, i ) => {
		for ( const base of bases ) {
			const attrs = toAttrs( {}, FILE );
			attrs[ PREFIX + base ] = 'Padding' === base ? { top: bad } : bad;
			if ( base.startsWith( 'BorderColour' ) ) {
				attrs[ PREFIX + 'BorderWidth' ] = { top: 2 };
			}
			attrSets.push( { label: `breakout:${ group }${ i }:${ base }`, attrs, helper: true, bad } );
		}
	} );
}

const atomIds = Object.keys( MEDIA_EMITTERS );
for ( const s of attrSets ) {
	for ( const atom of atomIds ) {
		for ( const wrapper of s.bad ? [ false ] : [ false, true ] ) {
			add( s.label + ( s.helper ? ':helper' : '' ), atom, s.attrs, s.helper, wrapper );
		}
	}
}

// PHP side.
const lengths = [ ...refused, ...breakouts.keep.length, ...breakouts.keep.colour, ...breakouts.keep.gradient, ...breakouts.keep.ratio ];
const tmp = path.join( os.tmpdir(), `sgs-media-emitter-${ process.pid }.json` );
const helperCases = readJson( 'helper-cases.json' ).cases;
fs.writeFileSync( tmp, JSON.stringify( { cases, lengths, helpers: helperCases } ) );
let php;
try {
	php = JSON.parse(
		execFileSync( 'php', [ path.join( HERE, 'php', 'media-emitter-runner.php' ), tmp ], { encoding: 'utf8', maxBuffer: 1 << 28 } )
	);
} finally {
	fs.unlinkSync( tmp );
}

process.stdout.write( 'media emitter parity (PHP sgs_media_atom_<id>_emit vs JS emit)\n\n' );

// 1. Byte parity.
const printedBy = {};
let mismatches = 0;
const shown = [];
for ( const c of cases ) {
	const js = MEDIA_EMITTERS[ c.atom ]( c.slot, c.attrs, c.uid, c.helper );
	const ph = php[ c.id ];
	if ( js !== ph ) {
		mismatches++;
		if ( shown.length < 6 ) {
			shown.push( `${ c.id }\n      JS : ${ js }\n      PHP: ${ ph }` );
		}
	}
	if ( js ) {
		printedBy[ c.atom ] = ( printedBy[ c.atom ] || 0 ) + 1;
	}
}
ck( `PHP and JS print identical CSS in all ${ cases.length } cases (${ atomIds.length } atoms)`, 0 === mismatches, `${ mismatches } differ:\n    ${ shown.join( '\n    ' ) }` );

// 1b. Print order: the JS map lists the atoms in the order PHP sorts them, and a slot's CSS (every atom's string
// joined in that order) is identical on both sides, not merely the same set of strings.
const jsOrder = atomIds.map( ( id ) => id.replace( /-/g, '_' ) );
ck( 'MEDIA_EMITTERS lists the atoms in the order PHP prints them (alphabetical by id)', JSON.stringify( jsOrder ) === JSON.stringify( php.__order ), `JS ${ jsOrder.join( ',' ) } PHP ${ php.__order.join( ',' ) }` );
let orderMismatches = 0;
const slotCaseKeys = new Set( cases.map( ( c ) => c.id.split( '|' ).slice( 0, 1 ).concat( c.id.split( '|' ).slice( 2 ) ).join( '|' ) ) );
for ( const key of slotCaseKeys ) {
	const [ label, h, w ] = [ key.split( '|' )[ 0 ], key.split( '|' )[ 1 ], key.split( '|' )[ 2 ] ];
	const own = cases.filter( ( c ) => c.id.startsWith( label + '|' ) && c.id.endsWith( `|${ h }|${ w }` ) );
	const jsJoined = own.map( ( c ) => MEDIA_EMITTERS[ c.atom ]( c.slot, c.attrs, c.uid, c.helper ) ).join( '' );
	const phpJoined = php.__order
		.map( ( id ) => own.find( ( c ) => c.atom.replace( /-/g, '_' ) === id ) )
		.map( ( c ) => ( c ? php[ c.id ] : '' ) )
		.join( '' );
	if ( jsJoined !== phpJoined ) {
		orderMismatches++;
	}
}
ck( `a slot's CSS joined in print order is identical in PHP and JS (${ slotCaseKeys.size } slots)`, 0 === orderMismatches, `${ orderMismatches } differ` );

// 1c. The helper decision (§7.3): PHP `sgs_media_needs_helper` and JS `needsHelper` agree on every case and match the
// fixture's answer (a case list that is all true, or all false, would pass a broken twin).
const { needsHelper } = await load( 'src/components/media/mediaPreview.js' );
let helperMismatches = 0;
const helperShown = [];
for ( const c of helperCases ) {
	const js = needsHelper( { prefix: c.prefix }, c.attrs, c.motion );
	const ph = php.__helpers[ c.id ];
	if ( js !== ph || js !== c.expected ) {
		helperMismatches++;
		helperShown.push( `${ c.id }: JS ${ js } PHP ${ ph } expected ${ c.expected }` );
	}
}
ck( `PHP and JS decide the helper alike, and as the fixture says, in all ${ helperCases.length } cases`, 0 === helperMismatches, `${ helperMismatches } differ: ${ helperShown.join( '; ' ) }` );
ck( 'the helper cases hold both answers', helperCases.some( ( c ) => c.expected ) && helperCases.some( ( c ) => ! c.expected ) );

// 2. Not vacuous: every atom that paints printed something.
const PAINTS = [ 'sizing', 'layout', 'object-fit', 'focal-point', 'media-padding', 'shape', 'shadow', 'opacity', 'filter', 'overlay', 'svg-presentation' ];
for ( const atom of PAINTS ) {
	ck( `${ atom }: printed CSS in at least 3 cases`, ( printedBy[ atom ] || 0 ) >= 3, `printed in ${ printedBy[ atom ] || 0 }` );
}
for ( const atom of atomIds.filter( ( a ) => ! PAINTS.includes( a ) ) ) {
	ck( `${ atom }: prints no CSS of its own`, ! printedBy[ atom ], `printed in ${ printedBy[ atom ] }` );
}

// 3. The sizing emitter equals the fixture's declarations.
const parse = ( css ) => {
	const out = {};
	const deviceOf = ( q ) => ( q.includes( '1023' ) ? 'tablet' : q.includes( '767' ) ? 'mobile' : 'hover' );
	const re = /(?:@media\(([^)]*)\)\{)?([^{}@]+)\{([^{}]*)\}\}?/g;
	let m;
	while ( ( m = re.exec( css ) ) !== null ) {
		const device = m[ 1 ] ? deviceOf( m[ 1 ] ) : 'desktop';
		if ( 'hover' === device ) {
			continue;
		}
		out[ m[ 2 ] ] ??= {};
		out[ m[ 2 ] ][ device ] ??= {};
		for ( const decl of m[ 3 ].split( ';' ).filter( Boolean ) ) {
			const i = decl.indexOf( ':' );
			out[ m[ 2 ] ][ device ][ decl.slice( 0, i ) ] = decl.slice( i + 1 );
		}
	}
	return out;
};
let fixtureFails = 0;
for ( const c of [ ...sizing.cases, ...sizing.responsive ] ) {
	const split = !! ( c.declarations.layout || c.declarations.surface );
	const slot = { prefix: PREFIX, wrapper: split };
	const css = MEDIA_EMITTERS.sizing( slot, toAttrs( c.settings, c.file || FILE ), 'u', c.helper );
	const got = parse( css );
	const tiered = ( d ) => ( 'desktop' in d || 'tablet' in d || 'mobile' in d ? d : { desktop: d } );
	const want = {};
	if ( split ) {
		want[ '.u' ] = tiered( c.declarations.layout || {} );
		want[ '.u .sgs-media-box' ] = tiered( c.declarations.surface || {} );
	} else {
		want[ '.u' ] = tiered( c.declarations.root );
	}
	const norm = ( o ) =>
		JSON.stringify(
			Object.keys( o )
				.sort()
				.map( ( sel ) => [ sel, [ 'desktop', 'tablet', 'mobile' ].map( ( d ) => Object.entries( o[ sel ][ d ] || {} ).sort() ).filter( ( x ) => x.length ) ] )
				.filter( ( [ , devs ] ) => devs.length )
		);
	if ( norm( got ) !== norm( want ) ) {
		fixtureFails++;
		process.stdout.write( `    ${ c.id }\n      got : ${ css }\n      want: ${ JSON.stringify( want ) }\n` );
	}
}
ck( `sizing emitter equals sizing-cases.json declarations (${ sizing.cases.length + sizing.responsive.length } cases)`, 0 === fixtureFails );

// 4. Value helpers: PHP equals JS, refused values come back empty, kept values survive.
const php_len = php.__lengths;
let helperFails = 0;
lengths.forEach( ( raw, i ) => {
	const js = {
		length: values.mediaLength( raw, [ 'auto', 'none' ] ),
		colour: values.mediaColour( raw ),
		gradient: values.mediaGradient( raw ),
		url: values.mediaUrl( raw ),
	};
	for ( const k of Object.keys( js ) ) {
		if ( js[ k ] !== php_len[ i ][ k ] ) {
			helperFails++;
			process.stdout.write( `    value ${ JSON.stringify( raw ) } ${ k }: JS ${ JSON.stringify( js[ k ] ) } PHP ${ JSON.stringify( php_len[ i ][ k ] ) }\n` );
		}
	}
} );
ck( `value helpers: PHP equals JS for ${ lengths.length } values x 4 types`, 0 === helperFails );

const refuseTypes = { any: [ 'length', 'colour', 'gradient', 'url' ], length: [ 'length' ], colour: [ 'colour' ], gradient: [ 'gradient' ], url: [ 'url' ] };
let keptWrong = 0;
for ( const [ group, types ] of Object.entries( refuseTypes ) ) {
	for ( const bad of breakouts.refuse[ group ] ) {
		const i = lengths.indexOf( bad );
		for ( const t of types ) {
			if ( '' !== php_len[ i ][ t ] ) {
				keptWrong++;
				process.stdout.write( `    ${ t } helper kept ${ JSON.stringify( bad ) } as ${ JSON.stringify( php_len[ i ][ t ] ) }\n` );
			}
		}
	}
}
ck( 'breakouts.json: every refused value comes back empty from its helper', 0 === keptWrong );

let lostKeep = 0;
for ( const v of breakouts.keep.length ) {
	if ( values.mediaLength( v, [ 'auto', 'none' ] ) !== v ) {
		lostKeep++;
		process.stdout.write( `    length lost ${ JSON.stringify( v ) }\n` );
	}
}
for ( const v of breakouts.keep.gradient ) {
	if ( values.mediaGradient( v ) !== v ) {
		lostKeep++;
	}
}
for ( const v of breakouts.keep.colour ) {
	if ( '' === values.mediaColour( v ) ) {
		lostKeep++;
		process.stdout.write( `    colour lost ${ JSON.stringify( v ) }\n` );
	}
}
for ( const v of breakouts.keep.ratio.filter( ( r ) => 'natural' !== r ) ) {
	if ( values.mediaRatio( v ) !== v ) {
		lostKeep++;
	}
}
ck( 'breakouts.json: every kept length, colour, gradient and ratio survives', 0 === lostKeep );

// 5. No emitter output carries a refused value.
let leaked = 0;
for ( const c of cases.filter( ( x ) => x.label.startsWith( 'breakout:' ) ) ) {
	const bad = attrSets.find( ( s ) => s.label === c.label.replace( ':helper', '' ) ).bad;
	const css = php[ c.id ] || '';
	const depth = [ ...css ].reduce( ( d, ch ) => d + ( '{' === ch ? 1 : '}' === ch ? -1 : 0 ), 0 );
	if ( ( css && bad.length > 3 && css.includes( bad ) ) || 0 !== depth || /<\/?script|javascript:|expression\(/i.test( css ) ) {
		leaked++;
		if ( leaked < 5 ) {
			process.stdout.write( `    ${ c.id } printed ${ css }\n` );
		}
	}
}
ck( `no emitter prints a refused value or unbalanced braces (${ cases.filter( ( x ) => x.label.startsWith( 'breakout:' ) ).length } cases)`, 0 === leaked );

process.stdout.write( `\nprinted CSS in ${ Object.values( printedBy ).reduce( ( a, b ) => a + b, 0 ) } of ${ cases.length } cases\n` );
if ( fail ) {
	process.stdout.write( `\nFAIL - ${ fail } problem(s)\n` );
	process.exit( 1 );
}
process.stdout.write( '\nOK\n' );
