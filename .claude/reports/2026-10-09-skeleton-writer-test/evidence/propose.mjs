// Deterministic skeleton writer prototype (FR-47-4 input): turns the footer inventory into a Fill skeleton.
// Block knowledge comes from data only (R-31-1): the framework DB (read-only), the brand registry, the client's
// Site Info placeholder map, the calibration cache's element keys, and the 16 committed Eye Care trees other than
// footer.tree.json (leave-one-out precedents). No block dict is written here; the only hand rules are structural
// (an element with block children wraps them, svg descendants are parts of their icon) and three content detectors
// marked HEURISTIC below.
//
// Usage: node propose.mjs   (reads ../inventory/inventory.json, writes skeleton.json + proposal.json beside this file)
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = 'C:/Users/Bean/Projects/small-giants-wp';
const CR = path.join( REPO, 'scripts/computed-route' );
const imp = ( p ) => import( pathToFileURL( path.join( CR, p ) ).href );
const { openDb } = await imp( 'lib/db.mjs' );
const { skeletonProblems, expandSiteInfoRows, cleanTree } = await imp( 'lib/fill-skeleton.mjs' );
const { lintSkeleton } = await imp( 'lint.mjs' );
const { brandRegistry, brandOwnsAddress } = await imp( 'lib/brand-registry.mjs' );

const inv = JSON.parse( fs.readFileSync( path.join( HERE, '../inventory/inventory.json' ), 'utf8' ) );
const SITE = path.join( REPO, 'sites/eye-care-ward-end' );
const placeholderMap = JSON.parse( fs.readFileSync( path.join( SITE, 'site-info-placeholder-map.json' ), 'utf8' ) );
const db = openDb();
const brands = brandRegistry();

// ---------- DB facts ----------
const q = ( sql, ...a ) => db.prepare( sql ).all( ...a );
const TAG_MAP = Object.fromEntries( q( 'SELECT html_tag, core_block_slug, note FROM html_tag_to_core_block' ).map( ( r ) => [ r.html_tag, r ] ) );
const COMPOSITION = Object.fromEntries( q( 'SELECT block_slug, composition_role, accepts_allowed_blocks FROM block_composition' ).map( ( r ) => [ r.block_slug, r ] ) );
const capsOf = ( slug ) => q( 'SELECT capability FROM block_capabilities WHERE block_slug = ?', slug ).map( ( r ) => r.capability );
const blocksWithCap = ( cap ) => q( 'SELECT DISTINCT block_slug FROM block_capabilities WHERE capability = ?', cap ).map( ( r ) => r.block_slug );
const attr = ( slug, name ) => q( 'SELECT attr_name, attr_type, default_value, enum_values, role, css_property FROM block_attributes WHERE block_slug = ? AND attr_name = ?', slug, name )[ 0 ] || null;
const attrsByRole = ( slug, role ) => q( 'SELECT attr_name, attr_type FROM block_attributes WHERE block_slug = ? AND role = ? AND css_property IS NULL', slug, role );
const enumOf = ( slug, name ) => {
	const a = attr( slug, name );
	return a?.enum_values ? JSON.parse( a.enum_values ) : null;
};
const WRAPPER_BLOCKS = Object.values( COMPOSITION ).filter( ( r ) => 'wrapper-shell' === r.composition_role ).map( ( r ) => r.block_slug );
// A content block whose accepts list is exactly one child block: a row of that child.
const ROW_BLOCKS = Object.values( COMPOSITION ).filter( ( r ) => 'content-block' === r.composition_role && r.accepts_allowed_blocks ).map( ( r ) => ( { slug: r.block_slug, accepts: JSON.parse( r.accepts_allowed_blocks ) } ) ).filter( ( r ) => 1 === r.accepts.length );

