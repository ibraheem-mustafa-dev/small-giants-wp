// What no setting holds goes into Custom CSS (Spec 48 FR-48-109, FR-48-86's last sentence): a draft declaration every one of
// the equivalence engine's five layers failed for its block and part (lib/css-equivalence/index.mjs::consult) is written as
// a scoped rule in the block's own Additional CSS (`sgsCustomCss`, through lib/fill-width-gate.mjs::scopedCssPuts, printed
// and scoped to the instance by the plugin's includes/custom-css.php), and each distinct (block, part, property, state) is a
// gap row naming the setting the framework could add.
//
// Fill's last style pass. Every UNMAPPED row left by the passes before it is classified first (classifyRow):
//   residual   all five layers failed and no setting of the block paints the property on that part (class a);
//   route      a setting of the block paints or reaches the property there, or one paints the same box, or the row is a
//              setting's shape, pairing, reach or conflict verdict: the route's or the setting's fault, never Custom CSS,
//              which would fight that setting when someone changes it in the editor (class b);
//   unneeded   held as the block's default paint, inert, a shadow of zero lengths, or a non-inherited property's initial
//              value where calibration measured no other paint: nothing the page needs (class c);
//   outside    not a style row (content, a motion record, a walker state), a timing longhand the motion pass owns, or a
//              state look the block paints and the draft lacks.
// Only `residual` rows reach the writer, which also refuses (and lists, each with its reason): a block with no Custom CSS
// setting (framework DB); `display`, and a `position` that takes the element out of flow, with the offsets and transform
// that place it (the block's own markup decides its structure, and an out-of-flow element is placed against an ancestor
// the clone does not share); a layout property the draft does not state at every read width; a state with no CSS pseudo
// class; a part path naming one copy of a repeated element; a value or element path that is not safe CSS; and anything past
// the page's byte cap.
// Two parts of one block that read one draft element (the same box at every read width) take a property once, on the inner
// part (then on the one more of the block's own settings paint); the other row is settled as written there.
// Values per width follow the width ladder's ranges (lib/fill-width-ladder.mjs::widthSpans: the sweep's threshold, snapped to
// a tier); a value the snapshot carries as a token is written as that token's reference (a palette colour, a font family, a
// font size or spacing preset of the same px).
import { isCssProperty, canonicalName, initialOf, isInherited } from './css-families.mjs';
import { measuredHomes, paintAt } from './css-equivalence/effect.mjs';
import { sameCanonical } from './css-equivalence/values.mjs';
import { candidates } from './db.mjs';
import { calSameBox } from './fill-same-box.mjs';
import { WIDTHS, rowTarget, rowValues, perNode, regroup, answer } from './fill-regap.mjs';
import { widthSpans, STATE_PSEUDO, safeCss, effectOf } from './fill-width-ladder.mjs';
import { mediaRule, scopedCssPuts, snapEntry } from './fill-width-gate.mjs';
import { setAttr } from './tree.mjs';
import { snapColour, snapFontFamily, snapLength, toPx } from './normalise.mjs';

export const PASS = 'residual-css';
// A page's residual rules stop at a fifth of the 100 KB per-page CSS budget; what is left over is listed, not written.
export const PAGE_CAP_BYTES = 20 * 1024;

