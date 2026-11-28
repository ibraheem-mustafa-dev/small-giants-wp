// Fill resolution state (FR-47-4 steps 2 and 3): the run state built once, the baselines an element is judged against,
// the divergence ledger view and the spacing-ownership plan per node.
import { HOVER_PROPS } from '../../parity/lib/collect.mjs';
import { blockSchema, splitProperty, LOOSE } from './resolve.mjs';
import { refOf, walk } from './tree.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { INHERITED, CARRIED, FLEX_ONLY, TIER_WIDTHS, defaultPaint } from './fill-prop.mjs';
import { candidates } from './db.mjs';
import { paintedProps } from './css-families.mjs';
import { calSameBox } from './fill-same-box.mjs';
import { pageBaseline } from './fill-page.mjs';
import { spacingOwnership } from './fill-spacing.mjs';
import { unstyledBaseline } from './fill-fixture.mjs';
import { match as ledgerMatch } from './ledger.mjs';
import { contextDiffs, heldPainters, measuredContext } from './equal-context.mjs';
import { elementContext } from './fill-held.mjs';

export const GAP_PROPS = [ 'row-gap', 'column-gap' ];
export const slugClass = ( name ) => `sgs-${ name.replace( /^sgs\//, '' ) }`;
export const json = ( v ) => JSON.stringify( v );

// A draft's per-width values as one readable value: the value itself when every width agrees, else { width: value }.
export function valueText( draft ) {
	const vals = Object.values( draft );
	return vals.every( ( v ) => v === vals[ 0 ] ) ? String( vals[ 0 ] ) : json( draft );
}

// Whether a calibrated slot path reaches an element of a block nested in this one: a step named by another block's root
// class (`.sgs-button`, `.sgs-button:nth-of-type(1)`), where the block's own parts are BEM elements (`.sgs-container__inner`).
// A setting at such a slot (a parent's `child*` setting) is read from the nested block's own element, never from the parent's.
export const reachesChildBlock = ( slot ) => String( slot ?? '' ).split( /\s*>\s*|\s+/ ).some( ( step ) => /^\.sgs-[a-z0-9]+(?:-[a-z0-9]+)*(?::nth-of-type\(\d+\))?$/.test( step ) );

// The box and paint properties a block's settings paint on a part of the element's own box: the border family, radius
// corners, background, box-shadow, opacity and overflow.
const BOX_PAINT = /^(background-.+|border-.+|box-shadow|opacity|overflow(-[xy])?)$/;
// The size of the element's own box: a part calibration measured as the same box at every width holds it as well (a disc the
// draft draws as one element, which the block draws as its root around a shape).
const BOX_SIZE = /^(width|height)$/;

// Whether `part` is a paint layer of the element at `own` (its `::before` or `::after`) or a part calibration measured as the
// same box (lib/fill-same-box.mjs::calSameBox): the places a setting can paint the element's own box. A part that is a
// different box (an overlay, a glyph, an inner band with its own padding) is not the element's paint.
const ownBox = ( cal, own, part ) => part === `${ own }::before` || part === `${ own }::after` || calSameBox( cal, own, part );