// ---------- precedents (leave-one-out) ----------
const BUILD = path.join( SITE, 'build' );
const treeFiles = fs.readdirSync( BUILD ).filter( ( f ) => f.endsWith( '.tree.json' ) && 'footer.tree.json' !== f );
const P = { files: treeFiles, total: {}, nodes: [] };
const walk = ( list, file, parent, cb ) => ( Array.isArray( list ) ? list : [ list ] ).forEach( ( n ) => {
	if ( ! n?.name ) {
		return;
	}
	cb( n, file, parent );
	walk( n.innerBlocks || [], file, n, cb );
} );
for ( const f of treeFiles ) {
	walk( JSON.parse( fs.readFileSync( path.join( BUILD, f ), 'utf8' ) ), f, null, ( n, file, parent ) => {
		P.total[ n.name ] = ( P.total[ n.name ] || 0 ) + 1;
		P.nodes.push( { n, file, parent } );
	} );
}
const isLinkNode = ( n ) => ( 'sgs/button' === n.name && ( n.attributes?.url || n.attributes?.linkSource ) ) || ( 'sgs/text' === n.name && /^\s*<a [^>]*>[^<]*<\/a>\s*$/.test( n.attributes?.text || '' ) );
const isTextLeaf = ( n ) => 'leaf' === COMPOSITION[ n.name ]?.composition_role && ! ( n.innerBlocks || [] ).length && ! isLinkNode( n ) && attrsByRole( n.name, 'text-content' ).some( ( a ) => 'string' === typeof n.attributes?.[ a.attr_name ] && n.attributes[ a.attr_name ].trim() && ! /<a /.test( n.attributes[ a.attr_name ] ) );
// The precedent contexts this generator asks about. Each returns { block -> count } plus the files it came from.
const tally = ( pred, keyOf = ( x ) => x.n.name ) => {
	const out = {};
	const files = {};
	P.nodes.filter( pred ).forEach( ( x ) => {
		const k = keyOf( x );
		out[ k ] = ( out[ k ] || 0 ) + 1;
		( files[ k ] = files[ k ] || new Set() ).add( x.file );
	} );
	return { counts: out, files: Object.fromEntries( Object.entries( files ).map( ( [ k, v ] ) => [ k, [ ...v ] ] ) ) };
};
const siteInfoKind = ( x ) => {
	const a = x.n.attributes || {};
	if ( 'sgs/business-info' === x.n.name ) {
		return a.displayType || 'phone';
	}
	if ( 'sgs/button' === x.n.name && a.linkSource && 'url' !== a.linkSource ) {
		return a.linkSource;
	}
	return null;
};
const PREC = {
	// A Site Info kind (phone, address, hours, copyright, whatsapp) rendered by which block.
	siteInfo: ( kind ) => tally( ( x ) => kind === siteInfoKind( x ) ),
	// The same, but only where the node sits among link siblings (a link column).
	siteInfoInLinks: ( kind ) => tally( ( x ) => kind === siteInfoKind( x ) && ( x.parent?.innerBlocks || [] ).some( ( s ) => s !== x.n && isLinkNode( s ) ) ),
	// A plain text link with a label.
	textLink: tally( ( x ) => isLinkNode( x.n ) && 'url' === ( x.n.attributes?.linkSource || 'url' ) ),
	// The first child of a stack whose other children are links (or one container of links): a column label.
	columnLabel: tally( ( x ) => {
		const sibs = x.parent?.innerBlocks || [];
		if ( sibs[ 0 ] !== x.n || sibs.length < 2 || ! isTextLeaf( x.n ) ) {
			return false;
		}
		const rest = sibs.slice( 1 );
		return rest.every( isLinkNode ) || ( 1 === rest.length && ( rest[ 0 ].innerBlocks || [] ).length > 1 && rest[ 0 ].innerBlocks.every( isLinkNode ) );
	} ),
	// A text leaf: a DB leaf block with no children, a filled text-content attribute (DB role) that is not a link.
	textLeaf: tally( ( x ) => isTextLeaf( x.n ) ),
	// A row: a parent whose two or more children are all the given block.
	rowOf: ( child ) => tally( ( x ) => ( x.n.innerBlocks || [] ).length > 1 && x.n.innerBlocks.every( ( c ) => child === c.name ) ),
	// A brand icon bound to Site Info.
	brandIcon: tally( ( x ) => 'sgs/icon' === x.n.name && 'brand' === x.n.attributes?.iconSource ),
	// A wrapper with block children.
	wrapper: tally( ( x ) => ( x.n.innerBlocks || [] ).length > 0 && WRAPPER_BLOCKS.includes( x.n.name ) ),
	containerTag: tally( ( x ) => 'sgs/container' === x.n.name, ( x ) => x.n.attributes?.tagName || '(default)' ),
};
// The block whose precedents use a content attribute of a role most often (label for button, text for text, ...).
const usedAttr = ( slug, role ) => {
	const cands = attrsByRole( slug, role ).map( ( a ) => a.attr_name );
	const uses = Object.fromEntries( cands.map( ( c ) => [ c, P.nodes.filter( ( x ) => x.n.name === slug && undefined !== x.n.attributes?.[ c ] ).length ] ) );
	return cands.sort( ( a, b ) => uses[ b ] - uses[ a ] )[ 0 ] || null;
};

