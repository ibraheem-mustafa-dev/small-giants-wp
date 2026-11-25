// The general pairing of paint conservation (Spec 48 section 3.4): which of a block's measured parts an absorbed draft element
// is, decided by what the part is rather than by where the block's markup puts it. A block that draws its own inner parts (a
// picker's chips, a tiles field's tiles and their marks) swallows the draft elements that are those parts; their looks reach
// the clone only when the skeleton names the draft element at the part's calibrated slot (`draftSlots`). The slot walk
// (lib/skeleton-conserve-slots.mjs::walkSlot) lands only where the draft's markup has the block's shape; this pairing runs
// where it gives up.
//
// Everything block-specific comes from the block's calibration: its default paint (`elements`: each part's selector path with
// `_tag` and `_position` per width), its parts' own words and boxes inside the block where the paint file records them
// (`parts`), its settings (the slot each is calibrated at) and its text fields
// (`text`). Both sides are described by signals each carries:
// - kind: a control, a picture, a glyph, a mark (a box with no words), words, or a box holding other boxes;
// - repetition: a part whose path counts `:nth-of-type` steps repeats once per item, and so does a draft element with loop
//   copies or same-shaped sibling controls; the counts must be equal;
// - out of flow: a draft element absolutely or fixed placed at every width it is drawn at is only an out-of-flow part, and
//   one placed so at some widths only may be either;
// - structure (decided before paint, which only breaks what structure leaves): an element inside a paired element pairs only
//   inside that pair's part, preferring that part's direct children; an element inside a draft element the node already holds at
//   a part's slot (`taken`) pairs inside that part the same way, and an element that holds a slot itself is one of the parts it
//   holds; a wrapper (a box) is the part that holds the most of its contents already placed in one part (the tightest of equals;
//   a choice made in one round only grows outward to a part round it, so the rounds converge); a wrapper of wordless marks only
//   is the part whose shown children are as many marks; the words a control holds itself are drawn by the one plain words part
//   inside its part, so a words element beside them is another words part (an ornament); the host's sole box child of about its
//   width, and that box's own sole box child, are the box the block draws as its root, not a part; a wordless box no part fits
//   inside its enclosing element's part is drawn flat by the block (`flat`: recorded as unpaired, not a problem), while an
//   element with words of its own is never flat, so its gap stays listed;
// - holds: a box that holds only an icon (a glyph or picture inside it, no words) keeps the parts that hold only an icon, and one
//   that holds words and no icon drops them, so a badge round an icon is never confused with a card of text drawn in the same paint;
// - words: where several parts fit, a worded element keeps the parts printing the same words, else the parts printing the
//   same kind of words (a number, a price, other words);
// - summary row: a draft control that holds words and a caret (a label and a glyph that points down or turns, as a disclosure
//   toggle draws it) is a menu's summary row, so it fits the block's disclosure summary part (a `summary` element) even
//   where that part is out of flow or prints no words of its own; a link with a trailing icon and no caret is not one;
// - place: where several parts still fit, the part whose box centre inside the block lies nearest the element's centre inside
//   its host, both as shares of the block's size, when it is near (PLACE_NEAR) and every other part at least twice as far.
// A part and its sole visible child of the same width are one visible box (a label drawn round a pill). A pairing is used only
// when exactly one part fits; two draft elements in one item claiming the same part are both left unpaired. A loop's other
// items are read at the element in the same place only when it is the same sort of element (words, glyph, control, picture or
// blank). Nothing here names a block, a part or a class.
import { copylessKey } from './fact-key.mjs';
import { looksOfEntry } from './skeleton-paint-conservation.mjs';

const NTH = /:nth-of-type\((\d+)\)/g;
const PSEUDO = /::(before|after)$/;
const WIDTH = '1440';
// The kinds in the order one visible box takes its kind from its members.
const KINDS = [ 'control', 'picture', 'glyph', 'words', 'mark', 'box' ];
// The kinds of part a draft element of each kind may be: a glyph drawn as a character may be a part drawn as a box (a tick
// mark); a box with no words is never an icon part, which draws nothing until an icon is chosen.
const FITS = { control: [ 'control' ], picture: [ 'picture' ], glyph: [ 'glyph', 'mark' ], mark: [ 'mark' ], words: [ 'words' ], box: [ 'box' ] };
const CONTROL_TAGS = new Set( [ 'button', 'a', 'label', 'summary', 'select', 'input', 'textarea' ] );
const CONTROL_ROLES = new Set( [ 'button', 'radio', 'checkbox', 'tab', 'option', 'link', 'switch', 'menuitemradio' ] );
const PICTURE_TAGS = new Set( [ 'img', 'picture', 'video' ] );
const GLYPH_TAGS = new Set( [ 'svg', 'path', 'g', 'circle', 'rect', 'polygon', 'use', 'line', 'ellipse' ] );
const NO_PAINT = /^(?:|transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\))$/;
const ALNUM = /[\p{L}\p{N}]/u;
// The largest distance, as a share of the block's width and height, at which a part's place decides, and how much nearer it
// must be than the next part.
export const PLACE_NEAR = 0.12;
const PLACE_MARGIN = 2;
// The second candidate of an element whose part another element of the same item also claims.
const SHARED = Object.freeze( { head: '(another element of the same item claims this part)', shared: true, inside: new Set() } );

export const templateOf = ( path ) => String( path ?? '' ).replace( NTH, ':nth-of-type(n)' );
const levelOf = ( path ) => ( String( path ?? '' ).match( NTH ) || [] ).length;
const px = ( v ) => {
	const n = parseFloat( v );
	return Number.isFinite( n ) ? n : null;
};
const parentOf = ( t ) => ( PSEUDO.test( t ) ? t.replace( PSEUDO, '' ) : t.includes( ' > ' ) ? t.slice( 0, t.lastIndexOf( ' > ' ) ) : '' );
// Whether a part's reading is `display: none` at every width it was read at (a part the block does not draw in its default look).
const neverShown = ( byWidth ) => {
	const reads = Object.values( byWidth || {} ).filter( ( v ) => v && 'object' === typeof v && 'display' in v );
	return reads.length > 0 && reads.every( ( v ) => 'none' === v.display );
};
const atWidth = ( byWidth ) => byWidth?.[ WIDTH ] ?? Object.values( byWidth || {} ).find( ( v ) => v && v._tag ) ?? Object.values( byWidth || {} )[ 0 ] ?? {};

// A short run of characters with no letter or digit, or one character: drawn as a glyph, never read as words.
export const glyphy = ( s ) => {
	const t = String( s ?? '' ).trim();
	return [ ...t ].length === 1 || ( t.length > 0 && t.length <= 6 && ! ALNUM.test( t ) );
};