// The slots other than the element's own where a setting for a property could paint it, from calibration (the slot truth,
// R-47-6), except those that paint a nested block's element. A carried property (text, gap, alignment: read on the root,
// painted on an inner element) tries every such slot. A box or paint property (BOX_PAINT) or the box's size (BOX_SIZE) tries
// those of the element's own box (ownBox) when the caller names `apart`, the slots the node's other targets read and `own`
// the slot being read: a setting painting a slot another target reads, or a slot inside that target's element, is that
// element's own business (its own reading finds the setting: the glyph's size setting, measured on the glyph and the svg the
// draft reads, is never the disc's), and a part of its own box with no element of its own in the draft (a label's `::after`
// layer, an icon's shape) is not. Any other property tries none.
export function alternateSlots( cal, prop, draft = {}, apart = null, own = '' ) {
	// A layout setting calibration discovered painting display sits on the element laying out the children. A hide
	// (display:none at any width) stays on the element's own slot: the layout element is not the one the draft hides.
	if ( 'display' === prop ) {
		// One copy of a repeated item read as the element (its own last step is `:nth-of-type(n)`) is laid out by its container:
		// a grid item's blockified display is never the container's layout (a gallery tile's `block` is no masonry grid).
		if ( Object.values( draft ).some( ( v ) => 'none' === String( v ).trim() ) || /:nth-of-type\(\d+\)$/.test( String( own ?? '' ) ) ) {
			return [];
		}
		// One copy of a repeated item (a step, a card: its last step is `:nth-of-type(n)`) lays out its own content, not the
		// block's children: the root's grid is never an item's display (three-column steps would read as the vertical list layout).
		return Object.values( cal?.discovered || {} ).flatMap( ( d ) => d.display?.slots || [] ).filter( ( slot ) => ! /:nth-of-type\(\d+\)$/.test( String( slot ) ) );
	}
	const carried = CARRIED.includes( prop );
	if ( ! carried && ! ( apart && ( BOX_PAINT.test( prop ) || BOX_SIZE.test( prop ) ) ) ) {
		return [];
	}
	const names = new Set( [ prop, prop.replace( /^(row|column)-gap$/, 'gap' ), splitProperty( prop ).short ] );
	const taken = new Set( ( apart || [] ).map( ( p ) => String( p ?? '' ) ) );
	// A slot another target reads, or one inside such a target's element: that element's own business.
	const others = [ ...taken ].filter( ( t ) => t !== String( own ?? '' ) );
	const othersRead = ( p ) => others.some( ( t ) => String( p ?? '' ) === t || String( p ?? '' ).startsWith( `${ t } > ` ) );
	return Object.values( cal?.settings || {} ).filter( ( s ) => paintedProps( s ).some( ( q ) => names.has( q ) ) && ! s.state && ( carried || ! ( s.slots || [ s.slot ] ).some( othersRead ) ) ).flatMap( ( s ) => [ ...( s.slots || [ s.slot ] ), ...( s.reaches || [] ) ] ).filter( ( p ) => ! reachesChildBlock( p ) && ( carried || ( ! taken.has( String( p ?? '' ) ) && ! othersRead( p ) && ownBox( cal, own, String( p ?? '' ) ) ) ) );
}

export const RADIUS_CORNERS = [ 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ];

// The four corner radii of an element as one `border-radius` draft ({ width: value }), when every corner is stated at the
// same widths with one value per width (a circle's 50%, a card's 8px): the shorthand is then the one reading the slot is
// chosen for, and one row stands for four. Null when any corner is missing or two differ at a width. drafts: { prop:
// { width: value } }.
export function mergedRadius( drafts ) {
	const [ first, ...rest ] = RADIUS_CORNERS.map( ( p ) => drafts[ p ] || {} );
	const widths = Object.keys( first );
	if ( ! widths.length ) {
		return null;
	}
	const same = ( d ) => Object.keys( d ).length === widths.length && widths.every( ( w ) => undefined !== d[ w ] && String( d[ w ] ).trim() === String( first[ w ] ).trim() );
	return rest.every( same ) ? { ...first } : null;
}

