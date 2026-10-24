// The palette role proposal for Bean's intake review (Spec 48 FR-48-31, §11 FR-33-2, R-47-7). Declared colour tokens
// (lib/tokens.mjs) are matched to the draft's colours by exact normalised value (alpha-aware) and given a proposed
// palette slug from where its value paints (lib/intake-palette-usage.mjs: the page ground and text, the footer, headings,
// links, divider lines, button grounds and the text on each ground), one value filling as many slugs as the facts give
// it; the token's name is only a last-resort hint for a slug no rendered fact gives, and a row whose slug rests on the
// name alone says so (`by: 'name'`). Near-identical tokens dedupe at
// CIEDE2000 ΔE ≤ 1 with alpha as its own axis (FR-33-2) and every merge is recorded. A token nothing uses is listed in
// `unused` and gets no role; a used colour no token declares stays a one-off hex (R-47-7), annotated with its nearest
// token when within R-47-7's ΔE ≤ 2 snap tolerance. The slug vocabulary is read from theme.json at run time.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { colourHex } from './tokens.mjs';
import { usageRoles, isBorder, SATURATED_C } from './intake-palette-usage.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const THEME_JSON = path.resolve( HERE, '../../../theme/sgs-theme/theme.json' );
export const DEDUPE_DE = 1;
export const NEAR_DE = 2;

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