// The block's measured parts, one per template (a path with every `:nth-of-type(k)` as `(n)`), merged into visible boxes.
// elements: the calibration's default paint ({ path: { width: values } }); textPaths: the paths the block prints its text
// fields at; recorded: the paint file's `parts` ({ path: { words?, box: { width: [ x, y, w, h ] } } }), where a part's words
// and box come from (a template's first instance). Returns { parts: Map( template -> part ), groups: Map( head -> group ),
// headOf: Map( template -> head ), rootBox }.
export function partModel( elements = {}, textPaths = [], recorded = {} ) {
	const seen = new Map();
	for ( const [ path, r ] of Object.entries( recorded || {} ) ) {
		seen.has( templateOf( path ) ) || seen.set( templateOf( path ), r );
	}
	const parts = new Map();
	for ( const [ path, byWidth ] of Object.entries( elements || {} ) ) {
		const pseudo = PSEUDO.test( path );
		if ( path.includes( '::' ) && ! pseudo ) {
			continue;
		}
		const t = templateOf( path );
		if ( parts.has( t ) ) {
			continue;
		}
		const v = atWidth( byWidth );
		const oof = [ 'absolute', 'fixed' ].includes( v._position );
		const width = px( v.width );
		parts.set( t, {
			template: t, tag: String( v._tag ?? '' ).toLowerCase(), pseudo, oof, level: levelOf( path ), parent: '' === t ? null : parentOf( t ), width,
			hidden: oof && null !== width && width <= 1.5, none: neverShown( byWidth ),
			words: seen.get( t )?.words ?? null, box: seen.get( t )?.box?.[ WIDTH ] ?? null,
			painted: ! NO_PAINT.test( String( v[ 'background-color' ] ?? '' ).trim() ) || ( px( v[ 'border-top-width' ] ) ?? 0 ) > 0,
		} );
	}
	// A part inside one the block never displays is never displayed either.
	const never = ( p ) => p.none || ( null !== p.parent && !! parts.get( p.parent ) && never( parts.get( p.parent ) ) );
	for ( const p of parts.values() ) {
		p.never = never( p );
	}
	const texts = new Set( ( textPaths || [] ).map( templateOf ) );
	for ( const p of parts.values() ) {
		p.kids = [ ...parts.values() ].filter( ( q ) => q.parent === p.template && q !== p );
		p.shown = p.kids.filter( ( q ) => ! q.hidden && ! q.pseudo );
	}
	for ( const p of parts.values() ) {
		p.kind = p.pseudo ? 'mark'
			: CONTROL_TAGS.has( p.tag ) || p.kids.some( ( q ) => 'input' === q.tag ) ? 'control'
				: PICTURE_TAGS.has( p.tag ) ? 'picture'
					: GLYPH_TAGS.has( p.tag ) ? 'glyph'
						: p.shown.length ? 'box'
							: p.words && ALNUM.test( p.words ) ? ( glyphy( p.words ) ? 'glyph' : 'words' )
							: ! texts.has( p.template ) && p.painted ? 'mark' : 'words';
	}
	// A part and its sole visible child at the same repetition and width are one visible box.
	const headOf = new Map( [ ...parts.keys() ].map( ( t ) => [ t, t ] ) );
	for ( const t of [ ...parts.keys() ].sort( ( a, b ) => a.length - b.length ) ) {
		const p = parts.get( t );
		const c = 1 === p.shown.length ? p.shown[ 0 ] : null;
		if ( c && c.level === p.level && null !== p.width && null !== c.width && Math.abs( p.width - c.width ) <= Math.max( 2, 0.1 * p.width ) ) {
			headOf.set( c.template, headOf.get( t ) );
		}
	}
	const groups = new Map();
	for ( const [ t, h ] of headOf ) {
		( groups.get( h ) ?? groups.set( h, { head: h, members: [] } ).get( h ) ).members.push( t );
	}
	for ( const g of groups.values() ) {
		const ms = g.members.map( ( t ) => parts.get( t ) );
		const head = parts.get( g.head );
		Object.assign( g, {
			kind: ms.map( ( p ) => p.kind ).sort( ( a, b ) => KINDS.indexOf( a ) - KINDS.indexOf( b ) )[ 0 ],
			level: head.level, oof: ms.some( ( p ) => p.oof ), hidden: ms.every( ( p ) => p.hidden ), never: ms.every( ( p ) => p.never ), pseudo: head.pseudo, root: g.members.includes( '' ),
			parentHead: null === head.parent ? null : headOf.get( head.parent ) ?? null,
			words: ms.map( ( p ) => p.words ).find( Boolean ) ?? null, box: head.box,
		} );
	}
	for ( const g of groups.values() ) {
		g.inside = new Set( [ ...parts.keys() ].filter( ( t ) => ! g.members.includes( t ) && g.members.some( ( m ) => ( '' === m ? '' !== t : t.startsWith( `${ m } > ` ) || t.startsWith( `${ m }::` ) ) ) ).map( ( t ) => headOf.get( t ) ) );
	}
	return { parts, groups, headOf, rootBox: parts.get( '' )?.box ?? null };
}

