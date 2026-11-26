// Openers and their frames in the skeleton (Spec 48 FR-48-95; skeleton-decisions.json `rules.surfaceOpener`). A draft control
// whose click handler makes the opening writes of a modal, choice flow or form row of the page map (the same reading as the
// page map's `opens`, lib/intake-pagemap-openers.mjs) is an `sgs/button` linking `#<the target row's slug>`, its words the
// button's label. The surface holding such a control gets the target's frame once: an `sgs/modal` whose anchor is that slug,
// with no trigger of its own, opened only by those links, inside a header or footer tree's last row (frameHome). A flow's
// frame holds the linked flow (`sgs/choice-flow` flowIsLinked, flowId); a modal's frame shows the saved `sgs_modal` post,
// which it names by post id (`modalRef`, the page map's id for the row, else a handover naming the post). A form target is a
// link to the form's own anchor and has no frame, and so has a product row's flow that the product link wires through the buy
// box (the buy box draws that flow's frame).
// The frame's look is the draft's own: the target surface's backdrop, panel and close control (frameParts) are read for the
// frame's backdrop, dialog and close settings (frameLook: each setting found by framework-DB query on `css_element`,
// `css_property` and the resting state, its value the draft's declared value). The skeleton carries no style value, so the
// look travels as a note on the surface's root row for Fill; a backdrop that closes the surface on click sets
// `closeOnOverlay`, and an opaque backdrop makes the frame full screen.
// Only the dialog's inner content is the modal post: modalPostTree drops the backdrop, unwraps the panel and drops the close
// control from the modal surface's own tree.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { loadDraft, readBinding, propName } from './intake-ast.mjs';
import { fnsNamed } from './intake-census-map.mjs';
import { openingWrites, openingComponents, opensTarget, fnWrites } from './intake-pagemap-flow-openers.mjs';
import { OPENABLE } from './intake-pagemap-openers.mjs';
import { colourHex } from './tokens.mjs';
import { rowRefusal } from './site-build-flow-scope.mjs';

const { slottedContainers } = createRequire( import.meta.url )( '../../lib/surface-tree-shape.js' );

const FALSY = new Set( [ 'false', 'null', '0', '""' ] );
// Words with their runs of white space made one space.
const squash = ( s ) => String( s || '' ).replace( /\s+/g, ' ' ).trim();

// The draft logic of a component, read once per folder and component.
const LOGIC = new Map();
function logicOf( folder, component ) {
	const key = `${ folder }|${ component }`;
	if ( ! LOGIC.has( key ) ) {
		const file = path.join( folder || '', `${ component }.dc.html` );
		LOGIC.set( key, folder && component && fs.existsSync( file ) ? loadDraft( folder, `${ component }.dc.html` ).idx : null );
	}
	return LOGIC.get( key );
}

