// Scrollbar colours for Fill (FR-48-8, the scrollbar part): the draft's scrollbar colours (a scroller's `scrollbar-color`,
// and the `::-webkit-scrollbar-*` parts it declares beside it) belong to the theme's existing scrollbar tokens
// (settings.custom.scrollbar.thumb, .thumbOnDark and .track, Spec 32 FR-32-26, painted by assets/css/scrollbars.css), never to
// a per-block setting: every scroller on the site takes them. The thumb token follows the ground the scroller sits on (a
// dark ground takes thumbOnDark). A colour the site's token already gives is a note; a different one is written as a key of
// theme-snapshot.patch.json, a palette colour as `var(--wp--preset--color--<slug>)` and any other as a hex literal. The
// scrollbar's width is one value for the whole site (the theme leaves it `auto`), so a draft scroller asking another width
// is a named UNMAPPED row.
// Returns { notes, unmapped } and writes into `sink` (lib/fill-state-tokens.mjs::createPatch).
import { parseColour, deltaE, snapColour, toHex, COLOUR_DE } from './normalise.mjs';
import { createPatch, conflictRow } from './fill-state-tokens.mjs';

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it).
export const COVERAGE_WRITES = [
	'css-pseudo-element:-webkit-scrollbar',
	'css-pseudo-element:-webkit-scrollbar-thumb',
	'css-pseudo-element:-webkit-scrollbar-track',
];

// A computed `scrollbar-color` ("rgba(231, 215, 104, 0.75) rgba(0, 0, 0, 0)") as { thumb, track } colours, or null for `auto`.
export function splitScrollbarColour( value ) {
	const parts = String( value ?? '' ).match( /rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi );
	return parts && 2 === parts.length ? { thumb: parseColour( parts[ 0 ] ), track: parseColour( parts[ 1 ] ) } : null;
}

// Whether a ground colour is dark (relative luminance under 0.4); a transparent ground is not a ground.
export function isDark( ground ) {
	const c = parseColour( ground );
	if ( ! c || c.a < 0.5 ) {
		return false;
	}
	const lin = ( v ) => ( ( v /= 255 ) <= 0.03928 ? v / 12.92 : ( ( v + 0.055 ) / 1.055 ) ** 2.4 );
	return 0.2126 * lin( c.r ) + 0.7152 * lin( c.g ) + 0.0722 * lin( c.b ) < 0.4;
}

// A token value as a colour: `var(--wp--preset--color--<slug>)` through the palette, else the literal.
function tokenColour( value, snapshot ) {
	const slug = /^var\(--wp--preset--color--([a-z0-9-]+)\)$/.exec( String( value ?? '' ).trim() )?.[ 1 ];
	return slug ? snapshot.palette.find( ( t ) => t.slug === slug )?.colour ?? null : parseColour( value );
}

const same = ( a, b ) => !! a && !! b && deltaE( a, b ) <= COLOUR_DE && Math.abs( a.a - b.a ) <= 0.02;
const asToken = ( c, snapshot ) => {
	const s = snapColour( toHex( c ), snapshot );
	return 'slug' === s.form ? `var(--wp--preset--color--${ s.value })` : s.value;
};

// items: [{ from: { node, block, slot, index }, color, width, ground, thumbPart, trackPart }] read from the draft's scrollers.
// snapshot: lib/normalise.mjs::loadSnapshot. site: the client's current settings.custom.scrollbar (or undefined).
export function scrollbarTokens( { items, snapshot, site = {}, sink } ) {
	const out = { notes: [], unmapped: [] };
	for ( const it of items ) {
		const read = splitScrollbarColour( it.color );
		if ( ! read ) {
			continue;
		}
		const where = `${ it.from.node } ${ it.from.slot || 'root' }`;
		const thumbKey = isDark( it.ground ) ? 'thumbOnDark' : 'thumb';
		for ( const [ key, colour ] of [ [ thumbKey, read.thumb ], [ 'track', read.track ] ] ) {
			if ( ! colour ) {
				continue;
			}
			// A transparent track is the theme's own (`track: transparent`).
			const current = 'transparent' === String( site[ key ] ?? '' ).trim() ? { r: 0, g: 0, b: 0, a: 0 } : tokenColour( site[ key ], snapshot );
			if ( 'track' === key && 0 === colour.a && ( ! site.track || 'transparent' === site.track ) ) {
				continue;
			}
			if ( same( colour, current ) ) {
				out.notes.push( `${ where }: the draft scrollbar ${ 'track' === key ? 'track' : 'thumb' } ${ toHex( colour ) } is the theme's scrollbar ${ key } token already` );
			} else {
				sink.set( [ 'settings', 'custom', 'scrollbar', key ], asToken( colour, snapshot ), { ...it.from, state: 'scrollbar' } );
			}
		}
		const part = splitPart( it );
		if ( part ) {
			out.notes.push( `${ where }: the draft's ::-webkit-scrollbar parts paint ${ part } beside its scrollbar-color; Chrome 121+ uses scrollbar-color, which is the value written` );
		}
		if ( it.width && ! [ 'auto', 'none' ].includes( it.width ) ) {
			out.unmapped.push( { node: it.from.node, block: it.from.block, slot: it.from.slot, property: 'scrollbar-width', value: it.width, reason: 'scrollbar width is one value for the whole site (the theme leaves it auto); a scroller asking another width has no setting' } );
		}
	}
	return out;
}

// The scrollbar tokens of a whole surface: the scrollers read at the widest width, once each, as a patch of the client's
// theme-snapshot.json. Returns { patch, entries, notes, unmapped }.
export function scrollbarPatch( { nodes, flat, refOf, reads, snapshot, site } ) {
	const sink = createPatch();
	const items = [];
	const seen = new Set();
	for ( const rec of nodes ) {
		for ( const t of rec.targets ) {
			const sb = reads.widths?.[ 1440 ]?.[ t.id ]?.scrollbar;
			const key = JSON.stringify( sb );
			if ( sb && ! seen.has( key ) ) {
				seen.add( key );
				items.push( { from: { node: refOf( flat[ rec.index ] ), block: rec.name, slot: t.slot, index: rec.index }, ...sb } );
			}
		}
	}
	const r = scrollbarTokens( { items, snapshot, site: site || {}, sink } );
	return { patch: sink.patch, entries: sink.entries, notes: r.notes, unmapped: [ ...r.unmapped, ...sink.conflicts.map( conflictRow ) ] };
}

// Two snapshot patches as one (the keys are disjoint paths of the same object).
export function mergePatch( a, b ) {
	const out = { ...a };
	for ( const [ k, v ] of Object.entries( b ) ) {
		out[ k ] = v && 'object' === typeof v && out[ k ] && 'object' === typeof out[ k ] ? mergePatch( out[ k ], v ) : v;
	}
	return out;
}

// The webkit parts' colours when they differ from the scrollbar-color's, as text; null when they agree or are absent.
function splitPart( it ) {
	const read = splitScrollbarColour( it.color );
	const [ thumb, track ] = [ parseColour( it.thumbPart ?? '' ), parseColour( it.trackPart ?? '' ) ];
	const differs = ( a, b ) => !! a && ( ! b || ! same( a, b ) );
	return differs( thumb, read?.thumb ) || ( track && differs( track, read?.track ) ) ? `${ it.thumbPart ?? 'no thumb' } on ${ it.trackPart ?? 'no track' }` : null;
}