const MOTION = /^(transition|animation)(-|$)/;
// Properties that size or place the element in its parent's layout: written only where the draft states them at every
// read width, so a rule never holds one width's layout at another.
const LAYOUT = /^(display|position|top|right|bottom|left|inset(-.+)?|float|clear|(min-|max-)?(width|height)|(min-|max-)?(inline|block)-size|flex(-.+)?|grid(-.+)?|order|justify-.+|align-.+|place-.+|gap|row-gap|column-gap|margin(-.+)?|aspect-ratio)$/;
const MOTION_REST = /^(transform|transform-origin|rotate)$/;
const ALIGN = /^(justify-content|align-items|align-content|justify-items|align-self|justify-self)$/;
// The properties the motion layer holds at rest: its `rest` fields' CSS properties, and `transform` (with `rotate`) where
// a rest field is a rotation custom property the transform reads (`--sgs-rot-rest`). Read once per database.
const rests = new WeakMap();
export function restPose( db ) {
	if ( ! db ) {
		return new Set();
	}
	if ( ! rests.has( db ) ) {
		const has = db.prepare( "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'motion_fields'" ).get();
		const props = has ? db.prepare( "SELECT DISTINCT css_property FROM motion_fields WHERE state = 'rest' AND css_property IS NOT NULL" ).all().map( ( r ) => r.css_property ) : [];
		rests.set( db, new Set( [ ...props.filter( ( x ) => ! x.startsWith( '--' ) ), ...( props.some( ( x ) => /^--sgs-r(ot|x|y)-rest$/.test( x ) ) ? [ 'transform', 'rotate' ] : [] ) ] ) );
	}
	return rests.get( db );
}
// Properties that lay out the element's children.
const CONTAINER = /^(justify-content|justify-items|align-items|align-content|place-(content|items)|gap|row-gap|column-gap|flex-direction|flex-wrap|flex-flow|grid-template(-.+)?|grid-auto(-.+)?)$/;
// Out-of-flow positions, and the properties that only place an element that is positioned.
const OUT_OF_FLOW = /^(absolute|fixed|sticky)$/;
const PLACED_BY_POSITION = /^(top|right|bottom|left|inset(-.+)?|transform|translate|z-index)$/;

const holdsAttr = ( db, block, attr ) => !! db?.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr );
const LOOSE = ( p ) => String( p ?? '' ).replace( /:nth-of-type\(\d+\)/g, '' );

// The row's value at each width it states ({ width: value }), from its own value only.
function statedValues( row ) {
	try {
		const held = JSON.parse( row.value );
		if ( held && 'object' === typeof held && ! Array.isArray( held ) ) {
			return Object.fromEntries( Object.entries( held ).filter( ( [ w ] ) => WIDTHS.includes( Number( w ) ) ) );
		}
	} catch {}
	return Object.fromEntries( WIDTHS.map( ( w ) => [ w, row.value ] ) );
}

// Whether a box-shadow value paints nothing: every shadow's lengths are 0 (an inset one included).
export const zeroShadow = ( v ) => String( v ).split( /,(?![^(]*\))/ ).every( ( s ) => {
	const lengths = s.replace( /rgba?\([^)]*\)|#[0-9a-f]+|\binset\b|[a-z]+(?![\d.])/gi, ' ' ).trim().split( /\s+/ ).filter( Boolean );
	return lengths.length >= 2 && lengths.every( ( l ) => /^-?0(\.0+)?(px|em|rem)?$/.test( l ) );
} );