// The state a Fill run reads: one object built once, passed to every step.
export function makeState( o ) {
	const flat = [];
	walk( o.tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	return {
		...o, flat,
		out: { writes: [], unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [], unread: [], images: [], settled: [] },
		shown: new Map(), // `${index}|${prop}` -> { width: value } for the node's own element, once resolved
		gapSet: new Map(), // `${index}|${prop}` -> { width: value } the parent decided from rendered gaps
		margins: new Map(), // child index -> { width: [margin sides the parent owns] }
		pages: o.pages ?? null, // the page map rows (a hash route is written as its page's permalink)
		notedBlocks: new Set(),
		fixtureViews: new Map(), // block -> its calibration fixture's styling preconditions (lib/fill-fixture.mjs)
		page: ( ( cache ) => ( tag ) => {
			if ( ! cache.has( tag ) ) {
				cache.set( tag, pageBaseline( o.rawSnapshot, tag ) );
			}
			return cache.get( tag );
		} )( new Map() ),
	};
}

// The element tag a node paints, for the theme's element styles: a heading's level, a block's tag, else the root tag
// calibration saw.
const tagOf = ( st, rec, cal ) => {
	const a = st.flat[ rec.index ].attributes || {};
	return a.level || a.tagName || cal?.elements?.[ '' ]?._tag;
};

// The value an ancestor's element shows for an inherited property at a width, nearest first. A line height is inherited
// as a ratio of the element's own font size, so it is carried as that ratio.
function inheritedFrom( st, rec, prop, w, ownFontPx ) {
	for ( let i = rec.parent; null !== i; i = st.nodes[ i ].parent ) {
		const v = shownAt( st, i, prop, w, ownFontPx );
		if ( undefined !== v ) {
			return v;
		}
	}
	return undefined;
}

// What node `index` shows for an inherited property at a width, as the value a node of font size ownFontPx inherits.
function shownAt( st, index, prop, w, ownFontPx ) {
	const v = st.shown.get( `${ index }|${ prop }` )?.[ w ];
	if ( 'line-height' !== prop || undefined === v || ! ownFontPx ) {
		return v;
	}
	const fs = parseFloat( st.shown.get( `${ index }|font-size` )?.[ w ] );
	return fs ? `${ Math.round( ( parseFloat( v ) / fs ) * ownFontPx * 100 ) / 100 }px` : v;
}

// The block's own paint of an inherited property at a slot, where its stylesheet sets one on that element (calibration
// records it as `_own:<prop>` beside the element's font size `_fs`). A line
// height is carried as its ratio of the font size to the element's own font size fs. Undefined where the element inherits.
export function ownPaint( cal, slot, w, prop, fs ) {
	const v = defaultPaint( cal, slot, w, `_own:${ prop }` );
	const px = parseFloat( v );
	const base = parseFloat( defaultPaint( cal, slot, w, '_fs' ) );
	return 'line-height' === prop && fs && base && ! Number.isNaN( px ) ? `${ Math.round( ( px / base ) * fs * 100 ) / 100 }px` : v;
}

// The block's own paint of an inherited property on the nearest part that holds the slot's element and sets one (a glyph inside
// an icon's shape inherits the shape's colour, not the colour the block's root shows). The root is not a part here: what the
// root shows is the node's shown value. Undefined where no part between the root and the slot sets one.
export function partOwnPaint( cal, slot, w, prop, fs ) {
	const steps = String( slot ?? '' ).split( /\s*>\s*/ ).filter( Boolean );
	for ( let i = steps.length - 1; i >= 1; i-- ) {
		const v = ownPaint( cal, steps.slice( 0, i ).join( ' > ' ), w, prop, fs );
		if ( undefined !== v ) {
			return v;
		}
	}
	return undefined;
}

// The value a flex-only property (flex-wrap, flex-direction) paints once the block's layout is flex, for an element whose
// calibrated default paint is no flex container: its computed value there is the CSS initial (a block reads `nowrap`, `row`),
// which says nothing about the flex layout a clone writes. The block's own setting for the property holds that value as its
// default (sgs/container's flexWrap `wrap`), so a draft flex row that does not wrap differs from it and is written. A tier
// object default is read at the width's tier. Undefined where the default paint is already a flex container, the block has no
// such setting, or the setting has no plain default.
const TIER_OF = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };
function flexLayoutDefault( st, rec, cal, prop, slot, w ) {
	const display = defaultPaint( cal, slot, w, 'display' );
	if ( ! st.db || undefined === display || /(^|-)flex$/.test( display ) ) {
		return undefined;
	}
	const schema = blockSchema( rec.name ) || {};
	for ( const row of candidates( st.db, rec.name, prop ) ) {
		const given = schema[ row.attr_name ]?.default;
		const v = given && 'object' === typeof given ? ( given[ TIER_OF[ 1920 === w ? 1440 : w ] ] ?? given.desktop ) : given;
		if ( 'string' === typeof v && '' !== v ) {
			return v;
		}
	}
	return undefined;
}

// What the node shows at a slot with nothing written. A non-inherited property shows its calibrated default paint. An
// inherited one (R-47-5) shows the block's own paint of it where its stylesheet sets one (ownPaint), else what its parent
// shows, or at the top of the surface what the theme gives the page; a theme element style (a heading's family and
// weight) beats the parent. ownFontPx( width ): the element's own font size.
export function baselineFn( st, rec, cal, prop, ownFontPx = () => undefined ) {
	const at = baselineSourceFn( st, rec, cal, prop, ownFontPx );
	return ( slot, w ) => at( slot, w ).value;
}