// ---------- calibration element keys (slot targets) ----------
const calKeys = ( slug ) => {
	const f = path.join( CR, 'cache', `${ slug.replace( /^sgs\//, '' ) }.json` );
	return fs.existsSync( f ) ? Object.keys( JSON.parse( fs.readFileSync( f, 'utf8' ) ).elements || {} ) : [];
};
// The shortest calibration element key that ends at the given tag: the block's own copy of that draft element.
const slotKeyFor = ( slug, tag ) => calKeys( slug ).filter( ( k ) => new RegExp( `(^|> )${ tag }$` ).test( k ) ).sort( ( a, b ) => a.length - b.length )[ 0 ] || null;

// ---------- inventory model ----------
const els = inv.elements;
const byKey = Object.fromEntries( els.map( ( e ) => [ e.key, e ] ) );
const kids = ( e ) => els.filter( ( c ) => c.parentKey === e.key );
const inSvg = ( e ) => {
	for ( let p = byKey[ e.parentKey ]; p; p = byKey[ p.parentKey ] ) {
		if ( 'svg' === p.tag ) {
			return true;
		}
	}
	return false;
};
const neverShown = ( e ) => Object.values( e.visible ).every( ( v ) => ! v );
// Part of its parent rather than a block: an svg and everything in it (a glyph), or an element never shown at any width (a br).
const isPart = ( e ) => 'svg' === e.tag || inSvg( e ) || neverShown( e );
const blockKids = ( e ) => kids( e ).filter( ( c ) => ! isPart( c ) );
const footer = els.find( ( e ) => 0 === e.depth );
const hostSel = `${ footer.tag }[data-dc-tpl="${ footer.tpl }"]`;
const copyOf = ( e ) => Number( e.key.split( '#' )[ 1 ] );
// js finder: the element with this template number inside the footer and its own dc-import host, at its copy index.
const finder = ( e ) => ( e === footer
	? { js: `(root) => root.querySelector('${ hostSel }')` }
	: { js: `(root) => { const f = root.querySelector('${ hostSel }'); const h = f && f.closest('.sc-host'); return f ? [ ...f.querySelectorAll('[data-dc-tpl="${ e.tpl }"]') ].filter((x) => x.closest('.sc-host') === h)[${ copyOf( e ) }] || null : null; }` } );
const selectorOf = ( e ) => ( e === footer ? hostSel : `${ hostSel } [data-dc-tpl="${ e.tpl }"]` );
const ownStyle = ( e ) => ( /^<[^>]*\sstyle="([^"]*)"/.exec( e.snippet )?.[ 1 ] || '' );
const placeholders = ( e ) => {
	const first = /^<[^>]*>/.exec( e.snippet )?.[ 0 ] || '';
	const own = e.snippet.slice( first.length ).replace( /<[^>]*data-dc-tpl[^>]*>[\s\S]*$/, '' );
	return [ ...( first + own ).matchAll( /\{\{\s*[^}]+?\s*\}\}/g ) ].map( ( m ) => m[ 0 ].replace( /\s+/g, ' ' ) );
};
const mapEntry = ( ph ) => placeholderMap[ ph ] || placeholderMap[ ph.replace( /\{\{ ?| ?\}\}/g, ( s ) => ( s.includes( '{' ) ? '{{ ' : ' }}' ) ) ] || null;
const words = ( e ) => e.words || '';
const textWithBreaks = ( e ) => {
	// The element's own text with its never-shown br children kept as <br>, read from the annotated source.
	const inner = e.snippet.replace( /^<[^>]*>/, '' ).replace( /<\/[a-z]+>\s*$/i, '' );
	return inner.replace( /<br[^>]*>/gi, '<br>' ).replace( /<(?!br>)[^>]+>/g, '' ).replace( /\s+/g, ' ' ).trim();
};