// The proposal: { rows, unused, oneOff, merges, tokens, vocabulary, problems } (see the module comment). Each row carries
// `roles` (every slug its value fills, the shown `role` first), `by` ('usage', 'name' or 'none') and `basis` ([{ role,
// by, why }]). `usage` is [{ hex (any colour form), property, draftId, count, tag?, ground?, text? }] (lib/intake-run-
// collapse.mjs::paletteUsage plus lib/intake-palette-grounds.mjs::groundUsage); `slugs` is [{ slug, name }] (theme.json's
// by default); `problems` carries lib/tokens.mjs's problems through.
export function proposePalette( { tokens = [], usage = [], slugs = loadPaletteSlugs(), problems: carried = [] } = {} ) {
	const vocab = new Set( slugs.map( ( s ) => s.slug ) );
	const problems = [ ...carried ];
	const uses = usage.map( ( u ) => ( { ...u, hex: colourHex( u.hex ), ...( u.ground ? { ground: colourHex( u.ground ) } : {} ) } ) ).filter( ( u, k ) => u.hex ||
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

	// A token's name is a last-resort hint: { role, why } (role null: the name says no slug) or undefined.
	const hintOf = new Map();
	for ( const t of colours.filter( ( x ) => groupOf.get( x.name ).summary.total ) ) {
		const c = { words: wordsOf( t.name ), hex: t.hex, family: families.get( t.name ) || null, sectionWords };
		for ( const rule of NAME_RULES ) {
			const hit = rule( c );
			if ( hit ) {
				hintOf.set( t.name, hit );
				break;
			}
		}
	}
	// Roles per value: usage first, then a name hint for a slug no usage rule gave; a hint never takes a slug usage gave
	// another value (the loser tries SECOND, else keeps no slug).
	const roles = new Map();
	const weak = [];
	const read = usageRoles( groups.filter( ( g ) => g.summary.total ), uses );
	for ( const [ g, list ] of read.roles ) {
		roles.set( g, list.filter( ( r ) => ! r.weak ).map( ( r ) => ( { ...r, by: 'usage', confidence: 0.85 } ) ) );
		weak.push( ...list.filter( ( r ) => r.weak ).map( ( r ) => [ g, r ] ) );
	}
	const holderOf = ( slug ) => [ ...roles.entries() ].find( ( [ , list ] ) => list.some( ( r ) => r.role === slug ) )?.[ 0 ] ?? null;
	const lost = new Map();
	const hints = colours.filter( ( t ) => hintOf.get( t.name )?.role ).map( ( t ) => ( { t, g: groupOf.get( t.name ), ...hintOf.get( t.name ) } ) )
		.sort( ( a, b ) => evidence( b.g.summary, b.role ) - evidence( a.g.summary, a.role ) || colours.indexOf( a.t ) - colours.indexOf( b.t ) );
	for ( const h of hints ) {
		const first = holderOf( h.role );
		const slug = first && first !== h.g && SECOND[ h.role ] && vocab.has( SECOND[ h.role ] ) ? SECOND[ h.role ] : h.role;
		const held = holderOf( slug );
		const list = roles.get( h.g ) || [];
		const count = held ? null : weak.find( ( [ g, r ] ) => g === h.g && r.role === slug );
		if ( read.blocked[ slug ] ) {
			lost.set( h.t.name, `${ h.why }, but the draft paints the ${ slug } job most in ${ read.blocked[ slug ] }, a colour no token declares` );
		} else if ( count ) {
			// The count read on this same value and the name agree: a usage role.
			roles.set( h.g, [ ...list, { role: slug, why: `${ count[ 1 ].why }; the name ${ h.t.name } agrees`, by: 'usage', confidence: 0.85, agrees: true } ] );
		} else if ( held === h.g ) {
			const r = list.find( ( x ) => x.role === slug );
			if ( 'usage' === r.by && ! r.agrees ) {
				Object.assign( r, { why: `${ r.why }; the name ${ h.t.name } agrees`, confidence: 0.95, agrees: true } );
			}
		} else if ( held ) {
			lost.set( h.t.name, `${ h.why }, but ${ slug } is read from usage on ${ held.members[ 0 ] } (${ held.hex })` );
		} else {
			const why = slug === h.role ? h.why : `${ h.why }; ${ h.role } is read from usage on ${ first.members[ 0 ] }, so ${ slug }`;
			roles.set( h.g, [ ...list, { role: slug, why: `${ why } (the name alone decides this)`, by: 'name', confidence: 0.6 } ] );
		}
	}
	// A role read only from a count takes its slug when no name hint did.
	for ( const [ g, r ] of weak.filter( ( [ , x ] ) => ! holderOf( x.role ) ) ) {
		roles.set( g, [ ...( roles.get( g ) || [] ), { role: r.role, why: r.why, by: 'usage', confidence: 0.6 } ] );
	}
	// Muted text is never the text value: a value a name made the text drops a muted role read beside a weaker text.
	for ( const [ g, list ] of roles ) {
		if ( list.some( ( r ) => 'text' === r.role ) && list.some( ( r ) => 'text-muted' === r.role ) ) {
			roles.set( g, list.filter( ( r ) => 'text-muted' !== r.role ) );
		}
	}
	// A slug the vocabulary lacks: propose the stand-in when no other value holds it, and record the wanted slug (FR-32-14
	// adds them).
	const wanted = new Map();
	for ( const [ g, list ] of roles ) {
		const kept = [];
		for ( const r of list ) {
			if ( ! vocab.has( r.role ) ) {
				const holder = holderOf( STAND_IN[ r.role ] );
				const stand = vocab.has( STAND_IN[ r.role ] ) && ( ! holder || holder === g ) ? STAND_IN[ r.role ] : null;
				Object.assign( r, { wantedSlug: r.role, role: stand, notes: `${ r.role } is not in theme.json's palette yet` + ( stand ? `; proposing ${ stand } until it lands` : `; ${ STAND_IN[ r.role ] ?? 'no stand-in' } is not free` ) } );
				wanted.set( g, [ ...( wanted.get( g ) || [] ), r ] );
			}
			r.role && ! kept.some( ( k ) => k.role === r.role ) && kept.push( r );
		}
		roles.set( g, kept );
	}

	// A merged group's painted value: the member hex the draft paints most (the first member on a tie). Its rows carry
	// it as `value`, so a confirm step keeps the colour that earned the group's roles.
	const painted = ( g ) => [ ...g.hexes ].map( ( h ) => [ h, summariseUsage( uses, new Set( [ h ] ) ).total ] ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] || ( a[ 0 ] === g.hex ? -1 : b[ 0 ] === g.hex ? 1 : 0 ) )[ 0 ][ 0 ];
	const rows = colours.map( ( t ) => {
		const g = groupOf.get( t.name );
		const list = roles.get( g ) || [];
		const row = { rowId: `palette:${ t.name }`, token: t.name, hex: t.hex, resolved: t.resolved, chain: t.chain, used: g.summary.total > 0,
			uses: g.summary.uses, sharedWith: g.members.filter( ( m ) => m !== t.name ), ...( g.hexes.size > 1 ? { value: painted( g ) } : {} ) };
		if ( ! row.used ) {
			return { ...row, role: null, roles: [], confidence: 0, why: 'unused: no element in the draft uses this value', by: 'none' };
		}
		if ( ! list.length && ! wanted.has( g ) ) {
			const hit = hintOf.get( t.name );
			const why = lost.get( t.name ) || ( hit && ! hit.role ? hit.why : 'no rendered fact or name gives it a slug; stays a custom colour (FR-33-2)' );
			return { ...row, role: custom( t.name ), roles: [ custom( t.name ) ], confidence: hit && ! hit.role ? 0.8 : 0.3, why, by: hit && ! hit.role ? 'name' : 'none' };
		}
		const own = hintOf.get( t.name )?.role;
		const shown = list.find( ( r ) => r.role === own || r.wantedSlug === own ) || list[ 0 ];
		const want = ( wanted.get( g ) || [] ).find( ( r ) => r.wantedSlug === own ) || ( shown?.wantedSlug ? shown : ( wanted.get( g ) || [] )[ 0 ] );
		if ( want ) {
			Object.assign( row, { wantedSlug: want.wantedSlug, notes: want.notes } );
		}
		const top = shown || want;
		return Object.assign( row, { role: shown?.role ?? null, roles: list.length ? [ shown, ...list.filter( ( r ) => r !== shown ) ].map( ( r ) => r.role ) : [ ], confidence: r3( top.confidence ),
			why: top.why, by: top.by, basis: [ ...list, ...( wanted.get( g ) || [] ).filter( ( r ) => ! r.role ) ].map( ( r ) => ( { role: r.role ?? r.wantedSlug, by: r.by, why: r.why } ) ) } );
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
	return { rows, unused: rows.filter( ( r ) => ! r.used ).map( ( r ) => r.token ), oneOff, merges, tokens, vocabulary: slugs.map( ( s ) => s.slug ), problems };
}
