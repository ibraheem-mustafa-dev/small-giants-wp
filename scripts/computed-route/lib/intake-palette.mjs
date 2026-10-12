// The palette role proposal for Bean's intake review (Spec 48 FR-48-31, §11 FR-33-2, R-47-7). Declared colour tokens
// (lib/tokens.mjs) are matched to the draft's colours by exact normalised value (alpha-aware) and given a proposed
// palette slug from two signals: the token's name and where its value is used. Near-identical tokens dedupe at
// CIEDE2000 ΔE ≤ 1 with alpha as its own axis (FR-33-2) and every merge is recorded. A token nothing uses is listed in
// `unused` and gets no role; a used colour no token declares stays a one-off hex (R-47-7), annotated with its nearest
// token when within R-47-7's ΔE ≤ 2 snap tolerance. The slug vocabulary is read from theme.json at run time.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { colourHex } from './tokens.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const THEME_JSON = path.resolve( HERE, '../../../theme/sgs-theme/theme.json' );
export const DEDUPE_DE = 1;
export const NEAR_DE = 2;
const SATURATED_C = 20;

// The framework slug vocabulary: [{ slug, name }] from theme.json settings.color.palette (read only).
export function loadPaletteSlugs( themeJsonPath = THEME_JSON ) {
	const json = JSON.parse( fs.readFileSync( themeJsonPath, 'utf8' ) );
	return ( json?.settings?.color?.palette || [] ).map( ( p ) => ( { slug: p.slug, name: p.name } ) );
}

// "#RRGGBB[AA]" → CIELAB (D65) plus alpha.
export function hexToLab( hex ) {
	const h = hex.replace( '#', '' );
	const lin = [ 0, 2, 4 ].map( ( k ) => {
		const x = parseInt( h.slice( k, k + 2 ), 16 ) / 255;
		return x <= 0.04045 ? x / 12.92 : ( ( x + 0.055 ) / 1.055 ) ** 2.4;
	} );
	const f = ( t ) => ( t > 216 / 24389 ? Math.cbrt( t ) : ( ( 24389 / 27 ) * t + 16 ) / 116 );
	const [ x, y, z ] = [
		( lin[ 0 ] * 0.4124 + lin[ 1 ] * 0.3576 + lin[ 2 ] * 0.1805 ) / 0.95047,
		lin[ 0 ] * 0.2126 + lin[ 1 ] * 0.7152 + lin[ 2 ] * 0.0722,
		( lin[ 0 ] * 0.0193 + lin[ 1 ] * 0.1192 + lin[ 2 ] * 0.9505 ) / 1.08883,
	].map( f );
	return { L: 116 * y - 16, a: 500 * ( x - y ), b: 200 * ( y - z ), alpha: 8 === h.length ? parseInt( h.slice( 6 ), 16 ) / 255 : 1 };
}