// ---------- content detectors ----------
// Site Info kinds come from business-info's displayType enum (DB) intersected with what Site Info holds.
const DISPLAY_TYPES = enumOf( 'sgs/business-info', 'displayType' ) || [];
// HEURISTIC 1 (copyright): business-info render.php's own marker regex: /^\s*(?:copyright\b|\(c\)|©|&copy;)/i.
const looksCopyright = ( t ) => /^\s*(?:copyright\b|\(c\)|©|&copy;)/i.test( t );
// HEURISTIC 2 (hours): day-name abbreviation followed by a time range. ASSUMED, not from data.
const looksHours = ( t ) => /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b.*\d{1,2}[.:]\d{2}/i.test( t );
// HEURISTIC 3 (address): a link to a maps host, or a UK postcode in the words. ASSUMED, not from data.
const looksAddress = ( e ) => /maps\.google|google\.[a-z.]+\/maps|maps\.apple/i.test( e.attrs?.href || '' ) || /\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/.test( words( e ) );
const brandFor = ( e ) => {
	const href = e.attrs?.href || '';
	const label = `${ e.attrs?.[ 'aria-label' ] || '' } ${ e.attrs?.title || '' }`.toLowerCase();
	const hits = [];
	for ( const b of brands ) {
		const why = [];
		if ( brandOwnsAddress( b, href ) ) {
			why.push( `brand-registry: ${ b.slug } owns ${ href } (brandOwnsAddress)` );
		}
		for ( const ph of placeholders( e ) ) {
			if ( mapEntry( ph )?.key === b.siteInfoKey ) {
				why.push( `site-info-placeholder-map: ${ ph } -> ${ b.siteInfoKey }` );
			}
		}
		const lbl = b.label.toLowerCase().replace( /\s*\(.*\)$/, '' );
		if ( new RegExp( `\\b${ lbl.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }\\b` ).test( label ) ) {
			why.push( `brand-registry label "${ b.label }" in aria-label/title` );
		}
		if ( why.length ) {
			hits.push( { brand: b, why } );
		}
	}
	return hits.sort( ( a, b ) => b.why.length - a.why.length );
};

// ---------- scoring ----------
const W = { dbTag: 0.5, dbComposition: 0.35, dbCapability: 0.25, siteInfo: 0.3, precedent: 0.4, heuristic: 0.15 };
const share = ( t, slug ) => {
	const tot = Object.values( t.counts ).reduce( ( a, b ) => a + b, 0 );
	return tot ? ( t.counts[ slug ] || 0 ) / tot : 0;
};
const precEv = ( label, t, slug ) => ( t.counts[ slug ] ? { kind: 'precedent', w: W.precedent * share( t, slug ), text: `${ label }: ${ slug } ${ t.counts[ slug ] }/${ Object.values( t.counts ).reduce( ( a, b ) => a + b, 0 ) } (${ ( t.files[ slug ] || [] ).join( ', ' ) })` } : null );
const finish = ( cands ) => {
	const list = Object.values( cands ).map( ( c ) => ( { ...c, evidence: c.evidence.filter( Boolean ), score: +c.evidence.filter( Boolean ).reduce( ( a, ev ) => a + ev.w, 0 ).toFixed( 3 ) } ) ).filter( ( c ) => c.score > 0 ).sort( ( a, b ) => b.score - a.score );
	const [ top, second ] = list;
	const conf = top ? Math.min( 1, top.score ) * ( top.score / ( top.score + ( second?.score || 0 ) ) ) : 0;
	list.forEach( ( c ) => {
		c.share = +( c.score / list.reduce( ( a, x ) => a + x.score, 0 ) ).toFixed( 3 );
	} );
	return { candidates: list, confidence: +conf.toFixed( 2 ) };
};
const cand = ( map, block, extra = {} ) => ( map[ block ] = map[ block ] || { block, attributes: {}, evidence: [], ...extra } );

