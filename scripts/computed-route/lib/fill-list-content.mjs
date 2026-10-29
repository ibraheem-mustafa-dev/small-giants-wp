// List content for Fill (Spec 48 FR-48-82, the item-array part): a block that holds a list (a timeline's entries, a
// process's steps, a slider's testimonials) gets the items the draft draws (lib/fill-list-items.mjs), never its default
// items. Where the block keeps its list comes from the framework DB, never a per-block table:
//   - an attribute: the block's one `array` setting whose role is `content` (block_attributes), each item's keys and
//     their types from the block.json item schema (`items.properties`), else from the setting's default first item;
//   - inner blocks: a block whose `block_composition.accepts_allowed_blocks` names one block, each item one such child
//     whose content settings (roles text-content, content and image-object, no css_property) take the item's fields.
// A draft field goes to the item key with the same name, else to the key of the same role, read from the words of both
// names (data/item-roles.json, read as ITEM_ROLES); a tie goes to the key sharing a word with the field. A picture goes through the media map
// (lib/fill-media.mjs: a draft file or a stock preview the map holds); a picture the draft chooses at run time, a field no
// key takes and a value the key's type cannot hold are named handover rows. A setting that already holds a value (the
// skeleton wrote the items) is kept, and skeleton children are filled only where they are the list's items, one per item.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAjv, schemaProblems } from './handoff.mjs';
import { setAttr } from './tree.mjs';
import { handoverEntry } from './fill-handover.mjs';
import { pictureEntry } from './fill-media.mjs';
import { normaliseHref } from './fill-presence.mjs';
import { templateKeyOf, parseTemplateKey } from './fact-key.mjs';
import { loadDraft } from './intake-ast.mjs';
import { listItems } from './fill-list-items.mjs';

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it).
export const COVERAGE_WRITES = [
	'block-setting:content:array',
];

// The roles an item key or draft field can play (data/item-roles.json, shape data/item-roles.schema.json): [[ role, words ]]
// in priority order. Throws on a file that breaks the schema or names one role twice.
export const ITEM_ROLES_FILE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'item-roles.json' );
export function loadItemRoles( file = ITEM_ROLES_FILE ) {
	const data = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const problems = schemaProblems( loadAjv(), file.replace( /\.json$/, '.schema.json' ), data );
	const names = data.roles?.map( ( r ) => r.role ) ?? [];
	names.filter( ( r, i ) => names.indexOf( r ) !== i ).forEach( ( r ) => problems.push( `/roles names "${ r }" twice` ) );
	if ( problems.length ) {
		throw new Error( `${ file } does not match item-roles.schema.json:\n${ problems.join( '\n' ) }` );
	}
	return data.roles.map( ( r ) => [ r.role, new Set( r.words ) ] );
}
export const ITEM_ROLES = loadItemRoles();

export const wordsOf = ( name ) => String( name ).split( '.' ).pop().replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).split( /[\s_-]+/ ).map( ( w ) => w.toLowerCase() ).filter( Boolean );
// Every role a name's words name, in priority order: a field may take each; a key's first is its primary role.
export const fieldRoles = ( name ) => ITEM_ROLES.filter( ( [ , words ] ) => wordsOf( name ).some( ( w ) => words.has( w ) ) ).map( ( [ r ] ) => r );
export const keyRole = ( name ) => fieldRoles( name )[ 0 ] ?? null;
// Whether a key plays `role` as a later role through the words that give it its primary one: a team member's `name` is an
// author and, by the same word, a title; an `orgName` is an organisation, and its `name` only says which of the
// organisation's words it holds, so it never takes a title.
const viaWords = ( name, role ) => wordsOf( name ).filter( ( w ) => ITEM_ROLES.find( ( [ r ] ) => r === role )?.[ 1 ].has( w ) );
export const laterRole = ( name, role ) => fieldRoles( name ).includes( role ) && viaWords( name, role ).every( ( w ) => viaWords( name, keyRole( name ) ).includes( w ) );

