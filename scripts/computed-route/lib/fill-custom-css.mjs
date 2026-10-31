// A draft style the block's own settings cannot hold, written into that block's Custom CSS box (Bean's rule, Spec 48
// FR-48-60 step 2, Spec 32 FR-32-20): after every other Fill pass, each UNMAPPED row whose reason says no setting of the
// block holds the value (`no-setting`, `shape`, `unmapped-element`: a pseudo-element under a state the block has no
// calibrated part for, and a state the block paints by itself that nothing holds, code `state-unheld`) becomes a scoped
// rule on the instance, through the one Custom CSS writer (lib/custom-css-writer.mjs::customCssPuts):
//   - any CSS property and value, on the row's element: the block itself (`&`) or the part its slot names (`& <slot>`);
//   - a pseudo-class state as that pseudo-class on the element (`&:hover`, `& .x:focus`), a pseudo-element slot as the
//     pseudo-element after it (`& .x:hover::after`);
//   - a value that differs between the read widths as one scoped `@media` rule per run of tiers holding one value (375 is
//     the mobile tier, 768 the tablet, 1440 the desktop, lib/fill-width-gate.mjs::TIER_RANGES), a value read at some widths
//     only as rules over those tiers only.
// A row whose property a write of the run already paints on the same element and state (the property itself or a
// shorthand of it) is left as it is and never also written as CSS, so nothing is painted twice. A row the plugin's scoper
// refuses (Spec 32 FR-32-20's limits), a held row (code `held:*`), a state no pseudo-class names and a property CSS does
// not know stay rows; a refused one names the scoper's reason. Each written rule returns a gaps row naming the native
// control it could become (FR-48-86), and its rows stay UNMAPPED as gaps (Bean 2026-10-31: the draft clones faithfully and
// the gap stays on the list for a native setting), each carrying `appliedCss` and a reason saying the value is applied
// through the block's Custom CSS until a setting holds it.
import { setAttr } from './tree.mjs';
import { mediaRule, TIER_RANGES } from './fill-width-gate.mjs';
import { WIDTHS, perNode, regroup } from './fill-regap.mjs';
import { customCssPuts, scoperRefusals, SAFE_SLOT } from './custom-css-writer.mjs';
import { isCssProperty, longhandsOf } from './css-families.mjs';

// The capabilities this writer closes in the clone coverage map (data/clone-coverage.json; lib/clone-coverage.mjs checks
// each one's entry names this module): the CSS functions, units and property groups the drafts use that no block setting
// holds, every one of which Fill reads on a measured element and this pass writes into the block's Custom CSS.
export const COVERAGE_WRITES = [
	'css-function:brightness', 'css-function:saturate', 'css-function:sepia', 'css-function:hue-rotate', 'css-function:polygon',
	'css-unit:ch', 'css-unit:mm',
	'css-group:overflow', 'css-group:images', 'css-group:lists-and-counters', 'css-group:logical-properties-and-values', 'css-group:scroll-snap',
	'css-group:masking', 'css-group:transforms', 'css-group:basic-user-interface',
];

// The gap reasons that mean the block's own settings cannot hold the value (the reason's code, before its first colon).
const NO_HOLDER = [ 'no-setting', 'shape', 'unmapped-element' ];
// The row code a state look the block paints by itself carries when nothing holds the draft's (lib/fill-state.mjs).
export const STATE_UNHELD = 'state-unheld';
// The states a CSS pseudo-class names (the framework DB's states table: the pseudo-class family of each).
const PSEUDO_CLASS = { hover: ':hover', focus: ':focus', active: ':active', disabled: ':disabled' };
const UNSAFE_VALUE = /[{};<]/;

const codeOf = ( row ) => String( row.reason || '' ).split( ':' )[ 0 ];
export const eligible = ( row ) => ( NO_HOLDER.includes( codeOf( row ) ) || STATE_UNHELD === row.code ) && ! /^held:/.test( row.code || '' );

// The selector of a row's element under its state: `&` is the instance (includes/custom-css.php), a slot is a part inside
// it, and the state's pseudo-class goes before a pseudo-element the slot ends in.
export function selectorOf( slot, state ) {
	const m = /^(.*?)((?:::?(?:before|after|marker|placeholder|selection|first-line|first-letter|backdrop|file-selector-button))?)$/.exec( String( slot || '' ).trim() );
	const base = m[ 1 ].trim();
	const at = `${ PSEUDO_CLASS[ state ] || '' }${ m[ 2 ] }`;
	return base ? `& ${ base }${ at }` : `&${ at }`;
}

