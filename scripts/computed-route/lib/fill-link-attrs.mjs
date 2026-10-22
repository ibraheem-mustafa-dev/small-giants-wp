// The attributes of a draft link beyond its address (FR-47-4 content): where it opens (target), its rel, the element's id
// and its aria-label. Each goes to the block's own setting when the block has one, and to a named UNMAPPED row when it
// has none (never dropped, never written as inline HTML). The settings come from the block's own schema and supports
// (block.json), and from calibration's `link` entries whose DOM attribute is `target`:
//   target  a boolean "opens in new tab" setting (`...NewTab`) or a string target setting (`...Target`, `_blank` when its enum allows it)
//   rel     a string setting named `rel` or `...Rel`
//   id      the `anchor` attribute, when the block declares supports.anchor (WordPress stores a block's id there)
//   aria-label  a string setting named `ariaLabel` or `...AriaLabel`
// The setting that belongs to a link is the one sharing its address setting's prefix (`linkUrl` takes `linkTarget`, `ctaUrl`
// takes `ctaTarget`); a bare `url` takes the block's only candidate. rel tokens the block adds itself for a new tab
// (noopener, noreferrer) are not a difference. Facts per slot: { target, rel, id, ariaLabel } (null where the draft has none).
import fs from 'node:fs';
import path from 'node:path';
import { BLOCKS_DIR, LOOSE } from './resolve.mjs';

export const COVERAGE_WRITES = [
	'aria-attr:aria-label',
	'html-attr:a.rel',
	'html-attr:a.target',
	'html-attr:global.id',
];

const same = ( a, b ) => LOOSE( a ) === LOOSE( b );
const unset = ( v ) => undefined === v || null === v || '' === String( v ).trim() || false === v;
const typeOf = ( def ) => [].concat( def?.type || [] );
const BLOCK_ADDED_REL = [ 'noopener', 'noreferrer' ];

let supportsIndex = null;
// Whether a block declares supports.anchor, read from its block.json.
export function blockSupportsAnchor( slug ) {
	if ( ! supportsIndex ) {
		supportsIndex = {};
		for ( const dir of fs.readdirSync( BLOCKS_DIR ) ) {
			const f = path.join( BLOCKS_DIR, dir, 'block.json' );
			if ( fs.existsSync( f ) ) {
				const j = JSON.parse( fs.readFileSync( f, 'utf8' ) );
				supportsIndex[ j.name ] = !! j.supports?.anchor;
			}
		}
	}
	return !! supportsIndex[ slug ];
}

// The one schema setting among `pattern` matches that belongs to the link whose address setting is `hrefAttr`: the
// matches sharing its prefix, else (a bare address setting) the only match. Returns { attr } or { gap: reason }.
function pick( schema, pattern, hrefAttr ) {
	const all = Object.keys( schema || {} ).filter( ( k ) => pattern.test( k ) );
	const prefix = String( hrefAttr || '' ).replace( /(Url|Href|Link)$/i, '' ).toLowerCase();
	const own = prefix ? all.filter( ( k ) => k.toLowerCase().startsWith( prefix ) ) : all;
	if ( 1 === own.length ) {
		return { attr: own[ 0 ] };
	}
	return { gap: own.length ? `${ own.join( ', ' ) } all fit this link` : 'the block has no such setting' };
}

const targetWrite = ( schema, attr ) => {
	const def = schema?.[ attr ];
	if ( typeOf( def ).includes( 'boolean' ) ) {
		return { attr, value: true, merge: 'replace' };
	}
	if ( typeOf( def ).includes( 'string' ) && ( ! def.enum || def.enum.includes( '_blank' ) ) ) {
		return { attr, value: '_blank', merge: 'replace' };
	}
	return null;
};

// writes, unmapped and notes for the link attributes of one block. calibration: the block's cache file; schema:
// block.json attributes; anchor: whether supports.anchor is declared; attributes: what the node already holds; slots:
// { path: { target, rel, id, ariaLabel } }.
export function linkAttrDecisions( { calibration, schema = {}, anchor = false, attributes = {}, slots = {} } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const link = calibration?.link || {};
	const gap = ( property, value, slot, reason ) => out.unmapped.push( { property, value, slot, reason } );
	const put = ( w, what ) => {
		if ( unset( attributes[ w.attr ] ) ) {
			out.writes.push( w );
		} else if ( attributes[ w.attr ] !== w.value ) {
			out.notes.push( `${ w.attr } holds ${ JSON.stringify( attributes[ w.attr ] ) }; the draft ${ what } is ${ JSON.stringify( w.value ) }` );
		}
	};
	const hrefEntries = Object.entries( link ).filter( ( [ , d ] ) => 'target' !== d.attr );
	const onlyOnePath = new Set( hrefEntries.map( ( [ , d ] ) => d.path ) ).size === 1;
	for ( const [ slot, f ] of Object.entries( slots ) ) {
		if ( ! f ) {
			continue;
		}
		const hrefAttr = ( hrefEntries.find( ( [ , d ] ) => same( d.path, slot ) ) || ( onlyOnePath && '' === slot ? hrefEntries[ 0 ] : null ) )?.[ 0 ];
		const blank = '_blank' === f.target;
		if ( blank ) {
			const calibrated = Object.entries( link ).find( ( [ , d ] ) => 'target' === d.attr && same( d.path, slot ) )?.[ 0 ];
			const found = calibrated ? { attr: calibrated } : pick( schema, /(NewTab|Target)$/i, hrefAttr );
			const w = found.attr ? targetWrite( schema, found.attr ) : null;
			w ? put( w, 'target' ) : gap( 'target', '_blank', slot, `no setting of the block opens "${ slot }" in a new tab (${ found.gap || `${ found.attr } takes neither a boolean nor _blank` })` );
		}
		const rel = String( f.rel || '' ).split( /\s+/ ).filter( ( t ) => t && ! ( blank && BLOCK_ADDED_REL.includes( t.toLowerCase() ) ) );
		if ( rel.length ) {
			const found = pick( schema, /^(rel|.*Rel)$/, hrefAttr );
			found.attr ? put( { attr: found.attr, value: rel.join( ' ' ), merge: 'replace' }, 'rel' ) : gap( 'rel', rel.join( ' ' ), slot, `no setting of the block holds the rel of "${ slot }" (${ found.gap })` );
		}
		if ( f.id ) {
			if ( '' === slot && anchor ) {
				put( { attr: 'anchor', value: f.id, merge: 'replace' }, 'id' );
			} else {
				gap( 'id', f.id, slot, '' === slot ? 'the block does not declare supports.anchor, so no setting holds its id' : `an id on the nested element "${ slot }" has no setting (anchor belongs to the block's root)` );
			}
		}
		if ( f.ariaLabel ) {
			const found = '' === slot && schema.ariaLabel ? { attr: 'ariaLabel' } : pick( schema, /^(aria[-_]?label|.*AriaLabel)$/i, hrefAttr );
			found.attr ? put( { attr: found.attr, value: f.ariaLabel, merge: 'replace' }, 'aria-label' ) : gap( 'aria-label', f.ariaLabel, slot, `no setting of the block holds the aria-label of "${ slot }" (${ found.gap })` );
		}
	}
	return out;
}
