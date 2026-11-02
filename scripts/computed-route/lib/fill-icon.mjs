// Icons for Fill (FR-48-39, the inline-SVG part): the one writer for a whole `<svg>` subtree. The draft's SVG reaches Fill
// as markup with its painted values resolved (lib/fill-read.mjs `svg`: the computed fill, stroke and stroke width on each
// drawing element, a colour equal to the icon's own colour as `currentColor`), and the block that draws it is `sgs/icon`:
// The source is decided from the draft's mark alone, never from the iconSource the node already holds (a skeleton-made brand
// icon, or a value an earlier write left):
//   1. a mark that is a registry brand glyph with its own SVG is that brand (iconSource "brand" and its brandName);
//   2. a stroke mark that is a Lucide icon drawn the way Lucide draws it (2 wide, round caps and joins) is that icon
//      (iconSource "lucide" and its iconName);
//   3. anything else is the client's own mark: iconSource "custom" and the sanitised markup as iconSvg, with iconFill for a
//      filled mark; a link binding the node holds stays.
// One exception to "decided from the mark alone": a node the skeleton made a Site Info brand row (a brandName with a link
// bound to `sgs/site-info`; its iconSource may already have been turned to another value by an earlier write of the same
// run, so it is not part of the test) stays that brand, iconSource "brand" written back, when the draft mark is that brand by the registry: its glyph, the host
// of the address the mark links to, or its name in the mark's title or label or in the aria-label the node already holds
// from the draft's link (a draft's icon links often point at `/` or `#`). The draft's own drawing of the brand is
// named in a note, never a custom override that would drop the Site Info-driven glyph; a mark that is not that brand is
// case 3 (a bound row is never re-pointed at another brand's glyph).
// The sanitiser is the block's own: the tags and attributes `sgs_svg_kses_allowed_tags()` keeps, read from
// plugins/sgs-blocks/includes/helpers-svg-kses.php; a tag it would drop (script, foreignObject, style, animation) is a named
// UNMAPPED row and is left out of the markup, never written for the page to discard.
// Returns { writes: [{ attr, value, merge }], unmapped: [{ property, value, slot, reason }], notes }.
import fs from 'node:fs';
import path from 'node:path';
import { SaxesParser } from 'saxes';
import { REPO } from './capabilities.mjs';
import { brandBySlug, brandOwnsAddress } from './brand-registry.mjs';

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it).
export const COVERAGE_WRITES = [
	'svg:a',
	'svg:circle',
	'svg:clipPath',
	'svg:defs',
	'svg:desc',
	'svg:ellipse',
	'svg:feBlend',
	'svg:feColorMatrix',
	'svg:feComposite',
	'svg:feDisplacementMap',
	'svg:feGaussianBlur',
	'svg:feMerge',
	'svg:feMergeNode',
	'svg:feOffset',
	'svg:filter',
	'svg:g',
	'svg:image',
	'svg:line',
	'svg:linearGradient',
	'svg:marker',
	'svg:mask',
	'svg:path',
	'svg:pattern',
	'svg:polygon',
	'svg:polyline',
	'svg:radialGradient',
	'svg:rect',
	'svg:stop',
	'svg:svg',
	'svg:symbol',
	'svg:text',
	'svg:textPath',
	'svg:title',
	'svg:tspan',
	'svg:use',
];

const PLUGIN = path.join( REPO, 'plugins', 'sgs-blocks', 'includes' );
export const KSES_FILE = path.join( PLUGIN, 'helpers-svg-kses.php' );
export const LUCIDE_FILE = path.join( PLUGIN, 'lucide-icons.php' );
export const BRAND_FILE = path.join( PLUGIN, 'data', 'brand-registry.json' );

