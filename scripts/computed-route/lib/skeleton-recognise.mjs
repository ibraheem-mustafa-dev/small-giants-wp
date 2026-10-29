// Skeleton writer, recognition by names and attributes (Spec 48 FR-48-6): the framework DB's block names and attribute
// enums are matched against an element's own features, so a block no hand rule names can still be chosen. Features are
// read from the element: the words of its class, id, aria-label, title and role, the kind its link host stands for
// (rules.linkSourceForKind.hosts), its position (fixed, sticky or in flow, computed per read width or declared), the
// viewport corner or edge it is fixed to, and, for a bar fixed or sticky across the whole width, the words rules.recognise
// .featureWords gives that shape. A block is a candidate only when it is mode-bearing (an attribute whose enum holds a
// floating mode, or whose name says sticky), so the self-floating family is chosen from data and a gallery named by a
// class is not. A word in the block's name scores 1 / (the number of blocks named with it) and a word only in an enum value half of
// 1 / (the number of blocks holding it); at least one name word must match, so a word only one block carries is decisive. The element is the block when the top score reaches rules.recognise.minScore and
// beats the second. The mode follows the element alone: fixed to the viewport is the floating value of the mode setting
// (with the corner, offset and hidden-label width the draft shows); sticky is the sticky setting with its edge; in flow
// is the block's static or inline value, so the same block in flow stays where the draft puts it; in flow an element with
// no words (a brand icon in a row of icons) is never recognised.