// The names a baseline's source takes: the block's own stylesheet paint, the theme's style for the element, the node's own
// element (for a part), the parent's shown value, the painting setting's flex default, the calibration fixture's unstyled
// value, the calibrated default paint, the page gutter (lib/fill-gutter.mjs::gutterBaseline's substitute), and what a setting
// the node holds paints there as calibration read it (contextBaseline).
export const BASELINE_SOURCES = [ 'block-own', 'theme', 'own-element', 'parent', 'flex-default', 'fixture-unstyled', 'calibrated-default', 'page-gutter', 'held-setting' ];

// The display the clone shows on each element of a node, recorded as Fill resolves `display` (it is the first property an
// element resolves, lib/fill-read.mjs::PROPS): `shownAt( width )` where the caller knows it (the draft's value where it was
// written, the baseline the draft was judged equal to, which an equivalent spelling of the draft's value may differ from),
// else the block's default paint. `${ index }|${ slot }` -> { width: value }.
export function recordDisplay( st, rec, cal, slot, draft, shownAt = null ) {
	st.cloneDisplay ??= new Map();
	st.cloneDisplay.set( `${ rec.index }|${ slot }`, Object.fromEntries( Object.keys( draft ).map( ( w ) => [ Number( w ), shownAt?.( Number( w ) ) ?? defaultPaint( cal, slot, Number( w ), 'display' ) ] ) ) );
}

// The node's own context at a slot and width as the clone shows it (lib/equal-context.mjs::contextDiffs's `node`): the
// display recorded for the element and for the element it sits in (the parent node's root, or the part above), the draft's
// position, and the settings the node holds that calibration read painting the slot otherwise than `calibrated`. Null where
// the node reads no element at the slot (an alternate slot): its context is the calibrated one.
function nodeContext( st, rec, cal, prop, slot, w, calibrated ) {
	const target = ( rec.targets || [] ).find( ( t ) => t.slot === slot );
	if ( ! target || ! st.reads ) {
		return null;
	}
	const shown = ( index, at ) => st.cloneDisplay?.get( `${ index }|${ at }` )?.[ w ];
	const steps = slot.split( /\s*>\s*/ ).filter( Boolean );
	return {
		parentDisplay: steps.length ? shown( rec.index, steps.slice( 0, -1 ).join( ' > ' ) ) : null === rec.parent ? undefined : shown( rec.parent, '' ),
		display: shown( rec.index, slot ),
		position: elementContext( st, rec, target, w ).position,
		held: heldPainters( cal, blockSchema( rec.name ) || {}, st.flat[ rec.index ]?.attributes, slot, prop, w, calibrated ),
	};
}

// The baseline a calibrated default gives once the node's context is weighed (mechanism A): the default itself where the node
// sits in the context calibration measured it in, or where no difference changes the property (lib/equal-context.mjs::
// contextDiffs); what a setting the node holds paints there, where calibration read it (`held-setting`); otherwise no
// baseline (`context-<kind>`), so the draft's value is written rather than judged equal to a value the node does not show.
function contextBaseline( st, rec, cal, prop, slot, w, found ) {
	const key = Object.keys( cal?.elements || {} ).find( ( k ) => LOOSE( k ) === LOOSE( slot ) );
	const measured = measuredContext( undefined !== key ? cal.elements[ key ]?.[ String( 1920 === w ? 1440 : w ) ] : null );
	const diffs = contextDiffs( prop, slot, measured, nodeContext( st, rec, cal, prop, slot, w, found.value ) );
	if ( ! diffs.length ) {
		return found;
	}
	const read = diffs.find( ( d ) => 'held-setting' === d.kind && d.read )?.read?.[ String( 1920 === w ? 1440 : w ) ];
	return undefined !== read && 1 === diffs.length ? { value: read, source: 'held-setting' } : { value: undefined, source: `context-${ diffs[ 0 ].kind }` };
}