// What kind of words a text is: a number, a price, other words, or null for none.
export const wordsClass = ( s ) => {
	const t = String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
	if ( '' === t ) {
		return null;
	}
	if ( /^[+-]?\d+$/.test( t ) ) {
		return 'number';
	}
	return /^[^\p{L}\d]{0,3}\d[\d,.]*[^\p{L}\d]{0,3}$/u.test( t ) ? 'price' : 'words';
};
const sameWords = ( a, b ) => String( a ?? '' ).replace( /\s+/g, ' ' ).trim().toLowerCase() === String( b ?? '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();

// The parts among cands that print what draft element e prints: the same words, else the same kind of words where that
// leaves fewer; cands as they are when e prints none or no part prints the like.
export function byWords( cands, e ) {
	const k = wordsClass( e.words );
	if ( ! k ) {
		return cands;
	}
	const same = cands.filter( ( g ) => g.words && sameWords( g.words, e.words ) );
	if ( same.length ) {
		return same;
	}
	const kind = cands.filter( ( g ) => g.words && wordsClass( g.words ) === k );
	return kind.length && kind.length < cands.length ? kind : cands;
}

// The part among cands whose place inside the block decides for draft element e inside host: the nearest by box centre, both
// as shares of the block's size at the widest width, when it lies within PLACE_NEAR and every other part with a box at least
// PLACE_MARGIN times as far; else cands as they are. rootBox: the block root's recorded box.
export function byPlace( cands, e, host, rootBox ) {
	const b = boxOf( e );
	const h = boxOf( host );
	if ( ! rootBox || ! ( rootBox[ 2 ] > 0 && rootBox[ 3 ] > 0 && h.w > 0 && h.h > 0 ) || ! Number.isFinite( b.x ) || ! Number.isFinite( b.w ) ) {
		return cands;
	}
	const at = [ ( b.x - h.x + ( b.w / 2 ) ) / h.w, ( b.y - h.y + ( b.h / 2 ) ) / h.h ];
	const placed = cands.filter( ( g ) => Array.isArray( g.box ) )
		.map( ( g ) => ( { g, d: Math.hypot( ( ( g.box[ 0 ] + ( g.box[ 2 ] / 2 ) ) / rootBox[ 2 ] ) - at[ 0 ], ( ( g.box[ 1 ] + ( g.box[ 3 ] / 2 ) ) / rootBox[ 3 ] ) - at[ 1 ] ) } ) )
		.sort( ( x, y ) => x.d - y.d );
	if ( ! placed.length || placed[ 0 ].d > PLACE_NEAR || ( placed[ 1 ] && placed[ 1 ].d < PLACE_MARGIN * placed[ 0 ].d ) ) {
		return cands;
	}
	return [ placed[ 0 ].g ];
}

const visible = ( e ) => ! e.visible || Object.values( e.visible ).some( Boolean );
const boxOf = ( e ) => e.box?.[ WIDTH ] ?? Object.values( e.box || {} )[ 0 ] ?? {};
// Whether a draft element is out of flow at each width it is drawn at: [ true ], [ false ] or both (a count badge the draft
// pins to its button's corner only on the phone).
const OUT_OF_FLOW = [ 'absolute', 'fixed' ];
export const flowsOf = ( e ) => {
	if ( 'string' === typeof e.position ) {
		return [ OUT_OF_FLOW.includes( e.position ) ];
	}
	const at = Object.entries( e.position || {} ).filter( ( [ w, v ] ) => v && ( ! e.visible || e.visible[ w ] ) ).map( ( [ , v ] ) => OUT_OF_FLOW.includes( v ) );
	return at.length ? [ ...new Set( at ) ] : [ false ];
};

// The characters a disclosure caret is typed as (pointing down, up or, for a collapsed row, right); a trailing arrow such as
// a right angle quote is a link's, not a toggle's.
const CARET_CHARS = new Set( [ '\u25BE', '\u25BC', '\u25BF', '\u25BD', '\u2304', '\u2335', '\u02C5', '\u2228', '\u23F7', '\u25B4', '\u25B2', '\u23F6', '\u02C4', '\u2227', '\u2303', '\u25B8' ] );
const SHAPE = /<(polyline|polygon|path|line|circle|rect|ellipse)\b([^>]*)>/gi;
// The numbers in a points list or a path's arguments ("4-4" is 4 and -4).
const numbersOf = ( text ) => ( String( text ?? '' ).match( /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi ) || [] ).map( Number );

// Whether a rendered svg draws a chevron: one shape of three corners that do not lie on a line (a polyline of three points,
// or a path of a move and two lines). An arrow is two shapes, a circle or a plus is more.
export function drawsChevron( markup ) {
	const shapes = [ ...String( markup ?? '' ).matchAll( SHAPE ) ];
	if ( 1 !== shapes.length ) {
		return false;
	}
	const [ , tag, attrs ] = shapes[ 0 ];
	let pts = [];
	if ( 'polyline' === tag.toLowerCase() ) {
		const nums = numbersOf( attrs.match( /\bpoints\s*=\s*["']([^"']*)["']/i )?.[ 1 ] );
		for ( let i = 0; i + 1 < nums.length; i += 2 ) {
			pts.push( [ nums[ i ], nums[ i + 1 ] ] );
		}
	} else if ( 'path' === tag.toLowerCase() ) {
		const d = attrs.match( /\bd\s*=\s*["']([^"']*)["']/i )?.[ 1 ] ?? '';
		if ( /[^MmLlHhVv\d\s,.\-eE]/.test( d ) ) {
			return false;
		}
		let at = [ 0, 0 ];
		for ( const [ , cmd, args ] of d.matchAll( /([MmLlHhVv])([^MmLlHhVv]*)/g ) ) {
			const n = numbersOf( args );
			const rel = cmd === cmd.toLowerCase();
			const c = cmd.toUpperCase();
			const step = 'H' === c || 'V' === c ? 1 : 2;
			for ( let i = 0; i + step <= n.length; i += step ) {
				const x = 'V' === c ? at[ 0 ] : ( rel ? at[ 0 ] : 0 ) + n[ i ];
				const y = 'H' === c ? at[ 1 ] : ( rel ? at[ 1 ] : 0 ) + n[ 'V' === c ? i : i + 1 ];
				at = [ x, y ];
				pts.push( at );
			}
		}
	}
	if ( 3 !== pts.length || pts.flat().some( ( v ) => ! Number.isFinite( v ) ) ) {
		return false;
	}
	const [ a, b, c ] = pts;
	return 0 !== ( ( b[ 0 ] - a[ 0 ] ) * ( c[ 1 ] - a[ 1 ] ) ) - ( ( b[ 1 ] - a[ 1 ] ) * ( c[ 0 ] - a[ 0 ] ) );
}

// Whether a draft element is a caret: a typed down or up pointer; an svg that draws a chevron; or a glyph holder with no words
// that turns when the row opens (a transform of its own with a transition on it).
export function isCaret( e, kids = () => [] ) {
	const words = String( e.words ?? '' ).trim();
	if ( words ) {
		return CARET_CHARS.has( words );
	}
	if ( 'svg' === String( e.tag ?? '' ).toLowerCase() && drawsChevron( e.svg ) ) {
		return true;
	}
	const style = String( e.attrs?.style ?? '' );
	return /transform\s*:[^;]*rotate\(/i.test( style ) && /transition(?:-property)?\s*:[^;]*\btransform\b/i.test( style ) && ! kids( e ).some( ( k ) => ALNUM.test( String( k.words ?? '' ) ) );
}

// Whether a block's calibrated parts include a disclosure summary part (a control part that is a `summary` element).
export function drawsSummaryPart( calibration ) {
	const model = partModel( calibration?.elements || {}, Object.values( calibration?.text || {} ).map( ( x ) => x?.path ).filter( Boolean ), calibration?.parts );
	return [ ...model.groups.values() ].some( ( g ) => ! g.root && ! g.hidden && 'control' === g.kind && 'summary' === model.parts.get( g.head )?.tag );
}

// Whether a draft control is a menu's summary row: it holds words (its own or a descendant's, not a lone glyph) and a caret
// somewhere below it. kids( element ): its children in order.
export function isSummaryRow( e, kids ) {
	const tag = String( e.tag ?? '' ).toLowerCase();
	if ( ! CONTROL_TAGS.has( tag ) && ! CONTROL_ROLES.has( String( e.attrs?.role ?? '' ).toLowerCase() ) ) {
		return false;
	}
	let words = false;
	let caret = false;
	const walk = ( x ) => kids( x ).filter( visible ).forEach( ( k ) => {
		const w = String( k.words ?? '' ).trim();
		words = words || ( ALNUM.test( w ) && ! glyphy( w ) );
		caret = caret || isCaret( k, kids );
		walk( k );
	} );
	walk( e );
	return words && caret;
}

// What a draft element is, from its tag, role, words and visible children. kids( element ) gives its children.
export function draftKind( e, kids ) {
	const tag = String( e.tag ?? '' ).toLowerCase();
	const role = String( e.attrs?.role ?? '' ).toLowerCase();
	const shown = kids( e ).filter( visible );
	const words = String( e.words ?? '' ).trim();
	if ( CONTROL_TAGS.has( tag ) || CONTROL_ROLES.has( role ) ) {
		return 'control';
	}
	if ( PICTURE_TAGS.has( tag ) || ( ! shown.length && /url\(/.test( String( e.attrs?.style ?? '' ) ) ) ) {
		return 'picture';
	}
	if ( 'svg' === tag ) {
		return 'glyph';
	}
	if ( shown.length ) {
		return 'box';
	}
	return '' === words ? 'mark' : glyphy( words ) ? 'glyph' : 'words';
}

// The slots and readings of a host's absorbed elements the slot walk left. host: the block's draft element; absorbed:
// [ { element, looks } ] (`looks: null` is an element whose paint is not in question: it pairs with the part it is whatever
// the part's settings paint, and is read at every slot the part's settings are calibrated at); kids( element ): its children in order; isNode( element ): true for an element another skeleton node
// reads (its subtree is that block's); summaryRows: pair each toggle (a control holding words and a caret, or a copy of a loop
// that has one) with the block's disclosure summary part, to be called after the ordinary pairing, whose link part a toggle
// also fills (the settings of the two parts are calibrated apart); calibration: { elements, settings, text }; finder( element ); taken: the slots the node
// already holds. Returns { slots: { slot: finder }, paired: [ { key, part, slots } ], ambiguous: [ { key, candidates } ],
// unpainted: [ { key, part, looks } ], pseudo: [ { key, part } ], flat: [ { key, candidates, why } ], switches: [ { key, part, switch,
// value, slots } ] }. switches: the block's part switches (data/part-switches.json, lib/skeleton-part-switch.mjs::switchesFor): a
// switch that draws one element's look on another part, so an element paired with the target part whose own settings paint none
// of its looks is read at the look element's calibrated slots when those settings paint them, and the switch is returned for the
// node to hold.
function pairCore( { host, absorbed = [], kids, isNode = () => false, calibration = {}, finder, taken = {}, summaryRows = false, switches = [] } ) {
	const out = { slots: {}, paired: [], ambiguous: [], unpainted: [], pseudo: [], flat: [], switches: [], siblings: [], unmatched: [] };
	const elements = calibration?.elements || {};
	if ( ! host || ! absorbed.length || ! Object.keys( elements ).length ) {
		return out;
	}
	const model = partModel( elements, Object.values( calibration.text || {} ).map( ( x ) => x?.path ).filter( Boolean ), calibration.parts );
	const groups = [ ...model.groups.values() ].filter( ( g ) => ! g.root && ! g.hidden );
	// The block's disclosure summary parts: a control part that is a `summary` element, drawn out of flow or not.
	const summaries = groups.filter( ( g ) => 'control' === g.kind && 'summary' === model.parts.get( g.head )?.tag );
	// The parts a row draws only when it opens a submenu: a part that has a twin with a wrapper step taken out (the item's link
	// sits in the item for a plain row and inside the wrapper round its summary for a row with a submenu), where the wrapper is the
	// part that holds a disclosure summary part.
	const pathSteps = ( t ) => String( t ).split( ' > ' );
	const wrapperSteps = ( big, small ) => {
		const taken = [];
		let i = 0;
		big.forEach( ( x, j ) => ( i < small.length && x === small[ i ] ? i++ : taken.push( j ) ) );
		return i === small.length ? taken : [];
	};
	const holdsSummary = ( h ) => !! h && ! h.root && summaries.some( ( sm ) => h.inside.has( sm.head ) );
	const underSummary = new Set( ! summaries.length ? [] : groups.filter( ( g ) => {
		const big = pathSteps( g.head );
		return groups.some( ( g2 ) => {
			const small = pathSteps( g2.head );
			return g2 !== g && g2.level === g.level && g2.kind === g.kind && small.length < big.length && small[ small.length - 1 ] === big[ big.length - 1 ]
				&& wrapperSteps( big, small ).some( ( j ) => j < big.length - 1 && holdsSummary( model.groups.get( model.headOf.get( big.slice( 0, j + 1 ).join( ' > ' ) ) ) ) );
		} );
	} ).map( ( g ) => g.head ) );
	// The host's subtree in document order, stopping at the elements other nodes read.
	const parent = new Map();
	const order = [];
	const walk = ( e ) => kids( e ).forEach( ( k ) => {
		if ( isNode( k ) ) {
			return;
		}
		parent.set( k, e );
		order.push( k );
		walk( k );
	} );
	walk( host );
	const kindOf = new Map( order.map( ( e ) => [ e, draftKind( e, kids ) ] ) );
	// A menu's rows are one repeated element whose copies differ in what they hold (a row with no submenu has no caret), so a
	// copy that is a summary row makes every copy of its loop a toggle: the summary slots are read at the copy of their position.
	const rowLoops = new Set( summaries.length ? order.filter( ( e ) => 'control' === kindOf.get( e ) && isSummaryRow( e, ( x ) => kids( x ).filter( ( k ) => ! isNode( k ) ) ) ).map( ( e ) => copylessKey( e.key ) ) : [] );
	const toggles = new Set( ! summaryRows ? [] : order.filter( ( e ) => 'control' === kindOf.get( e ) && rowLoops.has( copylessKey( e.key ) ) ) );
	const sameRepeat = ( a, b ) => a === b || copylessKey( a.key ) === copylessKey( b.key ) || ( 'control' === kindOf.get( a ) && 'control' === kindOf.get( b ) && a.tag === b.tag && ( a.attrs?.class ?? '' ) === ( b.attrs?.class ?? '' ) && ( Math.abs( ( boxOf( a ).w ?? -9 ) - ( boxOf( b ).w ?? 9 ) ) <= 2 || Math.abs( ( boxOf( a ).h ?? -9 ) - ( boxOf( b ).h ?? 9 ) ) <= 2 ) );
	const repGroup = ( e, within = parent.get( e ) ) => kids( within ).filter( ( k ) => visible( k ) && ( kindOf.has( k ) || ! isNode( k ) ) && sameRepeat( e, k ) );
	const chainOf = ( e ) => {
		const out2 = [];
		for ( let x = e; x && x !== host; x = parent.get( x ) ) {
			repGroup( x ).length > 1 && out2.unshift( x );
		}
		return out2;
	};
	const chain = new Map( order.map( ( e ) => [ e, chainOf( e ) ] ) );
	const isAbove = ( a, e ) => {
		for ( let x = parent.get( e ); x; x = parent.get( x ) ) {
			if ( x === a ) {
				return true;
			}
		}
		return false;
	};
	// What a box holds, by structure: the icon (a glyph or picture inside it) and words, as a draft element's subtree and a measured
	// part's inside tell. A box that holds only the icon is the part that holds only the block's icon (the badge a glyph sits in), and
	// a box that holds words and no icon is never that part, however alike their paint.
	const holdsOf = ( kinds ) => ( { icon: kinds.some( ( k ) => [ 'glyph', 'picture' ].includes( k ) ), words: kinds.includes( 'words' ) } );
	const draftHolds = ( e ) => holdsOf( order.filter( ( d ) => isAbove( e, d ) ).map( ( d ) => kindOf.get( d ) ) );
	const iconOnly = ( g ) => ( ( h ) => h.icon && ! h.words )( holdsOf( [ ...g.inside ].map( ( h ) => model.groups.get( h )?.kind ) ) );
	// The part a draft element already holds a slot of (the trigger the slot walk gave the host itself): what lies inside
	// that element pairs inside that part, as inside a part this pairing chose.
	const takenAt = new Map();
	for ( const [ slot, f ] of Object.entries( taken || {} ) ) {
		const g = model.groups.get( model.headOf.get( templateOf( slot ) ) );
		const id = JSON.stringify( f );
		g && ! g.root && ! slot.includes( '::' ) && ! takenAt.has( id ) && takenAt.set( id, g );
	}
	// The parts the slot walk gave a draft element itself: it is one of them.
	const takenAll = new Map();
	for ( const [ slot, f ] of Object.entries( taken || {} ) ) {
		const g = model.groups.get( model.headOf.get( templateOf( slot ) ) );
		g && ! g.root && ! slot.includes( '::' ) && ( takenAll.get( JSON.stringify( f ) ) ?? takenAll.set( JSON.stringify( f ), new Set() ).get( JSON.stringify( f ) ) ).add( g );
	}
	const heldPart = ( e ) => {
		for ( let x = parent.get( e ); x; x = x === host ? null : parent.get( x ) ) {
			const g = takenAt.get( JSON.stringify( finder( x ) ) );
			if ( g ) {
				return g;
			}
		}
		return null;
	};
	// Structure first. What each element can be at all: the parts at its repetition level, of a kind that fits it, out of flow only
	// where it is. The draft's structure then narrows each round
	// against what the last round paired: an element is inside its enclosing element's part, and a wrapper (a box) holds its
	// contents' parts, so it keeps the parts that hold the most of the contents that belong to one part (every part such a content
	// can be lies inside it). An element with parts that fit by kind and none inside its enclosing element's part is one the block
	// draws flat (a wrapper round parts the block lays out itself). Paint (words, place) only breaks what is left.
	// The host's own box: its sole visible child of about its width that holds children, and that child's, and so on, as the block's root and its sole
	// visible child of the same width are one visible box (a wrapper round a card the block draws as its root is not a part of it).
	const rootChain = new Set();
	for ( let x = host; x; ) {
		const shown = kids( x ).filter( visible );
		const c = 1 === shown.length && ! isNode( shown[ 0 ] ) && 'box' === draftKind( shown[ 0 ], kids ) ? shown[ 0 ] : null;
		const w = boxOf( x ).w;
		const cw = c && boxOf( c ).w;
		x = c && w > 0 && cw > 0 && Math.abs( w - cw ) <= Math.max( 2, 0.1 * w ) ? c : null;
		x && rootChain.add( x );
	}
	const baseSets = new Map( order.map( ( e ) => {
		return [ e, rootChain.has( e ) ? [] : groups.filter( ( g ) => g.level === chain.get( e ).length && FITS[ kindOf.get( e ) ].includes( g.kind ) && ( ! flowsOf( e ).every( Boolean ) || g.oof ) ) ];
	} ) );
	const below = new Map( order.map( ( e ) => [ e, order.filter( ( d ) => isAbove( e, d ) ) ] ) );
	let flatNow = new Map();
	let prev = baseSets;
	const banned = new Map();
	const wrapKept = new Map();
	let result;
	for ( let round = 0; round < 6; round++ ) {
		result = new Map();
		flatNow = new Map();
		for ( const e of order ) {
			const kind = kindOf.get( e );
			const flows = flowsOf( e );
			let up = null;
			for ( let x = parent.get( e ); x && x !== host; x = parent.get( x ) ) {
				if ( 1 === result.get( x )?.length ) {
					up = result.get( x )[ 0 ];
					break;
				}
			}
			const fromHeld = ! up && !! heldPart( e );
			up = up ?? heldPart( e );
			let cands = baseSets.get( e ).filter( ( g ) => ! up || up.inside.has( g.head ) );
			const own = takenAll.get( JSON.stringify( finder( e ) ) );
			const ownKept = own ? cands.filter( ( g ) => own.has( g ) ) : [];
			ownKept.length && ( cands = ownKept );
			baseSets.get( e ).length && ! cands.length && 'box' === kind && ! ALNUM.test( String( e.words ?? '' ) ) && flatNow.set( e, 'no part of the block lies inside the part its enclosing element was paired with: the block draws it flat' );
			// A wrapper of wordless marks and nothing else (a track and its fill) is a part whose shown children are marks, as many.
			if ( 'box' === kind && cands.length > 1 ) {
				const held = kids( e ).filter( ( k ) => visible( k ) && ! isNode( k ) ).map( ( k ) => kindOf.get( k ) );
				const kept = held.length && held.every( ( k ) => 'mark' === k ) ? cands.filter( ( g ) => ( ( shown ) => shown.length === held.length && shown.every( ( q ) => 'mark' === q.kind ) )( model.parts.get( g.head )?.shown ?? [] ) ) : [];
				kept.length && ( cands = kept );
			}
			// A wrapper holds the parts its contents belong to.
			if ( 'box' === kind && cands.length > 1 && ! fromHeld ) {
				// The contents already placed in a part (one part only) decide: the wrapper is the part holding most of them, and of the parts
				// holding as many, the tightest. A content with several possible parts places nothing yet.
				const placed = ( g ) => below.get( e ).filter( ( d ) => 1 === prev.get( d ).length && g.inside.has( prev.get( d )[ 0 ].head ) ).length;
				const before = cands.length;
				const most = Math.max( ...cands.map( placed ) );
				if ( most > 0 ) {
					cands = cands.filter( ( g ) => placed( g ) === most );
					cands.length > 1 && ( ( tight ) => ( cands = cands.filter( ( g ) => g.inside.size === tight ) ) )( Math.min( ...cands.map( ( g ) => g.inside.size ) ) );
				}
				// What a round settled stays settled, except that it may grow outward to a part round it (its contents' parts move as they are
				// paired, and a wrapper must not flip back and forth).
				const prior = wrapKept.get( e );
				const grows = prior && cands.length && cands.every( ( g ) => prior.some( ( p ) => g.inside.has( p.head ) ) );
				const settled = ( prior ?? cands ).filter( ( g ) => cands.includes( g ) );
				settled.length && ! grows && ( cands = settled );
				cands.length < before && wrapKept.set( e, cands );
			}
			const row = toggles.has( e ) ? cands.filter( ( g ) => summaries.includes( g ) ) : [];
			if ( row.length ) {
				cands = row;
			} else {
				// No element of the draft's menu is a summary row, so it draws no row that opens a submenu, and the parts only such a row
				// draws cannot be what its elements are. A part the block never displays is not one the draft's elements are either.
				if ( underSummary.size && ! rowLoops.size ) {
					const kept = cands.filter( ( g ) => ! underSummary.has( g.head ) );
					kept.length && ( cands = kept );
				}
				const shownParts = cands.filter( ( g ) => ! g.never );
				shownParts.length && ( cands = shownParts );
				// A disclosure summary part is a menu row that opens a submenu: a control with no caret and no words beside one
				// (a plain link, even with a trailing arrow) is never it, whether or not the summary is drawn out of flow.
				if ( 'control' === kind && summaries.length && ! isSummaryRow( e, ( x ) => kids( x ).filter( ( k ) => ! isNode( k ) ) ) ) {
					const kept = cands.filter( ( g ) => ! summaries.includes( g ) );
					kept.length && ( cands = kept );
				}
				// The words a control holds itself are drawn by the one words part inside its part that holds nothing of its own, so a
				// words element beside them is another words part of that control (an ornament).
				if ( 'words' === kind && cands.length > 1 ) {
					for ( let x = parent.get( e ); x && x !== host; x = parent.get( x ) ) {
						const own = String( x.words ?? '' ).trim();
						const px = 1 === result.get( x )?.length ? result.get( x )[ 0 ] : null;
						if ( px && ALNUM.test( own ) && ! glyphy( own ) ) {
							const texts = [ ...px.inside ].map( ( h ) => model.groups.get( h ) ).filter( ( g ) => g && 'words' === g.kind && ! g.hidden && ! g.pseudo );
							const plain = texts.filter( ( g ) => ! g.inside.size );
							const kept = texts.length > 1 && 1 === plain.length ? cands.filter( ( g ) => g !== plain[ 0 ] ) : [];
							kept.length && ( cands = kept );
							break;
						}
					}
				}
				for ( const tier of [ ( g ) => g.kind === kind, ( g ) => ! up || g.parentHead === up.head, ( g ) => flows.includes( g.oof ) ] ) {
					const kept = cands.filter( tier );
					kept.length && ( cands = kept );
				}
				if ( 'box' === kind && cands.length > 1 ) {
					const holds = draftHolds( e );
					const kept = holds.icon && ! holds.words ? cands.filter( iconOnly ) : holds.words && ! holds.icon ? cands.filter( ( g ) => ! iconOnly( g ) ) : [];
					kept.length && ( cands = kept );
				}
				cands.length > 1 && ( cands = byWords( cands, e ) );
				cands.length > 1 && ( cands = byPlace( cands, e, host, model.rootBox ) );
			}
			result.set( e, banned.has( e ) ? [ banned.get( e ), SHARED ] : cands );
		}
		let changed = false;
		// One part in one item is one draft element: two elements of one item claiming it are both left unpaired (an element inside
		// the one that holds it is already drawn flat, by the enclosing element's part).
		const claims = new Map();
		for ( const e of order ) {
			const c = result.get( e );
			if ( 1 === c.length ) {
				const id = [ c[ 0 ].head, ...chain.get( e ).map( ( x ) => x.key ) ].join( '|' );
				( claims.get( id ) ?? claims.set( id, [] ).get( id ) ).push( e );
			}
		}
		for ( const list of claims.values() ) {
			list.length > 1 && list.forEach( ( e ) => banned.has( e ) || ( banned.set( e, result.get( e )[ 0 ] ), changed = true ) );
		}
		changed = changed || [ ...result ].some( ( [ e, c ] ) => c.length !== prev.get( e ).length || c.some( ( g, i ) => g !== prev.get( e )[ i ] ) );
		prev = result;
		if ( ! changed ) {
			break;
		}
	}
	const wanted = new Set( absorbed.map( ( x ) => x.element ) );
	for ( const e of rootChain ) {
		wanted.has( e ) && out.flat.push( { key: e.key, candidates: [ '(the block\'s own root box)' ], why: 'it is the box the block draws as its own root (the host\'s sole visible child of its width)' } );
	}
	for ( const [ e, why ] of flatNow ) {
		wanted.has( e ) && out.flat.push( { key: e.key, candidates: baseSets.get( e ).map( ( g ) => g.head ), why } );
	}
	// What a loop copy is for the read of its slots: words (an element's own words, whatever it also holds), a glyph (a typed
	// symbol or a drawing), a control, a picture, or blank (a box or a mark with no words of its own).
	const sortOf = ( x ) => {
		const k = kindOf.get( x ) ?? draftKind( x, kids );
		const own = String( x.words ?? '' ).trim();
		return 'control' === k || 'picture' === k ? k : ALNUM.test( own ) && ! glyphy( own ) ? 'words' : own || 'glyph' === k ? 'glyph' : 'blank';
	};
	const sameSort = ( a, b ) => sortOf( a ) === sortOf( b );
	const settings = Object.entries( calibration.settings || {} );
	const held = new Set( Object.keys( taken || {} ) );
	const placedAt = new Map();
	// Each slot reads the draft item at its own position. The element is read where a slot holds it or a loop copy of it
	// (a loop is filled from its representative), whichever item's pairing placed the slot. Returns the slots that read it.
	const placeSlots = ( e, slotKeys ) => {
		const placed = [];
		const mine = ( x ) => x === e || copylessKey( x.key ) === copylessKey( e.key );
		for ( const slot of slotKeys ) {
			const at = instanceOf( e, [ ...slot.matchAll( NTH ) ].map( ( x ) => Number( x[ 1 ] ) ), { chain: chain.get( e ), parent, kids, host, repGroup } );
			// A loop's other items are read at the element in the same place only when it is the same sort of element (a badge's copy
			// is another badge, not the arrow beside another row's label; a row's words are its words whether or not a caret follows).
			if ( at && ( at === e || sameSort( at, e ) ) && ! held.has( slot ) ) {
				out.slots[ slot ] = finder( at );
				held.add( slot );
				placedAt.set( slot, at );
			}
			placedAt.has( slot ) && mine( placedAt.get( slot ) ) && placed.push( slot );
		}
		return placed;
	};
	// The part switch that makes the part group g draw the looks of another element: the switch whose target selector is a step
	// of the path of one of the group's members (the target is the part or the element round it) and whose look element's calibrated settings paint one of the looks. Returns { switch, slots } (the look
	// element's calibrated slots, at the repetition level of the target) or null.
	const stepsOf = ( path ) => String( path ?? '' ).split( ' > ' ).map( ( x ) => x.replace( NTH, '' ) );
	const lastStep = ( path ) => stepsOf( path ).pop();
	const switchPaint = ( g, looks ) => {
		for ( const sw of switches ) {
			if ( ! g.members.some( ( t ) => stepsOf( t ).includes( sw.targetSelector ) ) ) {
				continue;
			}
			const at = new Map();
			const named = new Map();
			for ( const [ name, s ] of settings ) {
				for ( const slot of [ ...new Set( [ s?.slot, ...( s?.slots || [] ) ] ) ] ) {
					if ( 'string' === typeof slot && ! slot.includes( '::' ) && lastStep( slot ) === sw.lookSelector ) {
						const set = at.get( slot ) ?? at.set( slot, new Set() ).get( slot );
						( ! s.state || 'current' === s.state ) && looksOfEntry( s, model.parts.get( templateOf( slot ) )?.tag ?? '' ).forEach( ( look ) => set.add( look ) && looks.includes( look ) && ! ( named.get( slot ) ?? [] ).includes( name ) && ( named.get( slot ) ?? named.set( slot, [] ).get( slot ) ).push( name ) );
					}
				}
			}
			const paints = new Set( [ ...at.values() ].flatMap( ( x ) => [ ...x ] ) );
			if ( looks.some( ( l ) => paints.has( l ) ) ) {
				return { switch: sw, slots: [ ...at.keys() ].sort(), named, looks: looks.filter( ( l ) => paints.has( l ) ) };
			}
		}
		return null;
	};
	for ( const { element: e, looks = [] } of absorbed ) {
		const c = result.get( e );
		if ( ! c || ! c.length ) {
			flatNow.has( e ) || rootChain.has( e ) || out.unmatched.push( { key: e.key } );
			continue;
		}
		if ( c.length > 1 ) {
			out.ambiguous.push( { key: e.key, candidates: c.map( ( g ) => g.head ) } );
			continue;
		}
		const g = c[ 0 ];
		if ( g.pseudo ) {
			out.pseudo.push( { key: e.key, part: g.head } );
			continue;
		}
		// Every calibrated slot of the box's members, with the looks its settings paint; a member drawn as vector art (the svg
		// inside an icon box) is read only at a draft svg.
		const slotLooks = new Map();
		const svg = 'svg' === String( e.tag ).toLowerCase();
		const members = g.members.filter( ( t ) => svg || ! GLYPH_TAGS.has( model.parts.get( t )?.tag ) );
		for ( const [ , s ] of settings ) {
			for ( const slot of [ ...new Set( [ s?.slot, ...( s?.slots || [] ) ] ) ] ) {
				if ( 'string' === typeof slot && ! slot.includes( '::' ) && members.includes( templateOf( slot ) ) ) {
					const set = slotLooks.get( slot ) ?? slotLooks.set( slot, new Set() ).get( slot );
					( ! s.state || 'current' === s.state ) && looksOfEntry( s, model.parts.get( templateOf( slot ) )?.tag ?? '' ).forEach( ( look ) => set.add( look ) );
				}
			}
		}
		const painted = new Set( [ ...slotLooks.values() ].flatMap( ( x ) => [ ...x ] ) );
		if ( null === looks ? ! slotLooks.size : ! looks.some( ( l ) => painted.has( l ) ) ) {
			// A part switch of the block draws the look of another element on this part (a circle round each trailing icon is the
			// caret's own box): the element is that look element's, read at its calibrated slots for this item.
			const via = null === looks ? null : switchPaint( g, looks );
			const placedVia = via ? placeSlots( e, via.slots ) : [];
			if ( placedVia.length ) {
				out.paired.push( { key: e.key, part: g.head, slots: placedVia } );
				out.switches.push( { key: e.key, part: g.head, switch: via.switch.switch, value: via.switch.value, slots: placedVia } );
				continue;
			}
			// A draft element that paints exactly what an element of the same sort already read at the look element's slot paints (the
			// same declared style): the block draws one look for every such element, so that read stands for it.
			const twin = via && via.slots.map( ( slot ) => [ slot, placedAt.get( slot ) ] ).find( ( [ , r ] ) => r && r !== e && sameSort( r, e ) && r.tag === e.tag && '' !== String( e.attrs?.style ?? '' ).trim() && r.attrs?.style === e.attrs?.style );
			if ( twin ) {
				out.paired.push( { key: e.key, part: g.head, slots: [ twin[ 0 ] ] } );
				out.switches.push( { key: e.key, part: g.head, switch: via.switch.switch, value: via.switch.value, slots: [ twin[ 0 ] ] } );
				out.siblings.push( { key: e.key, part: g.head, slot: twin[ 0 ], settings: [ ...new Set( via.named.get( twin[ 0 ] ) || [] ) ], looks, readBy: twin[ 1 ].key } );
				continue;
			}
			out.unpainted.push( { key: e.key, part: g.head, looks } );
			continue;
		}
		const placed = placeSlots( e, [ ...slotLooks.keys() ].sort() );
		if ( placed.length ) {
			out.paired.push( { key: e.key, part: g.head, slots: placed } );
			continue;
		}
		// No slot of the part lies at this element's position (the block draws that position as another kind of row): when an
		// element of its own repetition group, of the same sort and tag, is read at one of the part's slots, the block draws one
		// look for the group and that read stands for this element. A slot that does lie at its position and that another finder
		// holds is no such case: the element stays unpaired, and says so.
		const group = repGroup( e ).filter( ( x ) => x !== e );
		const lands = [ ...slotLooks.keys() ].some( ( sl ) => instanceOf( e, [ ...sl.matchAll( NTH ) ].map( ( x ) => Number( x[ 1 ] ) ), { chain: chain.get( e ), parent, kids, host, repGroup } ) === e );
		const readSlot = lands ? undefined : [ ...slotLooks.keys() ].sort().find( ( sl ) => ( ( r ) => r && group.includes( r ) && sameSort( r, e ) && r.tag === e.tag )( placedAt.get( sl ) ) );
		if ( readSlot ) {
			out.paired.push( { key: e.key, part: g.head, slots: [] } );
			const named = settings.filter( ( [ , s ] ) => ( ! s.state || 'current' === s.state ) && [ s?.slot, ...( s?.slots || [] ) ].includes( readSlot ) && ( null === looks || looks.includes( lookOfProperty( s.property, model.parts.get( templateOf( readSlot ) )?.tag ?? '' ) ) ) ).map( ( [ name ] ) => name );
			out.siblings.push( { key: e.key, part: g.head, slot: readSlot, settings: [ ...new Set( named ) ], looks: looks ?? [], readBy: placedAt.get( readSlot ).key } );
		} else {
			out.ambiguous.push( { key: e.key, candidates: [ g.head ], why: 'the draft has no element at any of the part\'s calibrated positions, or another finder holds them' } );
		}
	}
	return out;
}

// The conditional parts of a block's look as a reading of elements, one tag at the widest width (lib/setting-record.mjs::
// readRecord `conditionalParts`: the paths pages that set a setting draw and the default look lacks).
const conditionalElements = ( cond ) => Object.fromEntries( Object.entries( cond || {} ).map( ( [ p, c ] ) => [ p, { [ WIDTH ]: { _tag: c?.tag ?? '' } } ] ) );

// pairCore with a second chance: a draft element no part of the block's default look fits (no candidate at all, not an
// ambiguous or a flat one) is offered the parts pages that switch a setting on draw (`calibration.conditionalParts`), added to
// the default parts for that run only, so what the default parts already resolve is never touched. A slot the first run took
// is kept by it.
export function pairAbsorbed( args ) {
	const first = pairCore( args );
	const cond = conditionalElements( args.calibration?.conditionalParts );
	const retry = new Set( first.unmatched.map( ( u ) => u.key ) );
	if ( ! retry.size || ! Object.keys( cond ).length ) {
		return first;
	}
	const merged = { ...args.calibration.elements };
	Object.keys( cond ).forEach( ( k ) => k in merged || ( merged[ k ] = cond[ k ] ) );
	const second = pairCore( { ...args, absorbed: args.absorbed.filter( ( a ) => retry.has( a.element.key ) ), calibration: { ...args.calibration, elements: merged } } );
	const free = ( x ) => ! x.slots || x.slots.every( ( sl ) => ! ( sl in first.slots ) );
	const out = { ...first };
	const got = new Set();
	for ( const k of [ 'paired', 'ambiguous', 'unpainted', 'pseudo', 'flat', 'switches', 'siblings' ] ) {
		const add = second[ k ].filter( ( x ) => retry.has( x.key ) && free( x ) );
		add.forEach( ( x ) => got.add( x.key ) );
		out[ k ] = [ ...first[ k ], ...add ];
	}
	out.unmatched = first.unmatched.filter( ( u ) => ! got.has( u.key ) );
	out.slots = { ...second.slots, ...first.slots };
	return out;
}

// What a pairing says on the proposal: { paired: Set( key ), notes: Map( key -> host row note ), problems: [ text ] }. An
// element several parts fit is a problem (one per draft template, its loop copies are one), never a guess; one paired with a
// part no setting of which paints its looks, or with a pseudo-element part, is a note: the row stays failing.
export function pairingNotes( pairing, block ) {
	const out = { paired: new Set( ( pairing?.paired || [] ).map( ( p ) => p.key ) ), notes: new Map(), problems: [] };
	const listed = new Set();
	for ( const a of pairing?.ambiguous || [] ) {
		const text = `${ a.key } fits ${ a.candidates.length > 1 ? 'several measured parts' : 'one measured part' } of ${ block } (${ a.candidates.join( ' | ' ) })${ a.why ? `, and ${ a.why }` : '' }: not paired, so its looks are not read`;
		out.notes.set( a.key, text );
		const id = copylessKey( a.key );
		listed.has( id ) || ( listed.add( id ), out.problems.push( `paint pairing: ${ text }` ) );
	}
	for ( const u of pairing?.unpainted || [] ) {
		out.notes.set( u.key, `${ u.key } is ${ block }'s part ${ u.part }, and no setting of that part paints ${ u.looks.join( '/' ) }: a setting the block lacks` );
	}
	for ( const f of pairing?.flat || [] ) {
		out.paired.add( f.key );
	}
	for ( const p of pairing?.pseudo || [] ) {
		out.notes.set( p.key, `${ p.key } is ${ block }'s pseudo-element part ${ p.part }, which no slot reads from a draft element` );
	}
	return out;
}

// The record each refused element carries on its proposal row (lib/skeleton-paint-conservation.mjs RECORD_KINDS unpaired):
// Map( key -> { kind: 'unpaired', block, candidates, why? } ), one per element several parts fit or no part position holds.
export function unpairedRecords( pairing, block ) {
	return new Map( [ ...( pairing?.ambiguous || [] ), ...( pairing?.flat || [] ) ].map( ( a ) => [ a.key, { kind: 'unpaired', block, candidates: a.candidates, ...( a.why ? { why: a.why } : {} ) } ] ) );
}

// The draft element at a repeated part's position: the k-th item at each repetition level, reached by the same child steps
// the element takes from its own items. ks: the slot's `:nth-of-type(k)` numbers, outermost first. Null where the draft has
// no such item, a step lands on another tag, or the slot repeats at another depth than the element.
export function instanceOf( e, ks, { chain, parent, kids, host, repGroup } ) {
	if ( ks.length !== chain.length ) {
		return null;
	}
	const path = [];
	for ( let x = e; x && x !== host; x = parent.get( x ) ) {
		path.unshift( x );
	}
	let cur = host;
	let level = 0;
	for ( const x of path ) {
		let next;
		if ( chain.includes( x ) ) {
			next = repGroup( x, cur )[ ks[ level++ ] - 1 ];
		} else {
			const at = kids( parent.get( x ) ).indexOf( x );
			next = kids( cur )[ at ];
		}
		if ( ! next || next.tag !== x.tag ) {
			return null;
		}
		cur = next;
	}
	return cur === host ? null : cur;
}