// Each draft field's item key: { map: { field: key }, unmatched: [field] }. fields: [{ name, image }]; keys: [{ key }].
// A field takes the key of its own name first. Then every field, for each role it plays in order, takes an open key whose
// primary role that is, so a setting takes the field named for it before any field takes it by a later role (a testimonial's
// `name` field is its reviewer's name even when a `title` field comes first). Only then does a field left over take a key
// that plays one of its roles as a later one through the words of its primary role (laterRole: a team member's `name`, primary
// role author, takes a draft `title` when the item has no title key; an `orgName` never does). Within either tier a tie goes to the key sharing a word with the field. primaryOnly stops before the later
// roles (lib/skeleton-part-content.mjs: a part is paired only where the field is that setting's content).
const GENERIC = [ 'title', 'description' ];
export function matchFields( fields, keys, { primaryOnly = false } = {} ) {
	const map = {};
	const used = new Set();
	const take = ( f, k ) => {
		map[ f.name ] = k.key;
		used.add( k.key );
	};
	for ( const f of fields ) {
		const k = keys.find( ( x ) => x.key === f.name && ! used.has( x.key ) );
		k && take( f, k );
	}
	const pick = ( f, open ) => open.find( ( k ) => wordsOf( k.key ).some( ( w ) => wordsOf( f.name ).includes( w ) ) ) ?? open[ 0 ];
	const tier = ( holds ) => {
		for ( const f of fields.filter( ( x ) => ! ( x.name in map ) ) ) {
			for ( const role of f.image ? [ 'image' ] : fieldRoles( f.name ) ) {
				const open = keys.filter( ( k ) => ! used.has( k.key ) && holds( k, role ) && ( ! primaryOnly || kin( k, f, role ) ) );
				if ( open.length ) {
					take( f, pick( f, open ) );
					break;
				}
			}
		}
	};
	// In primaryOnly a key's role is its head word's (the last word of a compound: a reviewLinkLabel is a label, not a review),
	// and a label or text role, which many settings share, holds only where field and key also share a word of their own (a
	// `saveLabel` is the `savingLabel`; a `ratingLabel` or a `name` is no `noImageLabel`).
	const head = ( name ) => fieldRoles( wordsOf( name ).at( -1 ) ?? '' )[ 0 ] ?? keyRole( name );
	const own = ( name ) => wordsOf( name ).filter( ( w ) => ! fieldRoles( w ).length ).map( ( w ) => w.slice( 0, 3 ) );
	const kin = ( k, f, role ) => ! GENERIC.includes( role ) || own( k.key ).some( ( w ) => own( f.name ).includes( w ) );
	tier( ( k, role ) => ( primaryOnly ? head( k.key ) : keyRole( k.key ) ) === role );
	primaryOnly || tier( ( k, role ) => laterRole( k.key, role ) );
	return { map, unmatched: fields.filter( ( f ) => ! ( f.name in map ) ).map( ( f ) => f.name ) };
}

// The picture slot of a list item that holds the unified media-slot shape (the shape lib/skeleton-write-content.mjs and
// sgs_render_media() read: a `url` string and an `id` number, with an optional `alt`) and has no key of its own for a picture
// (no key whose name plays the image role): { url, id, alt } key names, else null. A draft picture field is written into it
// through the media map, as an image-role key would be.
export function pictureSlot( keys ) {
	const has = ( name, types ) => keys.find( ( k ) => k.key === name && types.includes( k.type ) );
	if ( keys.some( ( k ) => 'image' === keyRole( k.key ) ) || ! has( 'url', [ 'string' ] ) || ! has( 'id', [ 'integer', 'number' ] ) ) {
		return null;
	}
	return { url: 'url', id: 'id', alt: has( 'alt', [ 'string' ] ) ? 'alt' : null };
}

const typeOf = ( v ) => ( Array.isArray( v ) ? 'array' : null === v ? null : 'number' === typeof v ? 'number' : typeof v );
const one = ( t ) => [].concat( t ?? [] )[ 0 ] ?? null;