function classify( e ) {
	const bk = blockKids( e );
	const C = {};
	const t = words( e );
	const ph = placeholders( e );
	if ( bk.length ) {
		// A wrapper. When every child proposes the same block X, the pool is "parents of 2+ X children" and a row block
		// accepting exactly X (DB composition) competes with the wrapper shells; otherwise the pool is every wrapper.
		const childBlocks = bk.map( ( k ) => classify( k ).candidates[ 0 ]?.block );
		const same = bk.length > 1 && childBlocks.every( ( b ) => b && b === childBlocks[ 0 ] ) ? childBlocks[ 0 ] : null;
		const pool = same ? PREC.rowOf( same ) : PREC.wrapper;
		const poolLabel = same ? `precedent parents of 2+ ${ same } children` : 'precedent wrappers with children';
		for ( const row of ROW_BLOCKS.filter( ( r ) => same && r.accepts[ 0 ] === same ) ) {
			const c = cand( C, row.slug );
			c.evidence.push( { kind: 'db', w: W.dbComposition, text: `block_composition: ${ row.slug } is a content-block accepting ${ JSON.stringify( row.accepts ) }; all ${ bk.length } children propose ${ same }` } );
			const caps = capsOf( row.slug );
			const brandHits = bk.flatMap( ( k ) => brandFor( k ).slice( 0, 1 ).map( ( h ) => h.brand.slug ) ).filter( ( s ) => caps.includes( s ) );
			if ( brandHits.length ) {
				c.evidence.push( { kind: 'db', w: W.dbCapability, text: `block_capabilities: ${ row.slug } lists ${ brandHits.join( ', ' ) }` } );
			}
			c.evidence.push( precEv( poolLabel, pool, row.slug ) );
		}
		for ( const w of WRAPPER_BLOCKS ) {
			const c = cand( C, w );
			c.evidence.push( { kind: 'db', w: W.dbComposition, text: `block_composition: ${ w } is ${ COMPOSITION[ w ].composition_role }; element has ${ bk.length } block children` } );
			if ( capsOf( w ).includes( e.display ) ) {
				c.evidence.push( { kind: 'db', w: W.dbCapability, text: `block_capabilities: ${ w } lists "${ e.display }" (draft display)` } );
			} else if ( 'div' !== e.tag && ( enumOf( w, 'tagName' ) || [] ).includes( e.tag ) ) {
				c.evidence.push( { kind: 'db', w: W.dbCapability, text: `block_attributes: ${ w }.tagName enum has "${ e.tag }"` } );
			}
			c.evidence.push( precEv( poolLabel, pool, w ) );
		}
		return finish( C );
	}
	if ( 'a' === e.tag && ! t && kids( e ).some( ( k ) => 'svg' === k.tag ) ) {
		// An icon-only link.
		const iconBlocks = blocksWithCap( 'svg' ).filter( ( b ) => capsOf( b ).includes( 'icon' ) );
		const hits = brandFor( e );
		for ( const b of iconBlocks ) {
			const c = cand( C, b );
			c.evidence.push( { kind: 'db', w: W.dbCapability, text: `block_capabilities: ${ b } lists svg + icon; element is a link holding only an svg` } );
			if ( hits[ 0 ] && 'brand' === ( enumOf( b, 'iconSource' ) || [] ).find( ( v ) => 'brand' === v ) ) {
				c.brand = hits[ 0 ].brand;
				c.evidence.push( { kind: 'siteInfo', w: W.siteInfo * Math.min( 1, hits[ 0 ].why.length / 2 ), text: hits[ 0 ].why.join( '; ' ) } );
			}
			c.evidence.push( precEv( 'precedent brand icons', PREC.brandIcon, b ) );
		}
		if ( TAG_MAP.a ) {
			const c = cand( C, TAG_MAP.a.core_block_slug );
			c.evidence.push( { kind: 'db', w: W.dbTag * 0.5, text: `html_tag_to_core_block: a -> ${ TAG_MAP.a.core_block_slug } ("${ TAG_MAP.a.note }"), halved: no label words` } );
		}
		return finish( C );
	}
	// Site Info content: placeholders mapped to a key, or a detector hit.
	const keys = ph.map( ( p ) => [ p, mapEntry( p ) ] ).filter( ( [ , m ] ) => m );
	const kinds = new Set();
	keys.forEach( ( [ , m ] ) => m.key && DISPLAY_TYPES.includes( m.key ) && kinds.add( m.key ) );
	if ( looksCopyright( t ) && DISPLAY_TYPES.includes( 'copyright' ) ) {
		kinds.add( 'copyright' );
	}
	if ( looksHours( t ) && DISPLAY_TYPES.includes( 'hours' ) ) {
		kinds.add( 'hours' );
	}
	if ( looksAddress( e ) && DISPLAY_TYPES.includes( 'address' ) ) {
		kinds.add( 'address' );
	}
	for ( const kind of kinds ) {
		const ev = [];
		keys.filter( ( [ , m ] ) => m.key === kind ).forEach( ( [ p, m ] ) => ev.push( { kind: 'siteInfo', w: W.siteInfo, text: `site-info-placeholder-map: ${ p } -> ${ m.key } (as ${ m.as })` } ) );
		const nullMapped = keys.filter( ( [ , m ] ) => null === m.key ).map( ( [ p ] ) => p );
		const heur = { copyright: 'HEURISTIC copyright marker (business-info render.php regex)', hours: 'HEURISTIC hours pattern (ASSUMED)', address: 'HEURISTIC address pattern: maps link / postcode (ASSUMED)' }[ kind ];
		if ( heur && ! ev.length ) {
			ev.push( { kind: 'heuristic', w: W.heuristic, text: heur + ( nullMapped.length ? `; note ${ nullMapped.join( ', ' ) } is in the placeholder map with key null (not Site Info-bound)` : '' ) } );
		}
		const t1 = PREC.siteInfo( kind );
		const tIn = PREC.siteInfoInLinks( kind );
		for ( const b of blocksWithCap( kind ).filter( ( x ) => ( enumOf( x, 'displayType' ) || [] ).includes( kind ) ) ) {
			const c = cand( C, b, { siteInfoKind: kind } );
			c.evidence.push( { kind: 'db', w: W.dbCapability, text: `block_capabilities: ${ b } lists "${ kind }"; displayType enum has "${ kind }"` }, ...ev, precEv( `precedent ${ kind } nodes`, t1, b ), precEv( `precedent ${ kind } among link siblings`, tIn, b ) );
		}
		// The tag's own block, when it has a Site Info mode for this kind (sgs/button linkSource enum).
		const own = TAG_MAP[ e.tag ]?.core_block_slug;
		if ( own && ( enumOf( own, 'linkSource' ) || [] ).includes( kind ) ) {
			const c = cand( C, own, { siteInfoKind: kind, linkSource: kind } );
			c.evidence.push( { kind: 'db', w: W.dbTag, text: `html_tag_to_core_block: ${ e.tag } -> ${ own }; ${ own }.linkSource enum has "${ kind }"` }, ...ev, precEv( `precedent ${ kind } nodes`, t1, own ), precEv( `precedent ${ kind } among link siblings`, tIn, own ) );
		}
	}
	// Plain content by tag (unless the tag's block is already a Site Info candidate).
	const own = TAG_MAP[ e.tag ]?.core_block_slug;
	const sibs = kids( byKey[ e.parentKey ] ).filter( ( k ) => ! isPart( k ) );
	const isColumnLabel = 'a' !== e.tag && sibs[ 0 ] === e && sibs.length > 2 && sibs.slice( 1 ).filter( ( s ) => 'a' === s.tag ).length >= 2;
	const pool = 'a' === e.tag ? PREC.textLink : isColumnLabel ? PREC.columnLabel : PREC.textLeaf;
	const poolLabel = 'a' === e.tag ? 'precedent text links' : isColumnLabel ? 'precedent column labels (first text child before links)' : 'precedent text leaves';
	if ( own && ! C[ own ] ) {
		const c = cand( C, own );
		c.evidence.push( { kind: 'db', w: W.dbTag * ( kinds.size ? 0.5 : 1 ), text: `html_tag_to_core_block: ${ e.tag } -> ${ own } ("${ TAG_MAP[ e.tag ].note }")${ kinds.size ? ', halved: Site Info content' : '' }` }, precEv( poolLabel, pool, own ) );
	}
	if ( ! own && t ) {
		// A text leaf with no tag row (div/span): text blocks from precedent, sharpened by the column-label context.
		for ( const b of Object.keys( pool.counts ) ) {
			const c = cand( C, b );
			c.evidence.push( precEv( poolLabel, pool, b ) );
			if ( capsOf( b ).includes( 'text' ) ) {
				c.evidence.push( { kind: 'db', w: W.dbCapability * 0.5, text: `block_capabilities: ${ b } lists "text"` } );
			}
		}
	}
	return finish( C );
}