// The literal setState writes a click handler makes (`openSizeGuide`, `it.addLens`, `{{ openLens }}`), through every function
// the logic gives that handler's last name.
export function controlWrites( { folder, component, handler } ) {
	const idx = logicOf( folder, component );
	let name = String( handler || '' );
	if ( /\{\{/.test( name ) ) {
		try {
			const expr = readBinding( name )?.expr;
			name = expr ? propName( expr ) || ( 'Identifier' === expr.type ? expr.name : '' ) : '';
		} catch {
			name = '';
		}
	}
	name = name.split( '.' ).pop();
	if ( ! idx || ! name ) {
		return new Set();
	}
	return new Set( [ 'member', 'local', 'key' ].flatMap( ( how ) => fnsNamed( { nodes: idx.all }, name, how ) ).flatMap( ( fn ) => [ ...fnWrites( idx, fn ) ] ) );
}

// The page map's openable targets with their opening writes: [{ kind, slug, recordId, writes, components, postId? }],
// `components` the components the opening calls run on (lib/intake-pagemap-flow-openers.mjs::openingComponents; null: any),
// `postId` the row's post id where the page map holds one (the ids of the site page-map.site names). pageMap: the page-map rows; folder:
// the handoff folder (its surfaces.json).
export function openerTargets( { pageMap = [], folder } ) {
	const file = folder ? path.join( folder, 'surfaces.json' ) : null;
	const records = new Map( ( file && fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).records : [] ).map( ( r ) => [ r.id, r ] ) );
	return pageMap.filter( ( r ) => OPENABLE[ r.postType ] && /^surfaces\.json /.test( r.draftId || '' ) ).map( ( r ) => {
		const recordId = r.draftId.replace( /^surfaces\.json /, '' );
		return { kind: OPENABLE[ r.postType ], slug: r.slug, recordId, writes: openingWrites( records.get( recordId ) ), components: openingComponents( records.get( recordId ) ), ...( Number.isInteger( r.id ) && r.id > 0 ? { postId: r.id } : {} ) };
	} ).filter( ( t ) => t.writes.length );
}

// The target a control opens, or null: the first target whose opening writes the control's writes all hold, made on a
// component the target's opening calls run on (lib/intake-pagemap-flow-openers.mjs::opensTarget; `component`: the control's
// own, null when unknown, so its untagged writes open no target whose calls run on a named component). A control on the
// target's own surface opens nothing.
export function openedBy( writes, targets, surfaceId = null, component = null ) {
	return targets.find( ( t ) => t.recordId !== surfaceId && opensTarget( writes, component, t ) ) ?? null;
}

// The button's settings: { [label]: words, [url]: '#<slug>' }. S: rules.surfaceOpener.
export const openerAttributes = ( target, words, S ) => ( { ...( words ? { [ S.button.label ]: words } : {} ), [ S.button.url ]: `#${ target.slug }` } );

// A template element's declared resting value of a property (the fact record's `style.static`), a border colour, width or
// style read from its top side when the shorthand is not declared; null when the draft declares none or a value that paints
// nothing.
function declared( t, prop ) {
	const list = t?.style?.static || [];
	const find = ( p ) => list.find( ( [ k ] ) => k === p )?.[ 1 ];
	const v = find( prop ) ?? ( /^border-(color|style|width)$/.test( prop ) ? find( prop.replace( 'border-', 'border-top-' ) ) : undefined );
	return null == v || /^(initial|inherit|unset|none|transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\))$/.test( String( v ).trim() ) ? null : String( v );
}

// The draft's frame for a modal or flow surface: { root, backdrop, panel, close } template keys of the fact record (null for a
// part the draft does not draw), and `closesOnBackdrop`. The root is the surface's root element; the backdrop is the root when
// it paints a background, else a child of it that fills it (absolute or fixed, inset 0) and holds no element; the panel is the
// root's child marked role dialog, else its other child holding the most elements; the close control is a button or link in
// the panel whose click handler writes a falsy value at every path the surface opens on.
export function frameParts( { factRecord, surfaceId, folder, opening = [] } ) {
	const rec = factRecord?.surfaces?.[ surfaceId ];
	const els = factRecord?.elements || {};
	const root = rec?.roots?.[ 0 ] ?? null;
	if ( ! root || ! els[ root ] ) {
		return { root: null, backdrop: null, panel: null, close: null, closesOnBackdrop: false };
	}
	const tpl = ( k ) => els[ k ]?.template;
	const kids = ( k ) => Object.values( els ).map( ( e ) => e.template ).filter( ( t ) => t?.parentChain?.[ 0 ] === k );
	const below = ( k ) => Object.values( els ).map( ( e ) => e.template ).filter( ( t ) => ( t?.parentChain || [] ).includes( k ) );
	const fills = ( t ) => /^(absolute|fixed)$/.test( declared( t, 'position' ) || '' ) && [ 'top', 'right', 'bottom', 'left' ].every( ( s ) => /^0(px)?$/.test( declared( t, s ) || '' ) );
	const children = kids( root );
	const backdrop = declared( tpl( root ), 'background-color' ) ? root : children.find( ( t ) => fills( t ) && ! kids( t.key ).length )?.key ?? null;
	const panel = children.find( ( t ) => 'dialog' === t.attrs?.role )?.key ?? children.filter( ( t ) => t.key !== backdrop ).sort( ( a, b ) => below( b.key ).length - below( a.key ).length )[ 0 ]?.key ?? null;
	const paths = opening.map( ( w ) => w.split( '=' )[ 0 ] );
	const closes = ( t ) => {
		const writes = [ ...controlWrites( { folder, component: rec.dc, handler: t?.attrs?.onClick } ) ];
		return paths.length && paths.every( ( p ) => writes.some( ( w ) => w.startsWith( `${ p }=` ) && FALSY.has( w.slice( p.length + 1 ) ) ) );
	};
	const close = panel ? below( panel ).filter( ( t ) => [ 'button', 'a' ].includes( t.tag ) && t.attrs?.onClick ).find( closes )?.key ?? null : null;
	const backdropTpl = backdrop ? tpl( backdrop ) : null;
	return { root, backdrop, panel, close, closesOnBackdrop: !! backdropTpl?.attrs?.onClick && closes( backdropTpl ) };
}