// Where a block keeps its list: { kind: 'attr', attr, keys } or { kind: 'children', child, keys }, keys [{ key, type, html }];
// null when it keeps none. schemaOf( block ): the block.json attributes.
export function listTarget( db, block, schemaOf ) {
	const arrays = db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND attr_type = 'array' AND role = 'content' AND ( css_property IS NULL OR css_property = '' ) ORDER BY attr_name" ).all( block );
	if ( 1 === arrays.length ) {
		const attr = arrays[ 0 ].attr_name;
		const def = ( schemaOf( block ) || {} )[ attr ] || {};
		const props = def.items?.properties;
		const first = Array.isArray( def.default ) && def.default[ 0 ] && 'object' === typeof def.default[ 0 ] ? def.default[ 0 ] : {};
		const keys = props ? Object.entries( props ).map( ( [ key, p ] ) => ( { key, type: one( p.type ) } ) ) : Object.entries( first ).map( ( [ key, v ] ) => ( { key, type: typeOf( v ) } ) );
		return { kind: 'attr', attr, keys: keys.map( ( k ) => ( { ...k, html: /^<p>[\s\S]*<\/p>$/.test( String( first[ k.key ] ?? '' ) ) } ) ) };
	}
	const row = db.prepare( 'SELECT accepts_allowed_blocks FROM block_composition WHERE block_slug = ?' ).get( block );
	let allowed = [];
	try {
		allowed = JSON.parse( row?.accepts_allowed_blocks || '[]' );
	} catch {
		allowed = [];
	}
	if ( 1 !== allowed.length ) {
		return null;
	}
	const child = allowed[ 0 ];
	const keys = db.prepare( "SELECT attr_name, attr_type FROM block_attributes WHERE block_slug = ? AND role IN ( 'text-content', 'content', 'image-object' ) AND ( css_property IS NULL OR css_property = '' ) AND attr_type IN ( 'string', 'object', 'number', 'integer' ) ORDER BY rowid" ).all( child )
		.map( ( r ) => ( { key: r.attr_name, type: r.attr_type, html: false } ) );
	return keys.length ? { kind: 'children', child, keys } : null;
}

// The settings a list target takes the draft's items into, as [{ block, attr }]: the one array setting of the host block, or
// each content setting of the single child block the host allows. Fill's list pass writes exactly these (listDecisions takes
// `target.attr` and `target.keys`); lib/content-coverage.mjs asks here which settings a re-clone writes.
export function listClaims( block, target ) {
	if ( ! target ) {
		return [];
	}
	return 'attr' === target.kind ? [ { block, attr: target.attr } ] : target.keys.map( ( k ) => ( { block: target.child, attr: k.key } ) );
}

const escapeText = ( s ) => String( s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );

// The attachment a picture field's value names in the media map, or null: a draft file path or a stock preview address.
export const itemPicture = pictureEntry;

// One item's settings from the draft item: { attrs, rows } where rows are [{ field, value, reason }] the item cannot hold.
export function itemAttrs( item, { map, keys, media, pages = null, label, slot = null, pictureField = null, altField = null } ) {
	const attrs = {};
	const rows = [];
	// The draft's picture goes into the item's picture slot: the file the media map holds for it (url and attachment id), else
	// the item keeps an empty picture and its row says the picture is the client's to supply. The picture's description is the
	// draft's own alt text.
	if ( slot && pictureField ) {
		const v = item[ pictureField ];
		const hit = null === v || undefined === v ? null : itemPicture( v, media );
		if ( hit ) {
			Object.assign( attrs, { [ slot.url ]: hit.url, [ slot.id ]: hit.id } );
		} else {
			rows.push( { field: pictureField, value: v ?? '', picture: true, reason: `${ label }'s picture (${ pictureField }${ v ? ` "${ v }"` : '' }) is chosen by the draft at run time or is no uploaded file: choose it in the item's ${ slot.url } setting` } );
		}
		const alt = altField ? String( item[ altField ] ?? '' ).replace( /\s+/g, ' ' ).trim() : '';
		slot.alt && alt && ( attrs[ slot.alt ] = alt );
	}
	for ( const [ field, key ] of Object.entries( map ) ) {
		const k = keys.find( ( x ) => x.key === key );
		const v = item[ field ];
		if ( 'image' === keyRole( key ) || 'image' === keyRole( field ) ) {
			const hit = null === v || undefined === v ? null : itemPicture( v, media );
			if ( ! hit ) {
				rows.push( { field, value: v ?? '', reason: `${ label }'s picture (${ field }${ v ? ` "${ v }"` : '' }) is chosen by the draft at run time or is no uploaded file: choose it in the item's ${ key } setting` } );
			} else {
				attrs[ key ] = 'object' === k.type ? { id: hit.id, url: hit.url } : 'string' === k.type ? hit.url : hit.id;
			}
			continue;
		}
		if ( null === v || undefined === v || '' === v ) {
			continue;
		}
		if ( 'link' === keyRole( key ) ) {
			// A draft address as the site holds it (a hash route is its page's permalink); one that links nowhere is a row.
			const href = normaliseHref( v, media.origin, pages );
			null === href ? rows.push( { field, value: v, reason: `${ label }'s link "${ v }" goes to no page of the site (no page-map page for the route, or no address)` } ) : ( attrs[ key ] = href );
			continue;
		}
		if ( 'number' === k.type || 'integer' === k.type ) {
			Number.isFinite( Number( v ) ) ? ( attrs[ key ] = Number( v ) ) : rows.push( { field, value: v, reason: `${ label }'s ${ field } "${ v }" is not a number, and ${ key } holds a number` } );
		} else if ( 'string' === k.type || null === k.type ) {
			attrs[ key ] = k.html ? `<p>${ escapeText( v ) }</p>` : String( v );
		} else {
			rows.push( { field, value: v, reason: `${ label }'s ${ field } "${ v }" is words, and ${ key } holds ${ k.type }` } );
		}
	}
	return { attrs, rows };
}

