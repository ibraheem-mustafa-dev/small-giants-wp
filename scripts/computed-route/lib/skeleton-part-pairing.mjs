// The general pairing of paint conservation (Spec 48 section 3.4): which of a block's measured parts an absorbed draft element
// is, decided by what the part is rather than by where the block's markup puts it. A block that draws its own inner parts (a
// picker's chips, a tiles field's tiles and their marks) swallows the draft elements that are those parts; their looks reach
// the clone only when the skeleton names the draft element at the part's calibrated slot (`draftSlots`). The slot walk
// (lib/skeleton-conserve-slots.mjs::walkSlot) lands only where the draft's markup has the block's shape; this pairing runs
// where it gives up.
//
// Everything block-specific comes from the block's calibration: its default paint (`elements`: each part's selector path with
// `_tag` and `_position` per width), its parts' own words and boxes inside the block where the paint file records them
// (`parts`, lib/calibrate-read.mjs::readPartsInPage), its settings (the slot each is calibrated at) and its text fields
// (`text`). Both sides are described by signals each carries:
// - kind: a control, a picture, a glyph, a mark (a box with no words), words, or a box holding other boxes;
// - repetition: a part whose path counts `:nth-of-type` steps repeats once per item, and so does a draft element with loop
//   copies or same-shaped sibling controls; the counts must be equal;
// - out of flow: a draft element absolutely or fixed placed at every width it is drawn at is only an out-of-flow part, and
//   one placed so at some widths only may be either;
// - containment: an element inside a paired element pairs only inside that pair's part, preferring that part's direct
//   children, and an ambiguous wrapper keeps only the parts that hold its paired children; an element inside a draft element
//   the node already holds at a part's slot (`taken`) pairs inside that part the same way;
// - words: where several parts fit, a worded element keeps the parts printing the same words, else the parts printing the
//   same kind of words (a number, a price, other words);
// - place: where several parts still fit, the part whose box centre inside the block lies nearest the element's centre inside
//   its host, both as shares of the block's size, when it is near (PLACE_NEAR) and every other part at least twice as far.
// A part and its sole visible child of the same width are one visible box (a label drawn round a pill). A pairing is used only
// when exactly one part fits; two different draft elements in one item claiming the same part are both left unpaired. Nothing
// here names a block, a part or a class.
import { copylessKey } from './fact-key.mjs';
import { lookOfProperty } from './skeleton-paint-conservation.mjs';

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
			hidden: oof && null !== width && width <= 1.5,
			words: seen.get( t )?.words ?? null, box: seen.get( t )?.box?.[ WIDTH ] ?? null,
			painted: ! NO_PAINT.test( String( v[ 'background-color' ] ?? '' ).trim() ) || ( px( v[ 'border-top-width' ] ) ?? 0 ) > 0,
		} );
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
			level: head.level, oof: ms.some( ( p ) => p.oof ), hidden: ms.every( ( p ) => p.hidden ), pseudo: head.pseudo, root: g.members.includes( '' ),
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
// reads (its subtree is that block's); calibration: { elements, settings, text }; finder( element ); taken: the slots the node
// already holds. Returns { slots: { slot: finder }, paired: [ { key, part, slots } ], ambiguous: [ { key, candidates } ],
// unpainted: [ { key, part, looks } ], pseudo: [ { key, part } ] }.
export function pairAbsorbed( { host, absorbed = [], kids, isNode = () => false, calibration = {}, finder, taken = {} } ) {
	const out = { slots: {}, paired: [], ambiguous: [], unpainted: [], pseudo: [] };
	const elements = calibration?.elements || {};
	if ( ! host || ! absorbed.length || ! Object.keys( elements ).length ) {
		return out;
	}
	const model = partModel( elements, Object.values( calibration.text || {} ).map( ( x ) => x?.path ).filter( Boolean ), calibration.parts );
	const groups = [ ...model.groups.values() ].filter( ( g ) => ! g.root && ! g.hidden );
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
	// The part a draft element already holds a slot of (the trigger the slot walk gave the host itself): what lies inside
	// that element pairs inside that part, as inside a part this pairing chose.
	const takenAt = new Map();
	for ( const [ slot, f ] of Object.entries( taken || {} ) ) {
		const g = model.groups.get( model.headOf.get( templateOf( slot ) ) );
		const id = JSON.stringify( f );
		g && ! g.root && ! slot.includes( '::' ) && ! takenAt.has( id ) && takenAt.set( id, g );
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
	const banned = new Map();
	const forced = new Map();
	let result;
	for ( let round = 0; round < 6; round++ ) {
		result = new Map();
		for ( const e of order ) {
			const kind = kindOf.get( e );
			const flows = flowsOf( e );
			const oof = flows.every( Boolean );
			let up = null;
			for ( let x = parent.get( e ); x && x !== host; x = parent.get( x ) ) {
				if ( 1 === result.get( x )?.length ) {
					up = result.get( x )[ 0 ];
					break;
				}
			}
			up = up ?? heldPart( e );
			let cands = groups.filter( ( g ) => g.level === chain.get( e ).length && FITS[ kind ].includes( g.kind ) && ( ! oof || g.oof ) && ( ! up || up.inside.has( g.head ) ) );
			for ( const tier of [ ( g ) => g.kind === kind, ( g ) => ! up || g.parentHead === up.head, ( g ) => flows.includes( g.oof ) ] ) {
				const kept = cands.filter( tier );
				kept.length && ( cands = kept );
			}
			cands.length > 1 && ( cands = byWords( cands, e ) );
			cands.length > 1 && ( cands = byPlace( cands, e, host, model.rootBox ) );
			result.set( e, banned.has( e ) ? [ banned.get( e ), SHARED ] : forced.has( e ) ? [ forced.get( e ) ] : cands );
		}
		let changed = false;
		// An ambiguous wrapper keeps only the parts that hold every part its paired children took.
		for ( const e of [ ...order ].reverse() ) {
			const c = result.get( e );
			if ( c.length < 2 || forced.has( e ) || banned.has( e ) ) {
				continue;
			}
			const below = order.filter( ( d ) => isAbove( e, d ) && 1 === result.get( d ).length ).map( ( d ) => result.get( d )[ 0 ].head );
			const kept = below.length ? c.filter( ( g ) => ! g.shared && below.every( ( h ) => g.inside.has( h ) ) ) : [];
			if ( 1 === kept.length ) {
				forced.set( e, kept[ 0 ] );
				changed = true;
			}
		}
		// One part in one item is one draft element: two elements of the same item claiming it are both left unpaired.
		const claims = new Map();
		for ( const e of order ) {
			const c = result.get( e );
			if ( 1 === c.length ) {
				const id = [ c[ 0 ].head, ...chain.get( e ).map( ( x ) => x.key ) ].join( '|' );
				( claims.get( id ) ?? claims.set( id, [] ).get( id ) ).push( e );
			}
		}
		for ( const list of claims.values() ) {
			list.length > 1 && list.forEach( ( e ) => banned.has( e ) || ( banned.set( e, result.get( e )[ 0 ] ), forced.delete( e ), changed = true ) );
		}
		if ( ! changed ) {
			break;
		}
	}
	const settings = Object.entries( calibration.settings || {} );
	const held = new Set( Object.keys( taken || {} ) );
	const placedAt = new Map();
	for ( const { element: e, looks = [] } of absorbed ) {
		const c = result.get( e );
		if ( ! c || ! c.length ) {
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
					const look = lookOfProperty( s.property, model.parts.get( templateOf( slot ) )?.tag ?? '' );
					const set = slotLooks.get( slot ) ?? slotLooks.set( slot, new Set() ).get( slot );
					look && ( ! s.state || 'current' === s.state ) && set.add( look );
				}
			}
		}
		const painted = new Set( [ ...slotLooks.values() ].flatMap( ( x ) => [ ...x ] ) );
		if ( null === looks ? ! slotLooks.size : ! looks.some( ( l ) => painted.has( l ) ) ) {
			out.unpainted.push( { key: e.key, part: g.head, looks } );
			continue;
		}
		// Each slot reads the draft item at its own position. The element is read where a slot holds it or a loop copy of it
		// (a loop is filled from its representative), whichever item's pairing placed the slot.
		const placed = [];
		const mine = ( x ) => x === e || copylessKey( x.key ) === copylessKey( e.key );
		for ( const slot of [ ...slotLooks.keys() ].sort() ) {
			const at = instanceOf( e, [ ...slot.matchAll( NTH ) ].map( ( x ) => Number( x[ 1 ] ) ), { chain: chain.get( e ), parent, kids, host, repGroup } );
			if ( at && ! held.has( slot ) ) {
				out.slots[ slot ] = finder( at );
				held.add( slot );
				placedAt.set( slot, at );
			}
			placedAt.has( slot ) && mine( placedAt.get( slot ) ) && placed.push( slot );
		}
		placed.length ? out.paired.push( { key: e.key, part: g.head, slots: placed } ) : out.ambiguous.push( { key: e.key, candidates: [ g.head ], why: 'the draft has no element at any of the part\'s calibrated positions, or another finder holds them' } );
	}
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
	for ( const p of pairing?.pseudo || [] ) {
		out.notes.set( p.key, `${ p.key } is ${ block }'s pseudo-element part ${ p.part }, which no slot reads from a draft element` );
	}
	return out;
}

// The record each refused element carries on its proposal row (lib/skeleton-paint-conservation.mjs RECORD_KINDS unpaired):
// Map( key -> { kind: 'unpaired', block, candidates, why? } ), one per element several parts fit or no part position holds.
export function unpairedRecords( pairing, block ) {
	return new Map( ( pairing?.ambiguous || [] ).map( ( a ) => [ a.key, { kind: 'unpaired', block, candidates: a.candidates, ...( a.why ? { why: a.why } : {} ) } ] ) );
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