// The draft's look of a frame, part by part: [{ part, attr, property, value, element }] for each resting setting of the frame
// block on its backdrop, dialog and close parts whose property the draft declares on the matching element. S:
// rules.surfaceOpener; parts: frameParts' answer; settings( part ): the frame block's resting settings on that part, [{ attr,
// property, type }] (framework-DB query).
export function frameLook( { S, parts, factRecord, settings = () => [] } ) {
	const F = S.frame;
	const tpl = ( k ) => ( k ? factRecord?.elements?.[ k ]?.template : null );
	const out = [];
	for ( const [ part, key ] of [ [ F.parts.backdrop, parts.backdrop ], [ F.parts.dialog, parts.panel ], [ F.parts.close, parts.close ] ] ) {
		for ( const s of key ? settings( part ) : [] ) {
			// painted-props-exempt: `s` is a framework-database row ({ attr, property, type }), not a calibration entry
			const value = declared( tpl( key ), s.property );
			null !== value && out.push( { part, attr: s.attr, property: s.property, value, element: key } ); // painted-props-exempt: a framework-database row
		}
	}
	return out;
}

// Whether a declared colour paints with no transparency, in any notation the route's colour reader knows (hex, rgb(), hsl(),
// a named colour; lib/tokens.mjs::colourHex gives #RRGGBB for these and #RRGGBBAA below full alpha). A value it cannot
// resolve (var(), a gradient) is not taken for opaque.
const opaque = ( value ) => /^#[0-9A-F]{6}$/.test( colourHex( value ) ?? '' );

// The frame node for a target: { node, look, notes }. The skeleton carries no style value, so the node holds the frame's
// structure only: its anchor, no trigger, closing on a backdrop click when the draft's backdrop closes the surface, full screen
// when the draft's backdrop is opaque, and a flow's linked flow; `look` is the draft's look for Fill (frameLook). A modal's
// frame names its post by id (`modalRef`): the target row's post id where the page map holds one, else a handover row names
// the post. S: rules.surfaceOpener; flowBlock: rules.choiceFlow.block; parts: frameParts' answer; has( block, attr ).
export function frameNode( { target, S, flowBlock, parts, factRecord, settings = () => [], has = () => true } ) {
	const F = S.frame;
	const a = { [ F.anchor ]: target.slug, ...F.attributes };
	const look = frameLook( { S, parts, factRecord, settings } );
	parts.closesOnBackdrop && has( F.block, F.closeOnOverlay ) && ( a[ F.closeOnOverlay ] = true );
	const scrim = look.find( ( l ) => l.attr === F.scrim )?.value || '';
	opaque( scrim ) && Object.entries( F.fullscreen ).every( ( [ k ] ) => has( F.block, k ) ) && Object.assign( a, F.fullscreen );
	const flow = 'flow' === target.kind ? [ { name: flowBlock, attributes: { [ S.flow.linked ]: true, [ S.flow.id ]: target.slug }, innerBlocks: [] } ] : [];
	const node = { name: F.block, attributes: a, innerBlocks: flow };
	if ( 'modal' === target.kind && target.postId ) {
		a[ F.ref ] = target.postId;
	} else if ( 'modal' === target.kind ) {
		node.handover = [ { owner: 'behaviour', kind: 'link', detail: `${ F.block } ${ F.ref }: the id of the ${ target.slug } post (the frame names its post by id only)` } ];
	}
	const notes = look.length ? [ `the ${ target.slug } frame's draft look, for Fill to write: ${ look.map( ( l ) => `${ l.attr } ${ l.value } (${ l.part }, ${ l.element })` ).join( '; ' ) }` ] : [];
	return { node, look, notes };
}