const SHAPES = [ 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon' ];
const GEOMETRY = [ 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'points' ];
// What the draft's CSS decided that the markup no longer has a stylesheet for.
const DROPPED_ATTRS = [ 'class', 'style' ];

// The allowed tags and attributes of the block's sanitiser: { tag(lower case): Set(attribute, lower case) }, parsed from the
// PHP source so the writer keeps exactly what the page keeps. `$core_attrs` and `$presentation_attrs` are the shared sets.
let ksesCache = null;
export function allowedSvg( file = KSES_FILE ) {
	if ( ksesCache?.file === file ) {
		return ksesCache.allowed;
	}
	const src = fs.readFileSync( file, 'utf8' );
	const keys = ( text ) => [ ...text.matchAll( /'([A-Za-z0-9:_-]+)'\s*=>\s*true/g ) ].map( ( m ) => m[ 1 ].toLowerCase() );
	const [ head, body ] = src.split( /return\s+array\(/ );
	const presentation = new Set( keys( head.slice( head.indexOf( '$presentation_attrs' ), head.indexOf( '$core_attrs' ) ) ) );
	const core = new Set( [ ...presentation, ...keys( head.slice( head.indexOf( '$core_attrs' ) ) ) ] );
	const allowed = {};
	let tag = null;
	for ( const line of body.split( '\n' ) ) {
		const t = /^\t\t'([a-z0-9]+)'\s*=>/.exec( line );
		if ( t ) {
			tag = t[ 1 ];
			allowed[ tag ] = new Set();
		}
		if ( tag ) {
			keys( line ).forEach( ( k ) => allowed[ tag ].add( k ) );
			/\$core_attrs\b/.test( line ) && core.forEach( ( k ) => allowed[ tag ].add( k ) );
			/\$presentation_attrs\b/.test( line ) && presentation.forEach( ( k ) => allowed[ tag ].add( k ) );
		}
	}
	ksesCache = { file, allowed };
	return allowed;
}

const esc = ( s ) => String( s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( /"/g, '&quot;' );

// Markup to a tree of { name, attrs, children, text } (XML: the draft's SVG is serialised as XML), or null when it is not well-formed.
function parseTree( markup ) {
	const parser = new SaxesParser( { xmlns: false } );
	const root = { children: [] };
	const stack = [ root ];
	let bad = false;
	parser.on( 'error', () => ( bad = true ) );
	parser.on( 'opentag', ( n ) => {
		const el = { name: n.name, attrs: { ...n.attributes }, children: [], text: '' };
		stack[ stack.length - 1 ].children.push( el );
		stack.push( el );
	} );
	parser.on( 'closetag', () => stack.pop() );
	parser.on( 'text', ( t ) => ( stack[ stack.length - 1 ].text += t ) );
	parser.write( markup ).close();
	return bad || 1 !== root.children.length ? null : root.children[ 0 ];
}

const render = ( el ) => `<${ el.name }${ Object.entries( el.attrs ).map( ( [ k, v ] ) => ` ${ k }="${ esc( v ) }"` ).join( '' ) }>${ el.text.trim() ? esc( el.text ) : '' }${ el.children.map( render ).join( '' ) }</${ el.name }>`;

// The tree kept by the block's sanitiser: drops tags it would drop (collected in `refused`, once each), the attributes it would
// drop, the draft's class and style (their effect is already in the resolved paint attributes) and a root width and height
// (the block sizes the icon). An address other than an in-document `#id` is dropped.
function clean( el, allowed, refused, top = true ) {
	const lower = el.name.toLowerCase();
	if ( ! allowed[ lower ] ) {
		refused.add( el.name );
		return null;
	}
	const attrs = {};
	for ( const [ k, v ] of Object.entries( el.attrs ) ) {
		const name = k.toLowerCase();
		const isRef = /^(?:xlink:)?href$/.test( name );
		if ( ! allowed[ lower ].has( name ) || DROPPED_ATTRS.includes( name ) || name.startsWith( 'on' ) || ( isRef && ! /^#/.test( v ) ) || ( top && [ 'width', 'height' ].includes( name ) ) ) {
			continue;
		}
		attrs[ k ] = String( v ).replace( /url\(\s*["']?(#[^)"']*?)["']?\s*\)/g, 'url($1)' );
	}
	return { ...el, attrs, children: el.children.map( ( c ) => clean( c, allowed, refused, false ) ).filter( Boolean ) };
}

// The drawing elements of a tree in document order.
const shapesOf = ( el ) => [ ...( SHAPES.includes( el.name ) ? [ el ] : [] ), ...el.children.flatMap( shapesOf ) ];

// The shape signature of a mark: each drawing element's tag and geometry, so the same drawing matches however it is painted.
export function signature( root ) {
	return shapesOf( root ).map( ( s ) => `${ s.name }${ GEOMETRY.filter( ( g ) => g in s.attrs ).map( ( g ) => `${ g }=${ String( s.attrs[ g ] ).trim().replace( /\s+/g, ' ' ) }` ).join( ',' ) }` ).join( '|' );
}

let lucideCache = null;
// { signature: icon name } for every Lucide icon the block ships, read from includes/lucide-icons.php.
export function lucideSignatures( file = LUCIDE_FILE ) {
	if ( lucideCache?.file === file ) {
		return lucideCache.map;
	}
	const map = new Map();
	for ( const m of fs.readFileSync( file, 'utf8' ).matchAll( /^\t\t\t'([a-z0-9-]+)'\s*=>\s*'(?:<!--.*?-->)?(<svg.*?<\/svg>)',$/gm ) ) {
		const tree = parseTree( m[ 2 ].replace( /\\'/g, "'" ) );
		const sig = tree ? signature( tree ) : '';
		sig && ! map.has( sig ) && map.set( sig, m[ 1 ] );
	}
	lucideCache = { file, map };
	return map;
}

// { signature: brand slug } for each registry brand whose glyph is its own SVG, and { slug: signature } the other way round.
export function brandSignatures( file = BRAND_FILE ) {
	const bySig = new Map();
	const bySlug = new Map();
	for ( const b of JSON.parse( fs.readFileSync( file, 'utf8' ) ).brands || [] ) {
		const tree = b.glyph?.svg ? parseTree( b.glyph.svg ) : null;
		if ( tree ) {
			bySig.set( signature( tree ), b.slug );
			bySlug.set( b.slug, signature( tree ) );
		}
	}
	return { bySig, bySlug };
}

const num = ( v ) => ( Number.isFinite( parseFloat( v ) ) ? parseFloat( v ) : null );
const paintOf = ( s ) => ( { fill: s.attrs.fill ?? 'black', stroke: s.attrs.stroke ?? 'none' } );

// The kind of mark: 'stroke' (every drawing element is stroked and unfilled), 'filled' (none is stroked, every one is
// filled) or 'mixed'; and whether it is drawn the way Lucide draws (stroke width 2, round caps and joins).
export function markKind( root ) {
	const shapes = shapesOf( root );
	const paints = shapes.map( paintOf );
	const stroke = shapes.length && paints.every( ( p ) => 'none' === p.fill && 'none' !== p.stroke );
	const filled = shapes.length && paints.every( ( p ) => 'none' === p.stroke && 'none' !== p.fill );
	const lucideStyle = !! stroke && shapes.every( ( s ) => 2 === num( s.attrs[ 'stroke-width' ] ) && 'round' === s.attrs[ 'stroke-linecap' ] && 'round' === s.attrs[ 'stroke-linejoin' ] );
	return { kind: stroke ? 'stroke' : filled ? 'filled' : 'mixed', lucideStyle };
}

// Which side of the label the draft draws the icon on (`svg.position`, read from where each paints), as the block's
// `iconPosition` setting when the block declares one: written when it differs from what the node holds or the setting's
// default; a position the setting's enum (when it lists values) does not hold is a named row.
function iconPosition( { svg, schema, attributes, out } ) {
	const spec = schema?.iconPosition;
	if ( ! svg?.position || ! spec ) {
		return;
	}
	if ( Array.isArray( spec.enum ) && ! spec.enum.includes( svg.position ) ) {
		out.unmapped.push( { property: 'svg', value: svg.position, slot: '', reason: `the draft draws the icon ${ svg.position } the label, and iconPosition holds only ${ spec.enum.join( ', ' ) }` } );
		return;
	}
	if ( svg.position !== ( attributes.iconPosition ?? spec.default ) ) {
		out.writes.push( { attr: 'iconPosition', value: svg.position, merge: 'replace' } );
		out.notes.push( `the draft draws the icon ${ svg.position } the label: iconPosition ${ svg.position }` );
	}
}

// The brand a skeleton-made Site Info row stands for (its brandName), or null for any other node.
const boundBrand = ( attributes ) => ( attributes.brandName && Object.values( attributes.metadata?.bindings || {} ).some( ( b ) => 'sgs/site-info' === b?.source ) ? String( attributes.brandName ) : null );

// Whether the draft mark is the registry brand `slug`: the mark links to an address the brand owns, or its title, label or the node's aria-label names it.
function markIsBrand( slug, tree, href, ariaLabel = '' ) {
	const brand = brandBySlug( slug );
	if ( ! brand ) {
		return false;
	}
	if ( brandOwnsAddress( brand, href ) ) {
		return true;
	}
	const names = [ brand.slug, brand.label ].filter( Boolean ).map( ( n ) => String( n ).toLowerCase() );
	const titles = [];
	const collect = ( el ) => {
		'title' === el.name.toLowerCase() && titles.push( el.text );
		el.children.forEach( collect );
	};
	collect( tree );
	return [ tree.attrs[ 'aria-label' ], ariaLabel, ...titles ].filter( Boolean ).some( ( t ) => names.includes( String( t ).trim().toLowerCase() ) );
}

// The settings iconDecisions can write: the icon's source, its brand, its Lucide name, its own markup, whether the markup is
// filled and which side of the label it sits. The decisions write nothing for a block that declares no `iconSvg`, and only
// the settings the block declares; lib/content-coverage.mjs asks here which settings a re-clone writes.
export const ICON_SETTINGS = [ 'iconSource', 'brandName', 'iconName', 'iconSvg', 'iconFill', 'iconPosition' ];
export const iconSettings = ( schema ) => ( schema && 'iconSvg' in schema ? ICON_SETTINGS.filter( ( a ) => a in schema ) : [] );

// svg: the element's read ({ markup, position }) or null. schema: the block's settings. attributes: what the node already holds.
// href: the address the mark links to in the draft (or ''), the evidence a Site Info brand row is that brand.
export function iconDecisions( { svg, schema, attributes = {}, allowed = null, href = '' } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	if ( ! svg?.markup || ! iconSettings( schema ).length ) {
		return out;
	}
	const tree = parseTree( svg.markup );
	if ( ! tree ) {
		out.unmapped.push( { property: 'svg', value: String( svg.markup ).slice( 0, 60 ), slot: '', reason: 'the draft SVG is not well-formed markup, so no icon is written' } );
		return out;
	}
	const refused = new Set();
	const kept = clean( tree, allowed || allowedSvg(), refused );
	for ( const name of [ ...refused ].sort() ) {
		out.unmapped.push( { property: 'svg', value: `<${ name }>`, slot: '', reason: `<${ name }> is not kept by the icon's sanitiser (sgs_svg_kses_allowed_tags), so it is left out of the written markup` } );
	}
	if ( ! kept || ! shapesOf( kept ).length ) {
		out.unmapped.push( { property: 'svg', value: '<svg>', slot: '', reason: 'the draft SVG has no drawing element the icon keeps (path, circle, ellipse, rect, line, polyline, polygon)' } );
		return out;
	}
	const sig = signature( kept );
	const { kind, lucideStyle } = markKind( kept );
	// Only a setting the node's own block declares is written; any other is a named row (a button drawing an inline icon
	// holds its own icon settings, not the icon block's).
	// `decided` holds every value the draft's mark settles, written or already held, so no styling answer changes it.
	out.decided = {};
	const put = ( attr, value ) => {
		if ( ! ( attr in schema ) ) {
			out.unmapped.push( { property: 'svg', value: attr, slot: '', reason: `the block declares no ${ attr }, so the draft icon's ${ attr } is not written` } );
			return;
		}
		out.decided[ attr ] = value;
		if ( JSON.stringify( attributes[ attr ] ) !== JSON.stringify( value ) ) {
			out.writes.push( { attr, value, merge: 'replace' } );
		}
	};
	const bound = boundBrand( attributes );
	const keepsBrand = bound && ( brandSignatures().bySig.get( sig ) === bound || markIsBrand( bound, tree, href, attributes.ariaLabel ) );
	const brand = bound ? null : brandSignatures().bySig.get( sig );
	const lucide = lucideStyle ? lucideSignatures().get( sig ) : null;
	if ( keepsBrand ) {
		put( 'iconSource', 'brand' );
		brandSignatures().bySlug.get( bound ) !== sig && out.notes.push( `the draft draws its own ${ bound } glyph; the icon is bound to Site Info, so it stays the ${ bound } brand icon and the registry glyph shows` );
	} else if ( brand ) {
		put( 'iconSource', 'brand' );
		put( 'brandName', brand );
	} else if ( lucide ) {
		put( 'iconSource', 'lucide' );
		put( 'iconName', lucide );
	} else {
		put( 'iconSource', 'custom' );
		put( 'iconSvg', render( kept ) );
		'filled' === kind && 'iconFill' in schema && put( 'iconFill', true );
		'mixed' === kind && out.notes.push( 'the draft SVG mixes stroked and filled shapes, so it is written as the client\'s own mark with its painted values kept' );
	}
	iconPosition( { svg, schema, attributes, out } );
	return out;
}