const tierOf = ( w ) => Object.keys( TIER_RANGES ).find( ( t ) => TIER_RANGES[ t ][ 0 ] <= w && w < TIER_RANGES[ t ][ 1 ] );

// A row's value per read width: [ [ width, value ] ], from a per-width map ("{\"375\":\"a\"}") or one value at the widths
// the row names (every read width when it names none).
function perWidth( row ) {
	let held = null;
	try {
		held = JSON.parse( row.value );
	} catch {
		held = null;
	}
	if ( held && 'object' === typeof held && ! Array.isArray( held ) ) {
		return Object.entries( held ).filter( ( [ , v ] ) => null !== v && undefined !== v && '' !== v ).map( ( [ w, v ] ) => [ Number( w ), String( v ) ] );
	}
	return ( row.widths?.length ? row.widths : WIDTHS ).map( ( w ) => [ Number( w ), String( row.value ) ] );
}

// The width ranges of a row's value: [ { range: [ lo, hi ), value } ], tiers in order, a run of tiers of one value joined;
// one range [ 0, Infinity ) when every tier holds the same value. Null when two read widths of one tier differ.
export function valueRanges( row ) {
	const byTier = {};
	for ( const [ w, v ] of perWidth( row ) ) {
		const t = tierOf( w );
		if ( undefined !== byTier[ t ] && byTier[ t ] !== v ) {
			return null;
		}
		byTier[ t ] = v;
	}
	const out = [];
	for ( const t of Object.keys( TIER_RANGES ) ) {
		const last = out.at( -1 );
		if ( undefined === byTier[ t ] ) {
			continue;
		}
		if ( last && last.value === byTier[ t ] && last.range[ 1 ] === TIER_RANGES[ t ][ 0 ] ) {
			last.range = [ last.range[ 0 ], TIER_RANGES[ t ][ 1 ] ];
		} else {
			out.push( { range: [ ...TIER_RANGES[ t ] ], value: byTier[ t ] } );
		}
	}
	return out;
}

const rangeText = ( [ lo, hi ] ) => ( 0 === lo && Infinity === hi ? 'every width' : Infinity === hi ? `${ lo }px and up` : `${ lo }-${ hi - 1 }px` );
const wrap = ( range, body ) => ( 0 === range[ 0 ] && Infinity === range[ 1 ] ? body : mediaRule( range, body ) );

// Whether a write of the run already paints this property on this element and state: the same property, or a shorthand
// whose longhands include it.
const painted = ( writes, row ) => writes.some( ( w ) => w.node === row.node && ( w.slot ?? '' ) === ( row.slot ?? '' ) && ( w.state ?? null ) === ( row.state ?? null ) && 'string' === typeof w.prop && ( w.prop === row.property || longhandsOf( w.prop ).includes( row.property ) ) );

// The reason a row is not written as CSS, or null when it can be.
function refusal( row ) {
	if ( row.state && ! PSEUDO_CLASS[ row.state ] ) {
		return null;
	}
	if ( ! isCssProperty( row.property ) && ! String( row.property ).startsWith( '--' ) ) {
		return null;
	}
	if ( ! SAFE_SLOT.test( row.slot ?? '' ) ) {
		return `custom-css-refused: the element's selector "${ row.slot }" holds a character a scoped rule cannot carry`;
	}
	return '';
}