// CIEDE2000 ΔE between two CIELAB colours (Sharma, Wu and Dalal 2005; kL = kC = kH = 1).
export function ciede2000( p, q ) {
	const rad = ( d ) => ( d * Math.PI ) / 180;
	const deg = ( r ) => ( r * 180 ) / Math.PI;
	const c7 = ( c ) => Math.sqrt( c ** 7 / ( c ** 7 + 25 ** 7 ) );
	const cBar = ( Math.hypot( p.a, p.b ) + Math.hypot( q.a, q.b ) ) / 2;
	const g = 0.5 * ( 1 - c7( cBar ) );
	const [ a1, a2 ] = [ p.a * ( 1 + g ), q.a * ( 1 + g ) ];
	const [ c1, c2 ] = [ Math.hypot( a1, p.b ), Math.hypot( a2, q.b ) ];
	const hue = ( b, a ) => ( 0 === a && 0 === b ? 0 : ( deg( Math.atan2( b, a ) ) + 360 ) % 360 );
	const [ h1, h2 ] = [ hue( p.b, a1 ), hue( q.b, a2 ) ];
	let dh = 0;
	if ( c1 * c2 !== 0 ) {
		dh = h2 - h1;
		dh = Math.abs( dh ) <= 180 ? dh : dh > 180 ? dh - 360 : dh + 360;
	}
	const dL = q.L - p.L;
	const dC = c2 - c1;
	const dH = 2 * Math.sqrt( c1 * c2 ) * Math.sin( rad( dh / 2 ) );
	const lBar = ( p.L + q.L ) / 2;
	const cpBar = ( c1 + c2 ) / 2;
	let hBar = h1 + h2;
	if ( c1 * c2 !== 0 ) {
		hBar = Math.abs( h1 - h2 ) <= 180 ? hBar / 2 : hBar < 360 ? ( hBar + 360 ) / 2 : ( hBar - 360 ) / 2;
	}
	const t = 1 - 0.17 * Math.cos( rad( hBar - 30 ) ) + 0.24 * Math.cos( rad( 2 * hBar ) ) + 0.32 * Math.cos( rad( 3 * hBar + 6 ) ) - 0.2 * Math.cos( rad( 4 * hBar - 63 ) );
	const sL = 1 + ( 0.015 * ( lBar - 50 ) ** 2 ) / Math.sqrt( 20 + ( lBar - 50 ) ** 2 );
	const sC = 1 + 0.045 * cpBar;
	const sH = 1 + 0.015 * cpBar * t;
	const rT = -Math.sin( rad( 60 * Math.exp( -( ( ( hBar - 275 ) / 25 ) ** 2 ) ) ) ) * 2 * c7( cpBar );
	return Math.sqrt( ( dL / sL ) ** 2 + ( dC / sC ) ** 2 + ( dH / sH ) ** 2 + rT * ( dC / sC ) * ( dH / sH ) );
}

// ΔE between two hexes; Infinity when their alphas differ (alpha is its own axis, FR-33-2).
export function hexDistance( x, y ) {
	const [ p, q ] = [ hexToLab( x ), hexToLab( y ) ];
	return Math.abs( p.alpha - q.alpha ) > 1 / 255 ? Infinity : ciede2000( p, q );
}

// Colour tokens grouped by value: an exact match or a ΔE ≤ 1 neighbour of the group's first member (source order
// wins). Returns { groups: [{ hex, members: [token names], hexes: Set }], merges: [{ kept, merged, from, to, deltaE }] }.
export function dedupeColours( tokens ) {
	const groups = [];
	const merges = [];
	for ( const t of tokens ) {
		const g = groups.find( ( x ) => x.hex === t.hex ) || groups.find( ( x ) => hexDistance( x.hex, t.hex ) <= DEDUPE_DE );
		if ( ! g ) {
			groups.push( { hex: t.hex, members: [ t.name ], hexes: new Set( [ t.hex ] ) } );
			continue;
		}
		if ( g.hex !== t.hex ) {
			merges.push( { kept: g.members[ 0 ], merged: t.name, from: t.hex, to: g.hex, deltaE: Math.round( hexDistance( g.hex, t.hex ) * 1000 ) / 1000 } );
		}
		g.members.push( t.name );
		g.hexes.add( t.hex );
	}
	return { groups, merges };
}