// baselineFn with the source of each answer: ( slot, width ) => { value, source }, `source` one of BASELINE_SOURCES, or null
// where nothing gave a value.
export function baselineSourceFn( st, rec, cal, prop, ownFontPx = () => undefined ) {
	const page = st.page( tagOf( st, rec, cal ) );
	const first = ( steps ) => {
		let value;
		for ( const [ source, get ] of steps ) {
			value = get();
			if ( null !== value && undefined !== value ) {
				return { value, source };
			}
		}
		return { value, source: null };
	};
	return ( slot, w ) => {
		if ( INHERITED.includes( prop ) && ! slot.includes( '::' ) ) {
			const fs = ownFontPx( w );
			const own = ownPaint( cal, slot, w, prop, fs ) ?? partOwnPaint( cal, slot, w, prop, fs );
			if ( undefined !== own ) {
				return { value: own, source: 'block-own' };
			}
			if ( page.own( prop ) ) {
				return { value: page.value( prop, w, fs ), source: 'theme' };
			}
			return first( [
				[ 'own-element', () => ( '' === slot ? undefined : shownAt( st, rec.index, prop, w, fs ) ) ],
				[ 'parent', () => inheritedFrom( st, rec, prop, w, fs ) ],
				[ 'theme', () => page.value( prop, w, fs ) ],
				[ 'calibrated-default', () => defaultPaint( cal, slot, w, prop ) ],
			] );
		}
		const flexDefault = FLEX_ONLY.includes( prop ) ? flexLayoutDefault( st, rec, cal, prop, slot, w ) : undefined;
		if ( undefined !== flexDefault ) {
			return { value: flexDefault, source: 'flex-default' };
		}
		// A property the calibration fixture switched on (lib/fill-fixture.mjs) is compared with its unstyled value; the calibrated
		// default stands only in the context it was measured in (contextBaseline).
		const found = first( [
			[ 'fixture-unstyled', () => unstyledBaseline( st, rec.name, cal, blockSchema( rec.name ), slot, prop ) ],
			[ 'calibrated-default', () => defaultPaint( cal, slot, w, prop ) ],
		] );
		return 'calibrated-default' === found.source ? contextBaseline( st, rec, cal, prop, slot, w, found ) : found;
	};
}

// Which baseline made a draft value equal, for a settled `equal` row: one source name where every width the resolver compared
// agrees (the tier widths, lib/fill-prop.mjs::tiersDiffering; a draft width beside them, 1920 or 1024, was never judged), else
// { width: name }. `sourceAt` is baselineSourceFn's function and `usedAt` the baseline the resolver was given: where the two
// differ the gutter baseline substituted the page gutter.
export function equalBaseline( sourceAt, usedAt, slot, draftWidths ) {
	const widths = draftWidths.filter( ( w ) => TIER_WIDTHS.includes( Number( w ) ) );
	const names = widths.map( ( w ) => {
		const s = sourceAt( slot, w );
		return usedAt( slot, w ) !== s.value ? 'page-gutter' : s.source ?? 'none';
	} );
	return new Set( names ).size <= 1 ? names[ 0 ] ?? null : Object.fromEntries( widths.map( ( w, i ) => [ w, names[ i ] ] ) );
}

// The divergence ledger over one property's draft values (R-47-8): a value entry replaces the draft at its widths, a rule
// entry leaves the width unwritten. Returns { draft, rules, held }.
export function ledgerView( st, rec, ref, prop, draft, pseudo ) {
	const out = { draft: { ...draft }, rules: [], held: [] };
	for ( const w of Object.keys( draft ).map( Number ) ) {
		for ( const state of st.ledgerStates.length ? st.ledgerStates : [ undefined ] ) {
			const e = ledgerMatch( st.ledger, { ref, block: slugClass( rec.name ), property: prop, state, width: w, kind: 'style', pseudo: pseudo || null } );
			if ( e ) {
				if ( 'value' in e.expected && HOVER_PROPS.includes( prop ) && '*' !== e.state ) {
					// The walker judges this entry against hover rows too, and Fill reads the rest state: a decided hover
					// value is never a rest value. Solve applies it where the row exists.
					out.held.push( { id: e.id, width: w, applied: false } );
				} else if ( 'value' in e.expected ) {
					out.draft[ w ] = e.expected.value;
					out.held.push( { id: e.id, width: w, applied: true } );
				} else {
					delete out.draft[ w ];
					out.rules.push( { id: e.id, width: w, rule: e.expected.rule } );
				}
				break;
			}
		}
	}
	return out;
}

// The node's element that holds its gap: the target at the calibrated slot of the block's `gap` setting when the
// skeleton gives one (a container's inner element), else the node's own element.
export const gapTarget = ( st, rec ) => {
	const slot = st.calFor( rec.name, rec )?.settings?.gap?.slot;
	return ( slot && rec.targets.find( ( t ) => t.slot === slot ) ) || rec.targets.find( ( t ) => '' === t.slot ) || null;
};