// The modal surface's own tree with only the dialog's inner content: the nodes of the frame's root, backdrop and panel are
// replaced by their children and the close control's node is dropped. keyOf( node ): the fact-record template key a node
// copies (null for none).
export function modalPostTree( tree, parts, keyOf ) {
	const unwrap = new Set( [ parts.root, parts.backdrop, parts.panel ].filter( Boolean ) );
	const drop = new Set( [ parts.close ].filter( Boolean ) );
	const walk = ( list ) => list.flatMap( ( n ) => {
		const k = keyOf( n );
		if ( k && drop.has( k ) ) {
			return [];
		}
		const kids = walk( n.innerBlocks || [] );
		return k && unwrap.has( k ) ? kids : [ { ...n, innerBlocks: kids } ];
	} );
	return walk( tree );
}

// The row that holds a target's frame: the footer row, else the header row, listing the target in its `opens` (each renders on
// every page, so one frame serves every page's links); else every other row listing it holds its own. Returns a predicate on
// rows. S: rules.surfaceOpener (`frame.hosts`, the post types in order of preference).
export function frameHosts( pageMap, target, S ) {
	const listing = pageMap.filter( ( r ) => ( r.opens || [] ).some( ( o ) => o.slug === target.slug ) );
	const shared = ( S.frame.hosts || [] ).map( ( t ) => listing.find( ( r ) => r.postType === t ) ).find( Boolean );
	return ( row ) => ( shared ? row === shared : listing.includes( row ) );
}

// The list a frame is placed in: a tree that is one slotted container (a header or footer post's locked root, whose rows
// scripts/lib/surface-tree-shape.js::slottedContainers reads from the container's edit.js TEMPLATE) takes it in the row the
// template puts last, so the tree stays that one root (the build refuses any other footer or header tree); any other tree
// takes it beside its own blocks.
export function frameHome( tree ) {
	const slots = 1 === tree.length ? slottedContainers().get( tree[ 0 ]?.name )?.map( ( r ) => r.rowSlot ) : null;
	const rows = slots ? ( tree[ 0 ].innerBlocks || [] ).filter( ( b ) => slots.includes( b?.attributes?.rowSlot ) ) : [];
	const last = rows.sort( ( a, b ) => slots.indexOf( b.attributes.rowSlot ) - slots.indexOf( a.attributes.rowSlot ) )[ 0 ];
	return last ? ( last.innerBlocks ??= [] ) : tree;
}

// Places the frames of the targets a surface's opener buttons link to and keeps a modal surface's post to its dialog's inner
// content (the skeleton proposer's last pass). A row hosts the frame of each target frameHosts gives it, in frameHome. tree: the surface's
// skeleton (changed in place); targets: openerTargets; row: the surface's page-map row; pageMap; R: the skeleton rules;
// factRecord; folder; settings( part ); has( block, attr ); keyOf( node ). Returns { placed, notes }.
export function surfaceFrames( { tree, targets, row, pageMap = [], R, factRecord, folder, settings = () => [], has = () => true, keyOf = () => null } ) {
	const S = R.surfaceOpener;
	const out = { placed: [], notes: [] };
	if ( ! S ) {
		return out;
	}
	for ( const t of targets.filter( ( x ) => 'form' !== x.kind ) ) {
		if ( ! row || ! frameHosts( pageMap, t, S )( row ) ) {
			continue;
		}
		// A product row's flow that its product link wires (the row's flow link, opened by the draft's buy box,
		// lib/site-build-flow-scope.mjs::rowRefusal): the buy box draws that flow's own frame and its opener
		// (plugins/sgs-blocks/includes/buybox-linked-flow.php), so a frame here would render the flow a second time.
		if ( 'flow' === t.kind && row.opensFlow === t.slug && ! rowRefusal( row ) ) {
			out.notes.push( `no frame for the flow ${ t.slug }: the product link wires it through the buy box, which draws its frame` );
			continue;
		}
		const parts = frameParts( { factRecord, surfaceId: t.recordId, folder, opening: t.writes } );
		const made = frameNode( { target: t, S, flowBlock: R.choiceFlow?.block, parts, factRecord, settings, has } );
		frameHome( tree ).push( made.node );
		out.placed.push( t.slug );
		out.notes.push( ...made.notes );
	}
	// A modal row's own surface: only the dialog's inner content is its post.
	const own = row && 'modal' === OPENABLE[ row.postType ] ? targets.find( ( x ) => x.slug === row.slug ) : null;
	if ( own ) {
		const parts = frameParts( { factRecord, surfaceId: own.recordId, folder, opening: own.writes } );
		const kept = modalPostTree( tree, parts, keyOf );
		tree.splice( 0, tree.length, ...kept );
		out.notes.push( `the ${ own.slug } post holds only its dialog's inner content: its backdrop, panel and close control are the frame's (${ [ parts.backdrop, parts.panel, parts.close ].filter( Boolean ).join( ', ' ) })` );
	}
	return out;
}