// ---------- build the skeleton ----------
const proposal = [];
let order = 0;
const contentAttrs = ( block, e, c ) => {
	const a = {};
	const textAttr = usedAttr( block, 'text-content' );
	const linkAttr = usedAttr( block, 'link-href' );
	const t = words( e );
	const handover = [];
	if ( 'sgs/container' === block ) {
		const tags = enumOf( block, 'tagName' ) || [];
		a.tagName = tags.includes( e.tag ) ? e.tag : 'div';
		const layouts = enumOf( block, 'layout' ) || [];
		const col = /flex-direction:\s*column/.test( ownStyle( e ) );
		const want = 'flex' === e.display && col ? 'stack' : e.display;
		if ( layouts.includes( want ) ) {
			a.layout = want;
		}
		return { a, handover };
	}
	if ( c.siteInfoKind && 'sgs/business-info' === block ) {
		a.displayType = c.siteInfoKind;
		if ( 'copyright' === c.siteInfoKind ) {
			a.copyrightPrefix = /^\s*copyright\b/i.test( t ) ? 'Copyright' : '';
		}
		handover.push( { owner: 'site-info', kind: 'text', detail: `Site Info "${ c.siteInfoKind }" must read: ${ textWithBreaks( e ) }` } );
		return { a, handover };
	}
	if ( c.brand ) {
		a.iconSource = 'brand';
		a.brandName = c.brand.slug;
		a.metadata = { bindings: { linkUrl: { source: 'sgs/site-info', args: { key: c.brand.siteInfoKey } } } };
		if ( e.attrs?.target ) {
			a.linkTarget = e.attrs.target;
		}
		return { a, handover };
	}
	if ( textAttr && t ) {
		a[ textAttr ] = /<br>/.test( textWithBreaks( e ) ) ? textWithBreaks( e ) : t;
	}
	if ( c.linkSource ) {
		a.linkSource = c.linkSource;
	}
	const href = e.attrs?.href;
	if ( linkAttr && href ) {
		if ( '#' === href ) {
			const onClick = /sc-camel-on-click="\{\{\s*([^}\s]+)\s*\}\}"/.exec( e.snippet )?.[ 1 ];
			handover.push( { owner: 'behaviour', kind: 'link', detail: `draft link is "#"${ onClick ? ` and navigates by script ${ onClick }` : '' }: destination not in the draft, url left empty` } );
		} else if ( ! c.linkSource ) {
			a[ linkAttr ] = href;
		}
		if ( e.attrs?.target && attr( block, 'linkTarget' ) ) {
			a.linkTarget = e.attrs.target;
		}
	}
	return { a, handover };
};