// The list with each item's picture the draft draws: where the list has one picture field and the element draws exactly one
// picture per item (lib/fill-read-collect.mjs `pictures`, in document order), an item whose own value names no uploaded
// picture (an image placeholder the draft fills at run time) takes the picture drawn in its place.
export function withPictures( list, pictures, media = {} ) {
	const image = list.fields.filter( ( f ) => f.image || 'image' === keyRole( f.name ) );
	if ( 1 !== image.length || ! Array.isArray( pictures ) || pictures.length !== list.items.length ) {
		return list;
	}
	const [ f ] = image;
	return { ...list, items: list.items.map( ( it, i ) => ( itemPicture( it[ f.name ], media ) ? it : { ...it, [ f.name ]: pictures[ i ] } ) ) };
}

// The decisions for one list block. node: the tree node; list: lib/fill-list-items.mjs::listItems. Returns { writes:
// [{ attr, value }], children: [node] | null, childWrites: [{ position, attr, value }], rows: [{ field, value, reason }], notes }.
// A host whose skeleton children are all its item block, one per item, is the list already: each child takes only the
// item values it does not hold (its own draft element is read for the rest), and nothing is a row but a count that differs.
// A host holding any other child is not drawing this list.
export function listDecisions( { block, target, node, list, media = {}, pages = null } ) {
	const out = { writes: [], children: null, childWrites: [], rows: [], notes: [] };
	const kids = 'children' === target.kind ? node.innerBlocks || [] : [];
	if ( kids.some( ( k ) => k.name !== target.child ) ) {
		return out;
	}
	// An item that holds the media-slot shape takes the draft's first picture field into it; the other fields are matched to the rest of its keys.
	const slot = pictureSlot( target.keys );
	const pictures = slot ? list.fields.filter( ( f ) => f.image ) : [];
	const slotKeys = slot ? [ slot.url, slot.id, slot.alt ] : [];
	const matched = matchFields( slot ? list.fields.filter( ( f ) => ! pictures.includes( f ) ) : list.fields, target.keys.filter( ( k ) => ! slotKeys.includes( k.key ) ) );
	const { map } = matched;
	const unmatched = [ ...matched.unmatched, ...pictures.slice( 1 ).map( ( f ) => f.name ) ];
	const altField = list.fields.find( ( f ) => f.alt )?.name ?? null;
	const built = list.items.map( ( item, i ) => itemAttrs( item, { map, keys: target.keys, media, pages, label: `item ${ i + 1 }`, slot, pictureField: pictures[ 0 ]?.name ?? null, altField } ) );
	const fields = Object.entries( map ).map( ( [ f, k ] ) => `${ f } -> ${ k }` ).join( ', ' ) || 'none matched';
	if ( kids.length ) {
		if ( kids.length !== built.length ) {
			out.rows.push( { field: '(items)', value: String( built.length ), reason: `the draft draws ${ built.length } items and the skeleton holds ${ kids.length } ${ target.child } children, so the items are not placed` } );
			return out;
		}
		kids.forEach( ( k, position ) => {
			for ( const [ attr, value ] of Object.entries( built[ position ].attrs ) ) {
				const held = k.attributes?.[ attr ];
				undefined === held || null === held || '' === held ? out.childWrites.push( { position, attr, value } ) : JSON.stringify( held ) !== JSON.stringify( value ) && out.notes.push( `child ${ position + 1 } ${ attr } holds ${ JSON.stringify( held ) }; the draft's item has ${ JSON.stringify( value ) }` );
			}
		} );
		out.notes.push( `${ kids.length } skeleton children are the draft's ${ list.source }, fields ${ fields }` );
		return out;
	}
	const where = 'attr' === target.kind ? target.attr : `${ target.child } blocks`;
	for ( const f of unmatched.filter( ( name ) => list.items.some( ( it ) => null != it[ name ] && '' !== it[ name ] ) ) ) {
		out.rows.push( { field: f, value: list.items.map( ( it ) => it[ f ] ).filter( ( v ) => null != v ).join( ' | ' ), reason: `the draft's item field "${ f }" has no place in ${ block }'s ${ where } (no item key of its name or role)` } );
	}
	// A list is never dropped (Bean 2026-10-28, register ruling S7): items carrying a link are written as they are, and a
	// picture field the block's items hold no setting for is one row naming the pictures to choose. Items carrying nothing at
	// all would replace the block's items with empty ones: one row names the list, never a row per item.
	if ( ! built.some( ( b ) => Object.keys( b.attrs ).length ) ) {
		out.rows.push( { field: '(items)', value: String( built.length ), reason: `the draft's ${ built.length } items carry no words, link or uploaded picture ${ block } can show, so its ${ where } are not written` } );
		return out;
	}
	for ( const f of list.fields.filter( ( x ) => unmatched.includes( x.name ) && ( x.image || 'image' === keyRole( x.name ) ) ) ) {
		out.rows.push( { field: f.name, value: '', reason: `the draft draws a picture in each of its ${ built.length } items (${ f.name }: an image the draft fills at run time, or a placeholder) and ${ block }'s ${ where } hold no picture setting Fill can write: choose each picture in the editor` } );
	}
	// Items whose picture slot the draft names no uploaded file for share one row per field: the pictures are the client's to supply.
	const absent = built.flatMap( ( b ) => b.rows.filter( ( r ) => r.picture ) );
	built.forEach( ( b ) => out.rows.push( ...b.rows.filter( ( r ) => ! r.picture ) ) );
	for ( const field of new Set( absent.map( ( r ) => r.field ) ) ) {
		const rows = absent.filter( ( r ) => r.field === field );
		out.rows.push( 1 === rows.length ? rows[ 0 ] : { field, value: rows.map( ( r ) => r.value ).filter( Boolean ).join( ' | ' ), reason: `${ rows.length } of the draft's ${ built.length } items draw a picture (${ field }: an image the draft fills at run time, or a placeholder) with no uploaded file, so each keeps an empty picture in ${ block }'s ${ where }: the client supplies the pictures (choose each in the item's picture setting)` } );
	}
	out.notes.push( `${ list.items.length } items from the draft's ${ list.source }, fields ${ fields }` );
	if ( 'attr' === target.kind ) {
		out.writes.push( { attr: target.attr, value: built.map( ( b ) => b.attrs ) } );
	} else {
		out.children = built.map( ( b ) => ( { name: target.child, attributes: b.attrs, innerBlocks: [] } ) );
	}
	return out;
}