// unmapped: the run's UNMAPPED rows; writes: the run's writes (a property one of them paints is never also CSS); nodes,
// flat, refOf: the skeleton nodes, the tree's nodes by index and their refs. Returns { writes, unmapped (
// every row, a written one carrying `appliedCss` and saying so in its reason), gaps, notes }.
export function customCssWrites( { unmapped, writes, nodes, flat, refOf } ) {
	const out = { writes: [], unmapped: [], gaps: [], notes: [] };
	const recOf = new Map( nodes.map( ( n ) => [ refOf( flat[ n.index ] ), n ] ) );
	// node -> Map( `${ selector }|${ range }` -> { selector, range, decls: [], rows: [] } )
	const rules = new Map();
	for ( const row of perNode( unmapped ) ) {
		const rec = recOf.get( row.node );
		const why = eligible( row ) && rec ? refusal( row ) : null;
		if ( null === why || painted( writes, row ) ) {
			out.unmapped.push( row );
			continue;
		}
		const ranges = why ? [] : valueRanges( row );
		if ( why || null === ranges ) {
			out.unmapped.push( { ...row, reason: why || `custom-css-refused: two read widths of one device tier hold different values, which no tier rule holds (${ row.reason })` } );
			continue;
		}
		if ( ! ranges.length ) {
			out.unmapped.push( row );
			continue;
		}
		if ( ranges.some( ( r ) => UNSAFE_VALUE.test( r.value ) ) ) {
			out.unmapped.push( { ...row, reason: `custom-css-refused: the value holds a brace, semicolon or "<", which no declaration carries (${ row.reason })` } );
			continue;
		}
		const selector = selectorOf( row.slot, row.state );
		// Each declaration is put to the plugin's scoper alone, so one refused value never takes its neighbours with it.
		const css = ( range, value ) => wrap( range, `${ selector } { ${ row.property }: ${ value }; }` );
		const refused = ranges.map( ( r ) => ( { r, why: scoperRefusals( css( r.range, r.value ) ) } ) ).find( ( x ) => x.why.length );
		if ( refused ) {
			out.unmapped.push( { ...row, reason: `custom-css-refused: the Custom CSS scoper refuses ${ css( refused.r.range, refused.r.value ) }: ${ refused.why.join( '; ' ) } (${ row.reason })` } );
			continue;
		}
		const byRule = rules.get( row.node ) || new Map();
		for ( const { range, value } of ranges ) {
			const key = `${ selector }|${ range.join( '-' ) }`;
			const rule = byRule.get( key ) || { selector, range, decls: [], rows: [] };
			rule.decls.push( `${ row.property }: ${ value };` );
			rule.rows.includes( row ) || rule.rows.push( row );
			byRule.set( key, rule );
		}
		rules.set( row.node, byRule );
	}
	for ( const [ ref, byRule ] of rules ) {
		const rec = recOf.get( ref );
		const node = flat[ rec.index ];
		const ok = [ ...byRule.values() ].map( ( r ) => ( { ...r, css: wrap( r.range, `${ r.selector } { ${ r.decls.join( ' ' ) } }` ) } ) );
		if ( ! ok.length ) {
			continue;
		}
		const label = `Custom CSS no setting holds: ${ ok.map( ( r ) => `${ r.selector } ${ rangeText( r.range ) } ${ r.decls.join( ' ' ) }` ).join( ', ' ) }`;
		const puts = customCssPuts( node, { css: ok.map( ( r ) => r.css ).join( ' ' ), label, key: `css${ rec.index }`, why: 'no setting' } );
		for ( const x of puts ) {
			const { before, after } = setAttr( node, { attr: x.attr, value: x.value } );
			out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: x.prop, attr: x.attr, before, after, widths: [], how: 'custom-css' } );
		}
		for ( const r of ok ) {
			const props = [ ...new Set( r.rows.map( ( row ) => row.property ) ) ];
			out.gaps.push( { node: ref, block: rec.name, slot: r.rows[ 0 ].slot ?? '', properties: props, range: r.range, css: r.css, how: 'no setting', control: `a ${ props.join( ', ' ) } setting on ${ rec.name }${ r.rows[ 0 ].slot ? ` for ${ r.rows[ 0 ].slot }` : '' }${ r.rows[ 0 ].state ? ` under ${ r.rows[ 0 ].state }` : '' }`, reason: `custom-css: ${ props.join( ', ' ) } ${ rangeText( r.range ) } is applied through ${ rec.name }'s Custom CSS until a setting exists, because no setting of ${ rec.name } holds it` } );
		}
		const done = [ ...new Set( ok.flatMap( ( r ) => r.rows ) ) ];
		// The row stays a gap (Bean 2026-10-31): the framework still owes the setting, so it keeps its reason's code and says
		// the value is applied through the block's Custom CSS until that setting exists.
		out.unmapped.push( ...done.map( ( row ) => {
			const css = ok.filter( ( r ) => r.rows.includes( row ) ).map( ( r ) => r.css ).join( ' ' );
			return { ...row, appliedCss: css, reason: `${ row.reason }; applied through ${ rec.name }'s Custom CSS until a setting holds it: ${ css }` };
		} ) );
		out.notes.push( `${ ref } ${ rec.name }: ${ done.length } draft declaration${ 1 === done.length ? '' : 's' } no setting holds written to Custom CSS as ${ ok.length } scoped rule${ 1 === ok.length ? '' : 's' }` );
	}
	// The rows of several nodes join back into one row per look and reason.
	out.unmapped = regroup( out.unmapped );
	return out;
}