function build( e ) {
	const r = classify( e );
	const top = r.candidates[ 0 ];
	const block = top?.block || null;
	const node = { name: block, attributes: {}, draftRef: finder( e ) };
	const { a, handover } = contentAttrs( block, e, top || {} );
	node.attributes = a;
	if ( handover.length ) {
		node.handover = handover;
	}
	// Slots: each svg part maps to the block's calibration element key ending at the same tag.
	const slots = {};
	kids( e ).filter( ( k ) => isPart( k ) && ! neverShown( k ) ).forEach( ( k ) => {
		const key = slotKeyFor( block, k.tag );
		if ( key ) {
			slots[ key ] = `[data-dc-tpl="${ k.tpl }"]`;
		}
	} );
	if ( Object.keys( slots ).length ) {
		node.draftSlots = slots;
	}
	const row = ROW_BLOCKS.find( ( x ) => x.slug === block );
	const children = blockKids( e );
	const rec = {
		order: order++, key: e.key, tag: e.tag, depth: e.depth, words: words( e ), block, confidence: r.confidence, low: r.confidence < 0.7,
		candidates: r.candidates.map( ( c ) => ( { block: c.block, score: c.score, share: c.share, evidence: c.evidence.map( ( ev ) => ev.text ) } ) ),
		parts: kids( e ).filter( isPart ).map( ( k ) => k.key ), screenshots: e.screenshots, snippet: e.snippet, attributes: a, slots,
	};
	proposal.push( rec );
	if ( row ) {
		// A Site Info row: Fill generates the icons (fill-skeleton.mjs::expandSiteInfoRows); childRefs need a selector draftRef.
		const childRecs = children.map( ( k ) => ( { k, r: classify( k ) } ) );
		node.draftRef = selectorOf( e );
		node.siteInfoRow = childRecs.map( ( x ) => x.r.candidates[ 0 ].brand?.slug ).filter( Boolean );
		node.childRefs = Object.fromEntries( childRecs.filter( ( x ) => x.r.candidates[ 0 ].brand ).map( ( x ) => [ x.r.candidates[ 0 ].brand.slug, `[data-dc-tpl="${ x.k.tpl }"]` ] ) );
		const targets = [ ...new Set( childRecs.map( ( x ) => x.k.attrs?.target ).filter( Boolean ) ) ];
		if ( 1 === targets.length ) {
			node.childAttributes = { linkTarget: targets[ 0 ] };
		}
		rec.rowNote = `children generated by Fill from siteInfoRow ${ JSON.stringify( node.siteInfoRow ) }`;
		// Still record each child for the review table.
		children.forEach( ( k ) => build( k ) );
		node.innerBlocks = [];
		return node;
	}
	node.innerBlocks = children.map( build );
	return node;
}