// The draft logic of one component, read once per run from the draft folder (null without a folder or a file).
export function logicReader( folder ) {
	const cache = new Map();
	return ( component ) => {
		if ( ! folder || ! component ) {
			return null;
		}
		if ( ! cache.has( component ) ) {
			const file = `${ component }.dc.html`;
			cache.set( component, fs.existsSync( path.join( folder, file ) ) ? loadDraft( folder, file ).idx : null );
		}
		return cache.get( component );
	};
}

// Fill's list pass over every node with a draft element. inventory: the surface's skeleton inventory (null when absent);
// idxFor( component ): logicReader's reader; picturesOf( targetId ): the pictures the draft read found in a target's element. Writes into the tree and returns { writes, children: [{ index, nodes }],
// unmapped, handover, notes }; the caller places `children` (applyChildren) once nothing else walks the tree.
export function listContentWrites( { nodes, flat, refOf, facts, inventory, idxFor = () => null, db, schemaOf, media = {}, pages = null, rootComponent = null, picturesOf = () => null } ) {
	const out = { writes: [], children: [], unmapped: [], handover: [], notes: [] };
	for ( const rec of nodes ) {
		const root = rec.targets.find( ( t ) => '' === t.slot && t.finder?.tpl );
		const target = root && listTarget( db, rec.name, schemaOf );
		if ( ! target ) {
			continue;
		}
		const node = flat[ rec.index ];
		const ref = refOf( node );
		if ( 'attr' === target.kind && undefined !== node.attributes?.[ target.attr ] ) {
			continue;
		}
		if ( ! facts ) {
			out.unmapped.push( { node: ref, block: rec.name, slot: '', property: target.attr ?? '(items)', value: '', reason: `${ rec.name } holds a list and there is no fact record (run intake), so the draft's items are not read` } );
			continue;
		}
		const list = listItems( { inventory, facts, rootKey: root.finder.tpl, rootComponent, idx: idxFor( parseTemplateKey( templateKeyOf( root.finder.tpl, rootComponent ) )?.dc ) } );
		list?.others?.length && out.unmapped.push( { node: ref, block: rec.name, slot: '', property: target.attr ?? '(items)', value: String( list.others.length ), reason: `the draft element draws ${ list.others.length + 1 } lists and ${ rec.name } holds one (${ list.source }); not written: ${ list.others.map( ( o ) => `sc-for ${ o.tpl } over ${ String( o.list ?? o.as ).replace( /^\{\{\s*|\s*\}\}$/g, '' ) }` ).join( '; ' ) }; a block that holds each list is a decision for the review` } );
		if ( ! list || ! list.items.length ) {
			// A host whose children the skeleton built from the draft's own elements holds its items already.
			if ( 'attr' === target.kind || list?.reason ) {
				out.unmapped.push( { node: ref, block: rec.name, slot: '', property: target.attr ?? '(items)', value: '', reason: list?.reason ?? `${ rec.name } holds its items in ${ target.attr }; the draft element draws no loop or current-item list${ inventory ? '' : ' (no skeleton inventory beside the skeleton)' }, so the block keeps its default items` } );
			}
			continue;
		}
		const d = listDecisions( { block: rec.name, target, node, list: withPictures( list, picturesOf( root.id ), media ), media, pages } );
		for ( const w of d.writes ) {
			const { before, after } = setAttr( node, { attr: w.attr, value: w.value, merge: 'replace' } );
			out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: '(content)', attr: w.attr, before, after, widths: [], how: 'content' } );
		}
		for ( const w of d.childWrites ) {
			const kid = node.innerBlocks[ w.position ];
			const { before, after } = setAttr( kid, { attr: w.attr, value: w.value, merge: 'replace' } );
			out.writes.push( { node: refOf( kid ) ?? ref, index: rec.index, block: kid.name, slot: '', prop: '(content)', attr: w.attr, before, after, widths: [], how: 'content' } );
		}
		if ( d.children ) {
			out.children.push( { index: rec.index, nodes: d.children } );
			out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: '(content)', attr: 'innerBlocks', before: [], after: d.children.map( ( c ) => ( { name: c.name, attributes: c.attributes } ) ), widths: [], how: 'content' } );
		}
		for ( const r of d.rows ) {
			out.handover.push( handoverEntry( { owner: 'content-page', kind: 'presence', node: ref, block: rec.name, slot: '', evidence: { key: r.field, draft: String( r.value ?? '' ), width: 1440 }, reason: r.reason } ) );
		}
		out.notes.push( ...d.notes.map( ( n ) => `${ ref } ${ rec.name }: ${ n }` ) );
	}
	return out;
}

// Places the children listContentWrites decided: each list host's inner blocks become its items.
export function applyChildren( flat, children ) {
	for ( const c of children ) {
		flat[ c.index ].innerBlocks = c.nodes;
	}
}