// The frame block's resting settings on one of its parts, by framework-DB query: [{ attr, property, type }] for each setting
// whose `css_element` is the part, with no state, painting a plain value (never a gradient, a transition or a transform).
export const frameSettings = ( db, block ) => ( part ) => ( db ? db.prepare( "SELECT attr_name AS attr, css_property AS property, attr_type AS type FROM block_attributes WHERE block_slug = ? AND css_element = ? AND ( css_state IS NULL OR css_state = '' ) AND css_property NOT LIKE '%gradient%' AND css_property NOT LIKE 'transition%' AND css_property <> 'transform' AND css_property <> 'background-image' ORDER BY attr_name" ).all( block, part ) : [] );

// The page-map row a proposed surface is: the row naming its surfaces.json record, else the row of the record's route (a
// page surface), else the row whose slug is the surface's name; null when none is.
export function surfaceRow( { pageMap = [], surfaceId = null, surface = null, folder } ) {
	const file = folder ? path.join( folder, 'surfaces.json' ) : null;
	const record = surfaceId && file && fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).records.find( ( r ) => r.id === surfaceId ) : null;
	return pageMap.find( ( r ) => surfaceId && r.draftId === `surfaces.json ${ surfaceId }` ) ||
		( record?.route ? pageMap.find( ( r ) => ! r.draftId && r.route === record.route ) : null ) ||
		pageMap.find( ( r ) => r.slug === surface && ! r.draftId ) || null;
}

// The opener controls a surface's draft holds, read from the fact record: [{ key, words, slug }] for each button or link under
// the surface's roots whose click handler opens a target (never the target's own surface).
export function surfaceOpenerControls( { factRecord, surfaceId, targets, folder } ) {
	const rec = factRecord?.surfaces?.[ surfaceId ];
	const roots = new Set( rec?.roots || [] );
	return Object.values( factRecord?.elements || {} ).map( ( e ) => e.template ).filter( ( t ) => t && [ 'a', 'button' ].includes( t.tag ) && t.attrs?.onClick && ( roots.has( t.key ) || ( t.parentChain || [] ).some( ( k ) => roots.has( k ) ) ) )
		.map( ( t ) => ( { key: t.key, words: squash( t.words ), target: openedBy( controlWrites( { folder, component: t.component, handler: t.attrs.onClick } ), targets, surfaceId, t.component ) } ) )
		.filter( ( c ) => c.target && c.words ).map( ( c ) => ( { key: c.key, words: c.words, slug: c.target.slug } ) );
}

// A list block's items whose words are an opener control's take the target's anchor as their link (a footer's "Size guide"
// item): every node whose items array holds an item with that text and no link. item: the list block's item fields
// ({ text, url }, lib/skeleton-facts.mjs). Changes the tree in place; returns the texts linked.
export function openerListItems( tree, controls, item ) {
	const linked = [];
	if ( ! item?.text || ! item?.url || ! controls.length ) {
		return linked;
	}
	const walk = ( list ) => list.forEach( ( n ) => {
		for ( const it of Array.isArray( n.attributes?.items ) ? n.attributes.items : [] ) {
			const c = it && 'object' === typeof it && ! it[ item.url ] ? controls.find( ( x ) => x.words === squash( it[ item.text ] ) ) : null;
			if ( c ) {
				it[ item.url ] = `#${ c.slug }`;
				linked.push( c.words );
			}
		}
		walk( n.innerBlocks || [] );
	} );
	walk( tree );
	return linked;
}