const skeleton = [ build( footer ) ];
const problems = skeletonProblems( skeleton );
const lint = lintSkeleton( expandSiteInfoRows( skeleton ), db );
const expanded = cleanTree( expandSiteInfoRows( skeleton ) );
const count = ( list ) => list.reduce( ( a, n ) => a + 1 + count( n.innerBlocks || [] ), 0 );
const out = {
	generated: new Date().toISOString(),
	inventory: inv.generated,
	precedentTrees: treeFiles,
	weights: W,
	confidenceFormula: 'min(1, top.score) * top.score / (top.score + second.score); score = sum of evidence weights',
	counts: { inventoryElements: els.length, parts: els.filter( isPart ).length, proposedBlocks: proposal.length, skeletonNodes: count( skeleton ), expandedNodes: count( expanded ), low: proposal.filter( ( p ) => p.low ).length },
	skeletonProblems: problems,
	lintSkeleton: lint,
	proposal,
};
fs.writeFileSync( path.join( HERE, 'skeleton.json' ), JSON.stringify( skeleton, null, '\t' ) );
fs.writeFileSync( path.join( HERE, 'proposal.json' ), JSON.stringify( out, null, 1 ) );
console.log( JSON.stringify( out.counts ), 'problems', problems.length, 'lint', lint.length );
problems.concat( lint ).forEach( ( p ) => console.log( ' -', p ) );
for ( const p of proposal ) {
	console.log( `${ '  '.repeat( p.depth ) }${ p.key } ${ p.tag } -> ${ p.block } ${ p.confidence }${ p.low ? ' LOW' : '' } | ${ p.candidates.map( ( c ) => `${ c.block }:${ c.score }` ).join( ' ' ) } | ${ p.words.slice( 0, 40 ) }` );
}