const HEADING_TAG = /^h[1-6]$/i;
const BASE_TAG = /^(html|body|main|:root)$/i;
const isBackground = ( p ) => /^background(-color)?$/.test( p );
const isBorder = ( p ) => /^(border|outline)(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?$/.test( p );

// Usage evidence for one set of hexes: { total, byProperty, byTag, uses: [{ property, count, draftIds }], draftIds }.
export function summariseUsage( usage, hexes ) {
	const s = { total: 0, byProperty: {}, byTag: {}, uses: [], draftIds: new Set() };
	const by = new Map();
	for ( const u of usage.filter( ( x ) => hexes.has( x.hex ) ) ) {
		const n = u.count ?? 1;
		s.total += n;
		s.byProperty[ u.property ] = ( s.byProperty[ u.property ] || 0 ) + n;
		if ( u.tag ) {
			s.byTag[ `${ u.property }@${ u.tag.toLowerCase() }` ] = ( s.byTag[ `${ u.property }@${ u.tag.toLowerCase() }` ] || 0 ) + n;
		}
		s.draftIds.add( u.draftId );
		const row = by.get( u.property ) || { property: u.property, count: 0, draftIds: [] };
		row.count += n;
		if ( row.draftIds.length < 5 && ! row.draftIds.includes( u.draftId ) ) {
			row.draftIds.push( u.draftId );
		}
		by.set( u.property, row );
	}
	s.uses = [ ...by.values() ].sort( ( a, b ) => b.count - a.count );
	return s;
}

const share = ( s, test ) => Object.entries( s.byTag ).filter( ( [ k ] ) => test( ...k.split( '@' ) ) ).reduce( ( n, [ , v ] ) => n + v, 0 );
const chroma = ( hex ) => Math.hypot( hexToLab( hex ).a, hexToLab( hex ).b );

// Name rules: each takes { words } (the token name split on "-") and returns { role, why } or null. Order matters.
export const ruleLinkHover = ( c ) => ( c.words.includes( 'link' ) && c.words.some( ( w ) => /^(hover|active|focus)$/.test( w ) ) ? { role: 'link-hover', why: 'name says link hover' } : null );
export const ruleLink = ( c ) => ( c.words.includes( 'link' ) ? { role: 'link', why: 'name says link' } : null );
export const ruleHeading = ( c ) => ( c.words.some( ( w ) => /^(heading|headings|headline|title)$/.test( w ) ) ? { role: 'heading', why: 'name says heading' } : null );
export const ruleReserved = ( c ) => ( c.words.some( ( w ) => /^(header|topbar|nav|selection|social|linkedin|facebook|google|twitter|instagram|youtube|tiktok)$/.test( w ) ) ? { role: null, why: 'header, selection and social colours have no palette slug (FR-33-13, FR-33-16)' } : null );
export const ruleOnGround = ( c ) => {
	const w = c.words;
	if ( w.some( ( x ) => /^(surface|bg|background)$/.test( x ) ) ) {
		return null;
	}
	if ( w.includes( 'section' ) && w.some( ( x ) => /^(text|fg|on|ink|foreground)$/.test( x ) ) ) {
		return { role: 'section-text', why: 'name says section text' };
	}
	const on = w.indexOf( 'on' );
	return on >= 0 && c.sectionWords?.includes( w[ on + 1 ] ) ? { role: 'section-text', why: `name says on-${ w[ on + 1 ] }, and that is the section ground` } : null;
};
export const ruleSection = ( c ) => ( c.words.includes( 'section' ) ? { role: 'section', why: 'name says section ground' } : null );
export const ruleFooter = ( c ) => ( c.words.includes( 'footer' ) ? { role: 'footer-bg', why: 'name says footer' } : null );
export const ruleBorder = ( c ) => {
	if ( ! c.words.some( ( w ) => /^(border|divider|rule|outline|stroke)$/.test( w ) ) ) {
		return null;
	}
	return c.hex && chroma( c.hex ) > SATURATED_C ? { role: null, why: 'a saturated border is not the divider slug (FR-33-2 border guard)' } : { role: c.words.includes( 'light' ) ? 'border-light' : 'border', why: 'name says border' };
};
export const ruleStatus = ( c ) => {
	const w = c.words.find( ( x ) => /^(success|error|danger|info)$/.test( x ) );
	const base = 'danger' === w ? 'error' : w;
	return w ? { role: c.words.includes( 'light' ) ? `${ base }-light` : base, why: `name says ${ w }` } : null;
};
export const ruleWhatsapp = ( c ) => ( c.words.includes( 'whatsapp' ) ? { role: 'whatsapp', why: 'name says WhatsApp' } : null );
export const ruleTextMuted = ( c ) => ( c.words.some( ( w ) => /^(muted|subtle)$/.test( w ) ) && ! c.words.some( ( w ) => /^(brand|surface|bg)$/.test( w ) ) ? { role: 'text-muted', why: 'name says muted text' } : null );
export const ruleTextInverse = ( c ) => ( c.words.some( ( w ) => /^(inverse|inverted|reverse)$/.test( w ) ) ? { role: 'text-inverse', why: 'name says inverse text' } : null );
export const ruleText = ( c ) => ( c.words.some( ( w ) => /^(text|body|copy|fg|foreground)$/.test( w ) ) && ! c.words.some( ( w ) => /^(surface|bg|background)$/.test( w ) ) ? { role: 'text', why: 'name says body text' } : null );
export const ruleSurface = ( c ) => ( c.words.some( ( w ) => /^(surface|bg|background|ground|canvas|page)$/.test( w ) ) ? { role: 'surface', why: 'name says surface' } : null );
export const ruleBrand = ( c ) => {
	if ( ! c.family ) {
		return null;
	}
	const mod = c.words.find( ( w ) => /^(hover|dark|darker|deep|light|lighter|mid|pale|soft)$/.test( w ) );
	if ( ! mod ) {
		return { role: c.family.role, why: `${ c.family.why }` };
	}
	if ( 'primary' === c.family.role && /^(hover|dark|darker|deep)$/.test( mod ) ) {
		return { role: 'primary-dark', why: `${ mod } shade of the primary family` };
	}
	if ( 'accent' === c.family.role && /^(light|lighter|pale|soft)$/.test( mod ) ) {
		return { role: 'accent-light', why: `${ mod } shade of the accent family` };
	}
	return { role: null, why: `${ mod } shade of the ${ c.family.role } family has no slug` };
};
export const NAME_RULES = [ ruleLinkHover, ruleLink, ruleHeading, ruleReserved, ruleOnGround, ruleSection, ruleFooter, ruleBorder,
	ruleStatus, ruleWhatsapp, ruleTextMuted, ruleTextInverse, ruleText, ruleSurface, ruleBrand ];

// Usage rule for a token with no name role: { role, why } from where its value paints, or null (FR-33-2's table).
export function ruleFromUsage( s, hex ) {
	if ( ! s.total ) {
		return null;
	}
	const col = s.byProperty.color || 0;
	const bg = ( s.byProperty.background || 0 ) + ( s.byProperty[ 'background-color' ] || 0 );
	const border = Object.entries( s.byProperty ).filter( ( [ p ] ) => isBorder( p ) ).reduce( ( n, [ , v ] ) => n + v, 0 );
	const lab = hexToLab( hex );
	if ( col && share( s, ( p, t ) => 'color' === p && HEADING_TAG.test( t ) ) * 2 > col ) {
		return { role: 'heading', why: 'used mostly as heading text colour' };
	}
	if ( col && share( s, ( p, t ) => 'color' === p && 'a' === t ) * 2 > col ) {
		return { role: 'link', why: 'used mostly as link colour' };
	}
	if ( bg && share( s, ( p, t ) => isBackground( p ) && BASE_TAG.test( t ) ) > 0 ) {
		return { role: 'surface', why: 'the page base background' };
	}
	if ( border > col && border > bg ) {
		return chroma( hex ) > SATURATED_C ? null : { role: 'border', why: 'used mostly as a border colour' };
	}
	if ( col >= bg && lab.L < 50 && chroma( hex ) <= SATURATED_C ) {
		return { role: 'text', why: 'used mostly as dark, low-chroma text colour' };
	}
	if ( bg > col && chroma( hex ) > SATURATED_C ) {
		return { role: 'primary', why: 'a high-chroma ground' };
	}
	return null;
}

// The most used text colour on elements whose background is the section ground: { hex, count } or null.
export function sectionTextFor( groundHexes, usage ) {
	const ids = new Set( usage.filter( ( u ) => isBackground( u.property ) && groundHexes.has( u.hex ) ).map( ( u ) => u.draftId ) );
	const n = new Map();
	for ( const u of usage.filter( ( x ) => 'color' === x.property && ids.has( x.draftId ) ) ) {
		n.set( u.hex, ( n.get( u.hex ) || 0 ) + ( u.count ?? 1 ) );
	}
	const best = [ ...n.entries() ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ];
	return best ? { hex: best[ 0 ], count: best[ 1 ] } : null;
}

// When a slug is not in the vocabulary yet, the closest existing slug to propose instead (FR-32-14 lands them).
const STAND_IN = { heading: 'text', link: 'primary', 'link-hover': 'primary-dark', section: 'surface-alt', 'section-text': 'text' };
const MODIFIERS = /^(hover|dark|darker|deep|light|lighter|mid|pale|soft|active|focus)$/;
// A slug that loses a collision tries this one next.
const SECOND = { surface: 'surface-alt', primary: 'accent' };
const GROUND_ROLES = /^(surface|surface-alt|section|footer-bg|primary|accent|accent-light|success-light|error-light|info-light)$/;
const wordsOf = ( name ) => name.replace( /^--/, '' ).toLowerCase().split( /[-_]+/ ).filter( Boolean );
const custom = ( name ) => `custom-${ name.replace( /^--/, '' ) }`;
const r3 = ( n ) => Math.round( n * 1000 ) / 1000;

// Brand families (names with brand/primary/secondary/accent, modifiers stripped), ranked by an explicit role word,
// then by how often the family's base value (no modifier) is used, then all its values: the first unnamed family is
// primary, the next accent, the rest no role. Pass only tokens no other name rule claims. Map name → { role, why } | null.
export function brandFamilies( colours, groupOf ) {
	const fams = new Map();
	for ( const t of colours.filter( ( x ) => wordsOf( x.name ).some( ( w ) => /^(brand|primary|secondary|accent)$/.test( w ) ) ) ) {
		const words = wordsOf( t.name );
		const key = words.filter( ( w ) => ! MODIFIERS.test( w ) ).join( '-' );
		const f = fams.get( key ) || { members: [], base: 0, total: 0, named: null, order: fams.size };
		const n = groupOf.get( t.name ).summary.total;
		f.members.push( t.name );
		f.total += n;
		f.base = words.join( '-' ) === key ? n : f.base;
		f.named = words.includes( 'primary' ) ? 'primary' : f.named || ( words.some( ( w ) => /^(secondary|accent)$/.test( w ) ) ? 'accent' : null );
		fams.set( key, f );
	}
	const list = [ ...fams.values() ].sort( ( a, b ) => Number( ! a.named ) - Number( ! b.named ) || b.base - a.base || b.total - a.total || a.order - b.order );
	const taken = new Set( list.map( ( f ) => f.named ).filter( Boolean ) );
	const out = new Map();
	for ( const f of list ) {
		const role = f.named || [ 'primary', 'accent' ].find( ( r ) => ! taken.has( r ) ) || null;
		const why = f.named ? `name says ${ f.named }` : role ? `the ${ 'primary' === role ? 'most' : 'second most' } used brand colour (${ f.base } uses)` : 'a third brand family has no slug';
		taken.add( role );
		f.members.forEach( ( m ) => out.set( m, role ? { role, why } : null ) );
	}
	return out;
}

// Evidence count relevant to a role: background uses for a ground, border uses for a border, colour uses otherwise.
function evidence( s, role ) {
	if ( GROUND_ROLES.test( role ) ) {
		return ( s.byProperty.background || 0 ) + ( s.byProperty[ 'background-color' ] || 0 );
	}
	if ( /^border/.test( role ) ) {
		return Object.entries( s.byProperty ).filter( ( [ p ] ) => isBorder( p ) ).reduce( ( n, [ , v ] ) => n + v, 0 );
	}
	return s.byProperty.color || 0;
}

// The proposal: { rows, unused, oneOff, merges, sectionText, tokens, vocabulary, problems } (see the module comment).
// `usage` is [{ hex (any colour form), property, draftId, count, tag? }]; `slugs` is [{ slug, name }] (theme.json's
// by default); `problems` carries lib/tokens.mjs's problems through.
export function proposePalette( { tokens = [], usage = [], slugs = loadPaletteSlugs(), problems: carried = [] } = {} ) {
	const vocab = new Set( slugs.map( ( s ) => s.slug ) );
	const problems = [ ...carried ];
	const uses = usage.map( ( u ) => ( { ...u, hex: colourHex( u.hex ) } ) ).filter( ( u, k ) => u.hex ||
		! problems.push( { kind: 'usage-colour', draftId: u.draftId, error: `${ usage[ k ].hex } (${ u.property } on ${ u.draftId }) is not a colour` } ) );
	const seen = new Set();
	const colours = tokens.filter( ( t ) => 'colour' === t.type && t.hex && ! seen.has( t.name ) && seen.add( t.name ) );
	const { groups, merges } = dedupeColours( colours );
	const groupOf = new Map();
	groups.forEach( ( g ) => {
		g.summary = summariseUsage( uses, g.hexes );
		g.members.forEach( ( m ) => groupOf.set( m, g ) );
	} );
	const ground = colours.filter( ( t ) => ruleSection( { words: wordsOf( t.name ) } ) && ! ruleOnGround( { words: wordsOf( t.name ) } ) && groupOf.get( t.name ).summary.total )
		.sort( ( a, b ) => evidence( groupOf.get( b.name ).summary, 'section' ) - evidence( groupOf.get( a.name ).summary, 'section' ) )[ 0 ];
	const sectionWords = ground ? wordsOf( ground.name ).filter( ( w ) => ! /^(surface|section|bg|background)$/.test( w ) ) : [];
	const claimed = ( t ) => NAME_RULES.slice( 0, -1 ).some( ( r ) => r( { words: wordsOf( t.name ), hex: t.hex, sectionWords } ) );
	const families = brandFamilies( colours.filter( ( t ) => ! claimed( t ) ), groupOf );

	const prop = new Map();
	for ( const t of colours ) {
		const s = groupOf.get( t.name ).summary;
		if ( ! s.total ) {
			prop.set( t.name, { role: null, confidence: 0, why: 'unused: no element in the draft uses this value' } );
			continue;
		}
		const c = { words: wordsOf( t.name ), hex: t.hex, family: families.get( t.name ) || null, sectionWords };
		let hit = null;
		for ( const rule of NAME_RULES ) {
			if ( ( hit = rule( c ) ) ) {
				break;
			}
		}
		if ( hit?.role ) {
			const agrees = ruleFromUsage( s, t.hex )?.role === hit.role;
			prop.set( t.name, { role: hit.role, confidence: agrees ? 0.95 : 0.9, why: hit.why + ( agrees ? '; usage agrees' : '' ), by: 'name' } );
		} else if ( hit ) {
			prop.set( t.name, { role: custom( t.name ), confidence: 0.8, why: hit.why, by: 'name' } );
		}
	}
	for ( const t of colours.filter( ( x ) => ! prop.has( x.name ) ) ) {
		const g = groupOf.get( t.name );
		const peer = g.members.map( ( m ) => [ m, prop.get( m ) ] ).find( ( [ , p ] ) => p?.by === 'name' && ! p.role.startsWith( 'custom-' ) );
		const u = ruleFromUsage( g.summary, t.hex );
		if ( peer ) {
			prop.set( t.name, { role: peer[ 1 ].role, confidence: 0.85, why: `same value as ${ peer[ 0 ] }`, by: 'alias' } );
		} else if ( u ) {
			prop.set( t.name, { role: u.role, confidence: 0.7, why: u.why, by: 'usage' } );
		} else {
			prop.set( t.name, { role: custom( t.name ), confidence: 0.3, why: 'no confident match; stays a custom colour (FR-33-2)', by: 'none' } );
		}
	}
	// A slug the vocabulary lacks: propose the stand-in and record the wanted slug (FR-32-14 adds them).
	for ( const p of prop.values() ) {
		if ( p.role && ! p.role.startsWith( 'custom-' ) && ! vocab.has( p.role ) ) {
			p.wantedSlug = p.role;
			p.role = vocab.has( STAND_IN[ p.role ] ) ? STAND_IN[ p.role ] : null;
			p.notes = `${ p.wantedSlug } is not in theme.json's palette yet` + ( p.role ? `; proposing ${ p.role } until it lands` : '' );
		}
	}
	// Collisions: one value per slug. The best-evidenced group keeps it; the others try SECOND, else stay custom.
	for ( let pass = 0; pass < 4; pass++ ) {
		let moved = false;
		const claims = new Map();
		for ( const t of colours ) {
			const p = prop.get( t.name );
			if ( p.role && ! p.role.startsWith( 'custom-' ) ) {
				claims.set( p.role, [ ...( claims.get( p.role ) || [] ), t ] );
			}
		}
		for ( const [ slug, ts ] of claims ) {
			const gs = [ ...new Set( ts.map( ( t ) => groupOf.get( t.name ) ) ) ];
			if ( gs.length < 2 ) {
				continue;
			}
			const score = ( g ) => [ Math.max( ...ts.filter( ( t ) => groupOf.get( t.name ) === g ).map( ( t ) => prop.get( t.name ).confidence ) ), evidence( g.summary, slug ) ];
			gs.sort( ( a, b ) => score( b )[ 0 ] - score( a )[ 0 ] || score( b )[ 1 ] - score( a )[ 1 ] || groups.indexOf( a ) - groups.indexOf( b ) );
			for ( const t of ts.filter( ( x ) => groupOf.get( x.name ) !== gs[ 0 ] ) ) {
				const p = prop.get( t.name );
				const winner = ts.find( ( x ) => groupOf.get( x.name ) === gs[ 0 ] ).name;
				const next = SECOND[ slug ] && vocab.has( SECOND[ slug ] ) ? SECOND[ slug ] : null;
				Object.assign( p, { role: next || custom( t.name ), confidence: next ? 0.7 : 0.3, why: `${ p.why }; ${ slug } went to ${ winner }` + ( next ? `, so ${ next }` : '' ) } );
				moved = true;
			}
		}
		if ( ! moved ) {
			break;
		}
	}
	// The section ground's text colour from usage, when no token is named for it.
	const groundGroup = colours.find( ( t ) => 'section' === prop.get( t.name ).role );
	const paired = groundGroup ? sectionTextFor( groupOf.get( groundGroup.name ).hexes, uses ) : null;
	const sectionText = paired ? { ...paired, token: groups.find( ( g ) => g.hexes.has( paired.hex ) )?.members[ 0 ] || null } : null;
	if ( sectionText?.token && ! colours.some( ( t ) => 'section-text' === prop.get( t.name ).role ) && prop.get( sectionText.token ).role.startsWith( 'custom-' ) ) {
		Object.assign( prop.get( sectionText.token ), { role: 'section-text', confidence: 0.7, why: 'the most used text colour on the section ground' } );
	}

	const rows = colours.map( ( t ) => {
		const g = groupOf.get( t.name );
		const p = prop.get( t.name );
		const row = { rowId: `palette:${ t.name }`, token: t.name, hex: t.hex, resolved: t.resolved, chain: t.chain, used: g.summary.total > 0,
			uses: g.summary.uses, sharedWith: g.members.filter( ( m ) => m !== t.name ), role: p.role, confidence: r3( p.confidence ), why: p.why };
		if ( p.wantedSlug ) {
			Object.assign( row, { wantedSlug: p.wantedSlug, notes: p.notes } );
		}
		return row;
	} );
	const known = new Set( groups.flatMap( ( g ) => [ ...g.hexes ] ) );
	const oneOff = [ ...new Set( uses.map( ( u ) => u.hex ) ) ].filter( ( h ) => ! known.has( h ) ).map( ( hex ) => {
		const near = colours.map( ( t ) => ( { token: t.name, deltaE: hexDistance( hex, t.hex ) } ) ).sort( ( a, b ) => a.deltaE - b.deltaE )[ 0 ];
		const o = { hex, uses: summariseUsage( uses, new Set( [ hex ] ) ).uses };
		if ( near && near.deltaE <= NEAR_DE ) {
			o.nearest = { token: near.token, deltaE: r3( near.deltaE ) };
		}
		return o;
	} );
	return { rows, unused: rows.filter( ( r ) => ! r.used ).map( ( r ) => r.token ), oneOff, merges, sectionText, tokens,
		vocabulary: slugs.map( ( s ) => s.slug ), problems };
}