// The class of one UNMAPPED row: { cls: 'residual' | 'route' | 'unneeded' | 'outside', cause }. ctx: { calFor, db }.
export function classifyRow( row, { calFor, db } ) {
	const reason = String( row.reason ?? '' );
	const prop = String( row.property ?? '' );
	if ( ! isCssProperty( prop ) ) {
		return { cls: 'outside', cause: 'not a style property (content, a motion record or a walker state)' };
	}
	if ( MOTION.test( prop ) || /^timing-/.test( reason ) ) {
		return { cls: 'outside', cause: 'timing: the motion pass owns it' };
	}
	if ( /^held:/.test( row.code ?? '' ) ) {
		return { cls: 'unneeded', cause: `held as ${ row.code.slice( 5 ) } by the equivalence engine` };
	}
	if ( /^default-state:/.test( reason ) ) {
		return { cls: 'outside', cause: 'default-state: the block paints a state look the draft lacks (the gap is a setting that turns it off)' };
	}
	if ( ! /^no-setting:/.test( reason ) ) {
		const word = ( /^([a-z-]+):/.exec( reason )?.[ 1 ] ) ?? ( / is not one of /.test( reason ) ? 'enum' : 'other' );
		return { cls: 'route', cause: `${ word }: a setting of the block is named for it (${ reason.slice( 0, 120 ) })` };
	}
	if ( / held \((default|inert)\)/.test( reason ) ) {
		return { cls: 'unneeded', cause: 'held by the equivalence engine' };
	}
	const cal = calFor( row.block );
	if ( ! cal ) {
		return { cls: 'route', cause: 'uncalibrated: the block has no calibration, so no setting can be ruled out' };
	}
	const canon = canonicalName( prop );
	const slot = row.slot ?? '';
	const state = row.state ?? null;
	// A yes/no setting tied to display is a visibility toggle: it paints only the hidden state (lib/resolve.mjs::resolve's
	// holdsDisplay), so it is no home for a display the draft shows the element with.
	const values = Object.entries( statedValues( row ) );
	const toggle = ( attr ) => 'display' === canon && ! values.some( ( [ , v ] ) => 'none' === String( v ).trim() ) && 'boolean' === db?.prepare( 'SELECT attr_type FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( row.block, attr )?.attr_type;
	const homes = measuredHomes( cal, { slot, prop: canon, state } ).filter( ( h ) => ( 'property' === h.via || 'reaches' === h.via ) && ! toggle( h.attr ) );
	if ( homes.length ) {
		return { cls: 'route', cause: `equal-judging: ${ homes.map( ( h ) => h.attr ).join( ', ' ) } ${ 1 === homes.length ? 'paints' : 'paint' } ${ canon } on this part (calibration), so the value is a setting's to hold` };
	}
	// A setting of the block for the property that paints a part calibration measured as the same box as this one.
	const same = candidates( db, row.block, canon, state ).find( ( r ) => {
		const c = cal.settings?.[ r.attr_name.replace( /(Tablet|Mobile)$/, '' ) ];
		return c && [ ...( c.slots || [ c.slot ] ), ...( c.reaches || [] ) ].some( ( p ) => undefined !== p && LOOSE( p ) !== LOOSE( slot ) && ! String( p ).startsWith( '@' ) && calSameBox( cal, slot, p ) );
	} );
	if ( same ) {
		return { cls: 'route', cause: `pairing: ${ same.attr_name } paints ${ canon } on a part that is the same box as this one` };
	}
	// The block's motion layer holds a resting pose (motion_fields rows of state `rest`: a resting origin, and resting rotations
	// as custom properties the transform reads): a resting transform or origin on a block with motion targets is the motion
	// pass's to write, never Custom CSS, which would fight the pose someone later sets in the motion panel.
	if ( ! state && MOTION_REST.test( canon ) && restPose( db ).has( canon ) && db.prepare( 'SELECT 1 FROM motion_targets WHERE block_slug = ?' ).get( row.block ) ) {
		return { cls: 'route', cause: `motion-rest: the block's motion layer holds a resting ${ canon } (motion_fields, state rest)` };
	}
	// A value that does at every width what the block's part already paints (the width ladder's effect rule: `normal`
	// justify-content in a flex container is its start) needs nothing.
	if ( ALIGN.test( canon ) && values.length && values.every( ( [ w, v ] ) => {
		const ctx = { display: String( paintAt( cal, slot, 'display', Number( w ) )?.value ?? '' ) };
		const painted = paintAt( cal, slot, canon, Number( w ) )?.value;
		return undefined !== painted && effectOf( canon, v, ctx ) === effectOf( canon, painted, ctx );
	} ) ) {
		return { cls: 'unneeded', cause: `equal in effect to the ${ canon } the block's part already paints` };
	}
	const unpainted = ( w ) => [ undefined, 'none' ].includes( paintAt( cal, slot, canon, Number( w ) )?.value );
	if ( 'box-shadow' === canon && values.length && values.every( ( [ w, v ] ) => zeroShadow( v ) && unpainted( w ) ) ) {
		return { cls: 'unneeded', cause: 'a shadow whose offsets, blur and spread are all 0 paints nothing, and the block paints no shadow there' };
	}
	const initial = initialOf( canon );
	// An inherited property takes its parent's value, not its initial one, so an unmeasured paint proves nothing there.
	if ( null !== initial && ! isInherited( canon ) && values.length && values.every( ( [ w, v ] ) => sameCanonical( canon, v, initial ) && undefined === paintAt( cal, slot, canon, Number( w ) )?.value ) ) {
		return { cls: 'unneeded', cause: `the initial value ${ initial }, where calibration measured no other paint` };
	}
	return { cls: 'residual', cause: 'all five equivalence layers failed and no setting of the block paints it on this part' };
}

// A value with each token the snapshot carries replaced by its reference: a palette colour (exact or within the route's
// ΔE), a font family's first family, a font size or spacing preset of the same px. Returns { value, refs }.
export function tokenised( prop, value, snapshot ) {
	if ( ! snapshot ) {
		return { value, refs: [] };
	}
	const refs = [];
	let out = String( value ).replace( /rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi, ( c ) => {
		const s = snapColour( c, snapshot );
		if ( 'slug' === s?.form ) {
			refs.push( `${ c } is the palette's ${ s.value }` );
			return `var(--wp--preset--color--${ s.value })`;
		}
		return c;
	} );
	if ( 'font-family' === prop ) {
		const slug = snapFontFamily( out, snapshot );
		if ( slug ) {
			refs.push( `${ out } is the font family ${ slug }` );
			out = `var(--wp--preset--font-family--${ slug })`;
		}
	}
	const presets = 'font-size' === prop ? [ 'fontSizes', 'font-size' ] : ( /^(padding|margin)(-.+)?$|^(row-|column-)?gap$/.test( prop ) ? [ 'spacing', 'spacing' ] : null );
	if ( presets && /^-?\d*\.?\d+px$/.test( out.trim() ) ) {
		const hit = snapLength( toPx( out ), snapshot[ presets[ 0 ] ] || [] );
		if ( hit && 'exact' === hit.kind ) {
			refs.push( `${ out } is the ${ presets[ 1 ] } preset ${ hit.slug }` );
			out = `var(--wp--preset--${ presets[ 1 ] }--${ hit.slug })`;
		}
	}
	return { value: out, refs };
}

// Whether two targets of a node read one draft element: the same box at every width both are read at (at least one).
function sameElement( reads, a, b ) {
	const both = WIDTHS.filter( ( w ) => reads.widths?.[ w ]?.[ a.id ]?.rect && reads.widths?.[ w ]?.[ b.id ]?.rect );
	return both.length > 0 && both.every( ( w ) => {
		const x = reads.widths[ w ][ a.id ].rect;
		const y = reads.widths[ w ][ b.id ].rect;
		return [ 'x', 'y', 'w', 'h' ].every( ( k ) => Math.abs( ( x[ k ] ?? 0 ) - ( y[ k ] ?? 0 ) ) <= 0.5 );
	} );
}

// How deep a part sits in the block (the root is 0): of two parts that are one box, the inner one is the element that paints
// (the outer one wraps it), so its font, padding and paint are the draft element's.
const depth = ( slot ) => ( slot ? String( slot ).trim().split( /\s*>\s*|\s+/ ).length : 0 );
// How many of the block's own settings (not the shared extensions every block carries on its root) paint a part.
const paintedOn = ( cal, db, block, slot ) => Object.entries( cal?.settings || {} ).filter( ( [ a, c ] ) => ( c.slots || [ c.slot ] ).some( ( p ) => LOOSE( p ) === LOOSE( slot ) ) && 'sgs-ext' !== db?.prepare( 'SELECT source FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, a )?.source ).length;

const rangeText = ( [ lo, hi ] ) => ( Infinity === hi ? ( 0 === lo ? 'every width' : `${ lo }px and up` ) : `${ lo }-${ hi - 1 }px` );

// The pass. Returns { writes, unmapped (the rows left), answered, notes, ledger, rules (one per written rule: node, block,
// part, state, range, declarations, css, bytes, reason), refused ([ { node, block, slot, property, state, value, reason } ]),
// gaps (one per written rule, the customCssGaps shape), backlog (one per distinct block, part, property and state: the
// framework's gap rows), classes ({ residual, route, unneeded, outside } counts, and causes), bytes }.
export function residualCssWrites( { nodes, flat, refOf, reads, db, unmapped, calFor = () => null, snapshot = null, scope = '', entries = [], date = new Date().toISOString().slice( 0, 10 ), cap = PAGE_CAP_BYTES } ) {
	const out = { writes: [], unmapped: [], answered: [], notes: [], ledger: [], rules: [], refused: [], gaps: [], backlog: [], classes: { residual: 0, route: 0, unneeded: 0, outside: 0 }, causes: {}, bytes: 0 };
	const byNode = new Map();
	for ( const row of perNode( unmapped ) ) {
		const { cls, cause } = classifyRow( row, { calFor, db } );
		out.classes[ cls ]++;
		const key = `${ cls }: ${ cause.split( ':' )[ 0 ] }`;
		out.causes[ key ] = ( out.causes[ key ] || 0 ) + 1;
		const hit = 'residual' === cls ? rowTarget( { nodes, flat, refOf }, row ) : null;
		if ( ! hit ) {
			out.unmapped.push( row );
			continue;
		}
		byNode.has( hit.rec.index ) || byNode.set( hit.rec.index, { rec: hit.rec, rows: [] } );
		byNode.get( hit.rec.index ).rows.push( { row, target: hit.target } );
	}
	const refuse = ( { row }, reason ) => {
		out.refused.push( { node: row.node, block: row.block, slot: row.slot ?? '', property: row.property, state: row.state ?? null, value: row.value, reason } );
		out.unmapped.push( { ...row, reason: `${ row.reason }; residual-css: not written: ${ reason }` } );
	};
	for ( const { rec, rows } of byNode.values() ) {
		const node = flat[ rec.index ];
		if ( ! holdsAttr( db, rec.name, 'sgsCustomCss' ) ) {
			rows.forEach( ( r ) => refuse( r, `${ rec.name } has no Custom CSS setting (sgsCustomCss, framework DB)` ) );
			continue;
		}
		const cal = calFor( rec.name );
		// One home part per property and state among the parts that read one draft element.
		const kept = [];
		const twins = [];
		for ( const r of rows ) {
			const twin = kept.find( ( k ) => k.row.property === r.row.property && ( k.row.state ?? null ) === ( r.row.state ?? null ) && k.target.id !== r.target.id && sameElement( reads, k.target, r.target ) );
			if ( ! twin ) {
				kept.push( r );
				continue;
			}
			const rank = ( x ) => [ depth( x.target.slot ), paintedOn( cal, db, rec.name, x.target.slot ) ];
			const [ a, b ] = [ rank( r ), rank( twin ) ];
			const [ win, lose ] = a[ 0 ] > b[ 0 ] || ( a[ 0 ] === b[ 0 ] && a[ 1 ] > b[ 1 ] ) ? [ r, twin ] : [ twin, r ];
			kept[ kept.indexOf( twin ) ] = win;
			twins.push( { ...lose, sameAs: win } );
			out.notes.push( `${ lose.row.node } ${ rec.name } ${ lose.row.property }: ${ lose.target.slot || 'the root' } and ${ win.target.slot || 'the root' } read one draft element; written once, on ${ win.target.slot || 'the root' }, the inner of the two` );
		}
		// Out-of-flow positions are refused, and with them what only places a positioned element on that part.
		const unplaced = new Set( kept.filter( ( r ) => 'position' === canonicalName( r.row.property ) && Object.values( statedValues( r.row ) ).some( ( v ) => OUT_OF_FLOW.test( String( v ).trim() ) ) ).map( ( r ) => `${ r.target.slot }|${ r.row.state ?? '' }` ) );
		const decls = [];
		for ( const r of kept ) {
			const { row, target } = r;
			const prop = canonicalName( row.property );
			const state = row.state ?? null;
			const pseudo = state ? STATE_PSEUDO[ state ] : '';
			const where = `${ target.slot }|${ state ?? '' }`;
			if ( 'display' === prop ) {
				refuse( r, 'display: the block\'s own markup decides how its element is laid out; a different display would fight it' );
				continue;
			}
			if ( 'position' === prop && unplaced.has( where ) ) {
				refuse( r, `position ${ row.value }: an out-of-flow element is placed against an ancestor the clone does not share` );
				continue;
			}
			if ( PLACED_BY_POSITION.test( prop ) && unplaced.has( where ) ) {
				refuse( r, `${ prop } places an element whose out-of-flow position is not written` );
				continue;
			}
			// A part path naming one copy of a repeated element (`:nth-of-type`) would style that copy alone, while the draft's
			// copies share the look; the copies' shared look is the loop's to write, not one instance's.
			if ( /:nth-of-type\(/.test( target.slot ) ) {
				refuse( r, `${ target.slot } names one copy of a repeated part; a rule there would style that copy alone` );
				continue;
			}
			if ( undefined === pseudo ) {
				refuse( r, `the state ${ state } has no CSS pseudo-class` );
				continue;
			}
			// The widths the draft element is read at; a state row carries its own value.
			const read = WIDTHS.filter( ( w ) => state || ( reads.widths?.[ w ]?.[ target.id ] && ! reads.widths[ w ][ target.id ].missing ) );
			const all = rowValues( row, reads, target );
			const widths = read.filter( ( w ) => undefined !== all[ w ] );
			if ( ! widths.length ) {
				refuse( r, 'the draft element is not read at any width' );
				continue;
			}
			if ( LAYOUT.test( prop ) && widths.length < WIDTHS.length ) {
				refuse( r, `${ prop } is a layout property and the draft states it only at ${ widths.join( ', ' ) }` );
				continue;
			}
			// An inherited property written on a block passes to the blocks inside it: written only where each child block's
			// own draft element renders the same value at every width (a child read without it proves nothing).
			if ( isInherited( prop ) ) {
				const leaks = ( rec.children || [] ).flatMap( ( i ) => {
					const kid = nodes.find( ( n ) => n.index === i );
					const t = kid?.targets.find( ( x ) => '' === ( x.slot ?? '' ) );
					return t ? widths.filter( ( w ) => {
						const at = reads.widths?.[ w ]?.[ t.id ];
						return at && ! at.missing && String( at.styles?.[ prop ] ?? '(unread)' ) !== String( all[ w ] );
					} ).map( ( w ) => `${ kid.name } renders ${ reads.widths[ w ][ t.id ].styles?.[ prop ] ?? '(unread)' } at ${ w }` ) : [];
				} );
				if ( leaks.length ) {
					refuse( r, `${ prop } is inherited and would pass to the blocks inside this one, whose draft elements differ (${ leaks.slice( 0, 3 ).join( '; ' ) })` );
					continue;
				}
			}
			// A property that lays out the element's children acts only where the block's part lays them out as the draft's
			// element does: the same display (and flex direction) at every width, by calibration's default paint.
			if ( CONTAINER.test( prop ) ) {
				const differs = widths.map( ( w ) => {
					const at = reads.widths?.[ w ]?.[ target.id ] || {};
					const draft = { ...( at.styles || {} ), ...( at.layoutDisplay ? { display: at.layoutDisplay } : {} ) };
					const keys = [ 'display', ...( /flex/.test( draft.display ?? '' ) && 'flex-direction' !== prop ? [ 'flex-direction' ] : [] ) ];
					const off = keys.filter( ( k ) => undefined === draft[ k ] || String( paintAt( cal, target.slot, k, w )?.value ?? '(unmeasured)' ) !== String( draft[ k ] ) );
					return off.length ? `${ off.map( ( k ) => `${ k } ${ paintAt( cal, target.slot, k, w )?.value ?? '(unmeasured)' } against the draft's ${ draft[ k ] ?? '(unread)' }` ).join( ', ' ) } at ${ w }` : null;
				} ).filter( Boolean );
				if ( differs.length ) {
					refuse( r, `${ prop } lays out children, and the block's part lays them out differently from the draft's element (${ differs.join( '; ' ) })` );
					continue;
				}
			}
			const values = Object.fromEntries( widths.map( ( w ) => [ w, String( all[ w ] ).trim() ] ) );
			if ( ! safeCss( prop, target.slot, Object.values( values ) ) ) {
				refuse( r, 'the value or the element path is not safe CSS' );
				continue;
			}
			const series = reads.sweep?.[ target.id ]?.[ prop ];
			const spans = widthSpans( { widths, values, series } );
			for ( const s of spans.snaps ) {
				const e = snapEntry( { scope, ref: row.node, snap: s, entries: [ ...entries, ...out.ledger ], date } );
				e && out.ledger.push( e );
			}
			const refs = [];
			const ranges = spans.ranges.map( ( s ) => {
				const t = tokenised( prop, s.value, snapshot );
				refs.push( ...t.refs );
				return { range: s.range, value: t.value };
			} );
			decls.push( { r, prop, state, pseudo, slot: target.slot, ranges, widths, refs } );
		}
		// One rule per part, state and width range.
		const groups = new Map();
		for ( const d of decls ) {
			for ( const s of d.ranges ) {
				const k = JSON.stringify( [ d.slot, d.pseudo, s.range ] );
				groups.has( k ) || groups.set( k, { slot: d.slot, pseudo: d.pseudo, state: d.state, range: s.range, decls: [] } );
				const list = groups.get( k ).decls;
				// One declaration per property in a rule: two rows for one property (twins the box test did not join) keep the first.
				list.some( ( x ) => x.prop === d.prop ) || list.push( { prop: d.prop, value: s.value, d } );
			}
		}
		// Rules at every width first, then the @media rules from the narrowest range up; resting before a state.
		const order = ( g ) => ( 0 === g.range[ 0 ] && Infinity === g.range[ 1 ] ? -1 : g.range[ 0 ] );
		const rules = [ ...groups.values() ].sort( ( a, b ) => order( a ) - order( b ) || a.slot.localeCompare( b.slot ) || ( a.pseudo || '' ).localeCompare( b.pseudo || '' ) ).map( ( g ) => {
			const body = `&${ g.slot ? ` ${ g.slot }` : '' }${ g.pseudo || '' } { ${ g.decls.map( ( x ) => `${ x.prop }: ${ x.value };` ).join( ' ' ) } }`;
			return { ...g, css: 0 === g.range[ 0 ] && Infinity === g.range[ 1 ] ? body : mediaRule( g.range, body ) };
		} );
		if ( ! rules.length ) {
			twins.forEach( ( t ) => out.unmapped.push( t.row ) );
			continue;
		}
		const css = rules.map( ( g ) => g.css ).join( ' ' );
		const bytes = Buffer.byteLength( css );
		if ( out.bytes + bytes > cap ) {
			decls.forEach( ( d ) => refuse( d.r, `the page's residual Custom CSS would pass its cap of ${ cap } bytes` ) );
			twins.forEach( ( t ) => out.unmapped.push( t.row ) );
			continue;
		}
		const props = [ ...new Set( decls.map( ( d ) => d.prop ) ) ];
		const label = `Residual (no setting holds it): ${ props.join( ', ' ) }`;
		for ( const x of scopedCssPuts( node, { css, index: rec.index, why: 'residual', label } ) ) {
			const { before, after } = setAttr( node, { attr: x.attr, value: x.value } );
			out.writes.push( { node: refOf( node ), index: rec.index, block: rec.name, slot: '', prop: `(residual css) ${ x.prop }`, covers: props.join( ', ' ), attr: x.attr, before, after, widths: [ ...new Set( decls.flatMap( ( d ) => d.widths ) ) ].sort( ( a, b ) => a - b ), how: PASS } );
		}
		out.bytes += bytes;
		const why = 'all five equivalence layers failed and no setting of the block paints it on this part';
		for ( const g of rules ) {
			out.rules.push( { node: refOf( node ), block: rec.name, part: g.slot, state: g.state, range: rangeText( g.range ), declarations: g.decls.map( ( x ) => `${ x.prop }: ${ x.value }` ), css: g.css, bytes: Buffer.byteLength( g.css ), reason: why, tokens: [ ...new Set( g.decls.flatMap( ( x ) => x.d.refs ) ) ] } );
			out.gaps.push( { node: refOf( node ), block: rec.name, slot: g.slot, properties: g.decls.map( ( x ) => x.prop ), range: g.range, css: g.css, how: PASS, control: g.decls.map( ( x ) => `a ${ x.prop }${ g.state ? ` (${ g.state })` : '' } setting on ${ g.slot || 'the root' }` ).join( '; ' ), reason: `custom-css: ${ why }` } );
		}
		for ( const d of decls ) {
			out.answered.push( { ...answer( d.r.row, d.widths ), settledDetail: `lib/fill-residual-css.mjs wrote it as Custom CSS (${ d.ranges.map( ( s ) => `${ rangeText( s.range ) } ${ s.value }` ).join( ', ' ) }): ${ why } (was: ${ d.r.row.reason })` } );
		}
		for ( const t of twins ) {
			const home = decls.find( ( d ) => d.r === t.sameAs );
			home ? out.answered.push( { ...answer( t.row, home.widths ), settledDetail: `lib/fill-residual-css.mjs wrote it as Custom CSS on ${ home.slot || 'the root' }, which reads the same draft element` } ) : out.unmapped.push( t.row );
		}
		out.notes.push( `${ refOf( node ) } ${ rec.name }: no setting holds ${ props.join( ', ' ) }; written as ${ rules.length } scoped rule${ 1 === rules.length ? '' : 's' } in Additional CSS (${ bytes } bytes)` );
	}
	// The framework's gap rows: one per distinct block, part, property and state, with its instances.
	const rows = new Map();
	for ( const g of out.rules ) {
		for ( const decl of g.declarations ) {
			const property = decl.slice( 0, decl.indexOf( ':' ) );
			const k = JSON.stringify( [ g.block, g.part, property, g.state ?? null ] );
			rows.has( k ) || rows.set( k, { id: `residual:${ scope }:${ g.block }|${ g.part }|${ property }${ g.state ? `|${ g.state }` : '' }`, class: 'F-setting', framework: true, block: g.block, attribute: null, property, part: g.part, rowKey: g.part, state: g.state ?? null, surface: scope, instances: [], declared: [] } );
			const row = rows.get( k );
			row.instances.includes( g.node ) || row.instances.push( g.node );
			row.declared.push( `${ g.node } ${ g.range }: ${ decl.slice( decl.indexOf( ':' ) + 1 ).trim() }` );
		}
	}
	out.backlog = [ ...rows.values() ];
	out.answered = out.answered.filter( ( a, i, all ) => all.findIndex( ( b ) => JSON.stringify( [ b.node, b.slot, b.property, b.state, b.value ] ) === JSON.stringify( [ a.node, a.slot, a.property, a.state, a.value ] ) ) === i );
	out.unmapped = regroup( out.unmapped );
	return out;
}