const words = ( s ) => String( s ?? '' ).replace( /([a-z])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( ( w ) => w.length >= 3 );
const stem = ( w ) => ( w.length > 4 && w.endsWith( 's' ) ? w.slice( 0, -1 ) : w );
const px = ( v ) => {
	const n = /^(-?[\d.]+)px$/.exec( String( v ?? '' ).trim() );
	return n ? Number( n[ 1 ] ) : null;
};
const set = ( v ) => v && 'auto' !== String( v ).trim() && String( v ).trim() !== '';

// The host of an address, or ''.
const hostOf = ( href ) => {
	try {
		return new URL( String( href ), 'https://x.invalid' ).host.toLowerCase().replace( /^www\./, '' );
	} catch {
		return '';
	}
};

// The kind a link's host stands for (rules.linkSourceForKind.hosts: wa.me is whatsapp), or null.
export const hostKindOf = ( href, hosts = {} ) => hosts[ hostOf( href ) ] || null;

// o: { m (the inventory model), facts }. Returns { recognise( e ) }: a verdict { block, attributes, evidence } or null.
export function makeRecogniser( { m, facts } ) {
	// The declared style of an element: the record's declarations through the one reader (lib/element-facts.mjs).
	const declaredStyle = ( e ) => m.read.declared( e );
	const D = facts.decisions.rules?.recognise;
	const hosts = facts.decisions.rules?.linkSourceForKind?.hosts || {};
	let index = null;
	// The roster read once: each block's name words, its enum-value words, its settings, and the document frequency of a word.
	const roster = () => {
		if ( index ) {
			return index;
		}
		const attrs = facts.q( 'SELECT block_slug, attr_name, attr_type, default_value, enum_values FROM block_attributes' );
		const by = {};
		attrs.forEach( ( a ) => ( by[ a.block_slug ] ||= [] ).push( { ...a, enums: a.enum_values ? JSON.parse( a.enum_values ) : null } ) );
		const slugs = facts.q( 'SELECT slug FROM blocks' ).map( ( r ) => r.slug );
		const df = {};
		const nameDf = {};
		const blocks = slugs.map( ( slug ) => {
			const nameWords = new Set( words( slug.replace( /^[a-z]+\//, '' ).replace( /-/g, ' ' ) ).map( stem ) );
			const enumWords = new Set( ( by[ slug ] || [] ).flatMap( ( a ) => ( a.enums || [] ).flatMap( ( v ) => words( String( v ).replace( /-/g, ' ' ) ).map( stem ) ) ) );
			new Set( [ ...nameWords, ...enumWords ] ).forEach( ( w ) => ( df[ w ] = ( df[ w ] || 0 ) + 1 ) );
			nameWords.forEach( ( w ) => ( nameDf[ w ] = ( nameDf[ w ] || 0 ) + 1 ) );
			const modes = ( by[ slug ] || [] ).filter( ( a ) => ( a.enums || [] ).includes( D.modes.floating ) || /sticky/i.test( a.attr_name ) );
			return { slug, nameWords, enumWords, attrs: by[ slug ] || [], bearing: modes.length > 0 };
		} );
		index = { blocks, df, nameDf };
		return index;
	};

	// How wide an element is drawn at each read width, as a share of that width, at the widths it renders.
	const shares = ( e ) => Object.keys( e.box || {} ).filter( ( w ) => e.box[ w ]?.w > 0 && false !== e.visible?.[ w ] ).map( ( w ) => e.box[ w ].w / Number( w ) );
	// Whether the element is a bar: drawn across the whole width and no taller than rules.recognise.barMaxHeightPx at every width it renders.
	const isBar = ( e ) => shares( e ).length > 0 && shares( e ).every( ( s ) => s >= D.barShare ) && Object.keys( e.box || {} ).filter( ( w ) => e.box[ w ]?.w > 0 && false !== e.visible?.[ w ] ).every( ( w ) => e.box[ w ].h <= D.barMaxHeightPx );

	const gatherWords = ( x ) => [ m.words( x ), ...m.blockKids( x ).map( gatherWords ) ].filter( Boolean ).join( ' ' );

	// The strip root an element is the content of, when the strip root is out of flow or sticky across the width: the root's
	// position, width and class words are the content's own features (the root is the header's row, so the content is the block).
	const stripHost = ( e ) => {
		const up = m.byKey[ e.parentKey ];
		return up?.strip && 'flow' !== modeOf( up ) ? up : null;
	};
	const modeOf = ( e ) => {
		const st = declaredStyle( e );
		const at = ( p ) => st.position === p || Object.keys( e.box || {} ).some( ( w ) => e.box[ w ]?.w > 0 && false !== e.visible?.[ w ] && e.position?.[ w ] === p );
		return at( 'fixed' ) ? 'floating' : at( 'sticky' ) ? 'sticky' : 'flow';
	};

	function features( e ) {
		const host = stripHost( e );
		const src = host || e;
		const st = declaredStyle( src );
		const mode = modeOf( src );
		const kind = hosts[ hostOf( e.attrs?.href ) ] || null;
		const hostWords = hostOf( e.attrs?.href ).split( '.' ).flatMap( words );
		const attrWords = [ e, host ].filter( Boolean ).flatMap( ( x ) => [ x.attrs?.class, x.attrs?.id, x.attrs?.[ 'aria-label' ], x.attrs?.title, x.attrs?.role ] ).flatMap( words );
		const wide = 'flow' !== mode && isBar( src );
		const own = 'flow' !== mode ? words( gatherWords( e ) ) : [];
		const vert = set( st.top ) ? 'top' : set( st.bottom ) ? 'bottom' : null;
		const horiz = set( st.left ) ? 'left' : set( st.right ) ? 'right' : null;
		const tokens = [ ...new Set( [ ...( kind ? [ kind ] : [] ), ...hostWords, ...attrWords, ...own, ...( wide ? D.featureWords.bar : [] ) ].map( stem ) ) ];
		return { st, mode, kind, tokens, wide, corner: vert && horiz ? `${ vert }-${ horiz }` : null, edge: vert, offset: vert && horiz && set( st[ vert ] ) && px( st[ vert ] ) === px( st[ horiz ] ) ? st[ vert ] : null };
	}

	// An element that holds only text, a glyph or a picture: not a section of the page that merely carries a class.
	const simple = ( e ) => {
		const walk = ( x ) => [ x, ...m.blockKids( x ).flatMap( walk ) ];
		const all = walk( e );
		return all.length <= D.maxParts && ! all.some( ( x ) => /^(h[1-6]|ul|ol|form|nav|section|article|table|header|footer|main|aside)$/.test( x.tag ) );
	};

	// The width below which the draft hides the element's words: the smallest read width where they show, when a narrower one hides them.
	const hideLabelBelow = ( e ) => {
		const walk = ( x ) => [ x, ...m.blockKids( x ).flatMap( walk ) ];
		const label = walk( e ).slice( 1 ).find( ( x ) => m.words( x ) );
		if ( ! label ) {
			return null;
		}
		const ws = Object.keys( label.visible || {} ).map( Number ).sort( ( a, b ) => a - b );
		const shown = ws.find( ( w ) => label.visible[ w ] );
		return shown && ws.some( ( w ) => w < shown && ! label.visible[ w ] ) ? shown : null;
	};

	function recognise( e ) {
		if ( ! D || ! e.tag || ! simple( e ) ) {
			return null;
		}
		const f = features( e );
		// In flow, a link with no words of its own is an icon (a brand icon in a social row draws it), never the block.
		if ( 'flow' === f.mode && ! gatherWords( e ).trim() ) {
			return null;
		}
		const { blocks, df, nameDf } = roster();
		const scored = blocks.filter( ( b ) => b.bearing ).map( ( b ) => {
			const named = f.tokens.filter( ( t ) => b.nameWords.has( t ) );
			const valued = f.tokens.filter( ( t ) => ! b.nameWords.has( t ) && b.enumWords.has( t ) );
			return { b, named, hit: [ ...named, ...valued ], score: named.reduce( ( a, t ) => a + 1 / nameDf[ t ], 0 ) + valued.reduce( ( a, t ) => a + 0.5 / df[ t ], 0 ) };
		} ).filter( ( x ) => x.named.length ).sort( ( a, b ) => b.score - a.score );
		const [ top, next ] = scored;
		if ( ! top || top.score < D.minScore || ( next && next.score >= top.score ) ) {
			return null;
		}
		const { b } = top;
		const a = {};
		const evidence = [ `names and attributes: ${ b.slug } holds ${ top.hit.join( ', ' ) } (score ${ top.score.toFixed( 2 ) }, features: ${ f.mode }${ f.kind ? `, link kind ${ f.kind }` : '' }${ f.wide ? ', a full-width bar' : '' })` ];
		const modeAttr = b.attrs.find( ( x ) => ( x.enums || [] ).includes( D.modes.floating ) );
		if ( 'floating' === f.mode && modeAttr ) {
			a[ modeAttr.attr_name ] = D.modes.floating;
			const corner = f.corner && b.attrs.find( ( x ) => ( x.enums || [] ).includes( f.corner ) );
			corner && ( a[ corner.attr_name ] = f.corner );
			const off = f.offset && b.attrs.find( ( x ) => 'object' === x.attr_type && /^floating.*offset$/i.test( x.attr_name ) );
			off && ( a[ off.attr_name ] = { desktop: f.offset } );
			const hide = b.attrs.find( ( x ) => 'number' === x.attr_type && /hide.*label.*below/i.test( x.attr_name ) );
			const below = hide && hideLabelBelow( e );
			below && ( a[ hide.attr_name ] = below );
			evidence.push( `fixed to the viewport (${ f.corner || f.edge || 'no edge declared' }): ${ modeAttr.attr_name } = ${ D.modes.floating }` );
		} else if ( 'flow' === f.mode && modeAttr ) {
			const flow = ( modeAttr.enums || [] ).find( ( v ) => D.modes.flow.includes( v ) );
			flow && ( a[ modeAttr.attr_name ] = flow );
			evidence.push( `in flow: ${ modeAttr.attr_name } = ${ flow }` );
		} else if ( 'sticky' === f.mode || ( 'floating' === f.mode && ! modeAttr ) ) {
			const sticky = b.attrs.find( ( x ) => /sticky/i.test( x.attr_name ) && ( x.enums || [] ).includes( f.edge || 'top' ) );
			sticky && ( a[ sticky.attr_name ] = f.edge || 'top' );
			const bar = f.wide && b.attrs.find( ( x ) => ( x.enums || [] ).some( ( v ) => D.featureWords.bar.includes( v ) ) && /mode/i.test( x.attr_name ) );
			bar && ( a[ bar.attr_name ] = bar.enums.find( ( v ) => top.hit.includes( stem( v ) ) ) || bar.enums.find( ( v ) => D.featureWords.bar.includes( v ) ) );
			evidence.push( `${ f.mode }${ sticky ? `: ${ sticky.attr_name } = ${ a[ sticky.attr_name ] }` : '' }` );
		}
		const gather = ( x ) => [ m.words( x ), ...m.blockKids( x ).map( gather ) ].filter( Boolean ).join( ' ' );
		const allText = gather( e );
		const label = allText && b.attrs.find( ( x ) => 'label' === x.attr_name || ( 'text' === x.attr_name && 'string' === x.attr_type ) );
		label && ( a[ label.attr_name ] = allText );
		return { block: b.slug, attributes: a, evidence, mode: f.mode };
	}

	return { recognise, features };
}