export const snapsOf = ( st, id ) => Object.fromEntries( READ_WIDTHS.map( ( w ) => [ w, st.reads.widths[ w ]?.[ id ] ] ).filter( ( [ , s ] ) => s && ! s.missing ) );
export const draftOf = ( snaps, get ) => Object.fromEntries( Object.entries( snaps ).map( ( [ w, s ] ) => [ Number( w ), get( s ) ] ).filter( ( [ , v ] ) => undefined !== v && '' !== v ) );

// Spacing ownership for one node's children, per tier (step 3), from the children's layout boxes (each read's `layoutRect`:
// its border box with transforms off, lib/fill-read-collect.mjs::collectMany; the painted box where a read has none): fills
// gapSet (the parent's gap per width) and margins (the sides each child gives up), and logs the decision. A parent with no
// element of its own, or children without one, decides nothing.
export function planSpacing( st, rec ) {
	const kids = rec.children;
	if ( ! kids.length || ! rec.targets.length ) {
		return;
	}
	// A child that reads its slots only (`draftSlotsOnly`) has no box of its own to measure: it counts as unmeasured, so the list is
	// partial and the gap is the parent's own read, never the distance between the neighbours the child's box would sit between.
	const measured = kids.filter( ( c ) => st.nodes[ c ].targets.some( ( t ) => '' === t.slot ) );
	const unmeasured = kids.length - measured.length;
	const holder = gapTarget( st, rec );
	// A child whose own draft element is not drawn at a width but which holds blocks drawn there (a block the skeleton placed
	// into a wrapper from another branch of the draft: the menu at the compact bar's burger) stands at that width as the box
	// around its drawn descendants; a child with nothing drawn stays out, as one the width gate hides.
	const below = ( c ) => ( st.nodes[ c ]?.children || [] ).flatMap( ( k ) => [ k, ...below( k ) ] );
	const drawnBox = ( s ) => ( s && ! s.missing && ( s.layoutRect || s.rect ) && false !== s.inFlow ? s.layoutRect || s.rect : null );
	const standIn = ( c, w ) => {
		const boxes = below( c ).map( ( d ) => drawnBox( st.reads.widths[ w ]?.[ `${ d }:` ] ) ).filter( ( b ) => b && ( b.w > 0 || b.h > 0 ) );
		if ( ! boxes.length ) {
			return null;
		}
		const x = Math.min( ...boxes.map( ( b ) => b.x ) );
		const y = Math.min( ...boxes.map( ( b ) => b.y ) );
		return { x, y, w: Math.max( ...boxes.map( ( b ) => b.x + b.w ) ) - x, h: Math.max( ...boxes.map( ( b ) => b.y + b.h ) ) - y, inFlow: true };
	};
	for ( const w of READ_WIDTHS ) {
		const rects = measured.map( ( c ) => {
			const s = st.reads.widths[ w ]?.[ `${ c }:` ];
			return s && ! s.missing ? { ...( s.layoutRect || s.rect ), inFlow: s.inFlow } : standIn( c, w );
		} );
		const ownership = spacingOwnership( rects, { unmeasured, declared: ( holder && st.reads.declared?.[ w ]?.[ holder.id ] ) || null } );
		if ( 'unknown' === ownership.owner || ownership.decisions.length ) {
			st.out.spacing.push( { node: refOf( st.flat[ rec.index ] ), index: rec.index, width: w, owner: ownership.owner, count: ownership.count, decisions: ownership.decisions } );
		}
		const rendered = measured.filter( ( c, i ) => rects[ i ] && false !== rects[ i ].inFlow && ( rects[ i ].w > 0 || rects[ i ].h > 0 ) );
		for ( const d of ownership.decisions ) {
			const gaps = st.gapSet.get( `${ rec.index }|${ d.prop }` ) || {};
			gaps[ w ] = d.value;
			st.gapSet.set( `${ rec.index }|${ d.prop }`, gaps );
			if ( 'parent' !== d.owner ) {
				continue;
			}
			// Margins between siblings move into the parent's gap; a first child's leading margin and a last child's
			// trailing margin are not between siblings, so they stay.
			rendered.forEach( ( c, i ) => {
				const per = st.margins.get( c ) || {};
				per[ w ] = [ ...( per[ w ] || [] ), ...d.margins.filter( ( side, k ) => ( 0 === k ? i > 0 : i < rendered.length - 1 ) ) ];
				st.margins.set( c, per );
			} );
		}
	}
}
