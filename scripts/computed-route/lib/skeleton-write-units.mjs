// The units of siblings that are ONE block and the nodes built from them (Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): a typed brand name is the logo block, icon-only Site Info links in a drawer's
// top row are one social icons group, and two or more stacked text links are one list. `unitsOf` finds the units among an
// element's children; `buildBrand`, `buildIcons` and `buildList` build each one's node and record its rows.
// The factory takes the writer's shared context (`ctx`) after the row book (lib/skeleton-write-record.mjs) is in `ctx.w`.
import { brandOwnsAddress } from './brand-registry.mjs';
import { linkWrite } from './draft-link.mjs';
import { isMarker } from './skeleton-rules.mjs';
import { finish, W } from './skeleton-classify.mjs';
import { itemSlots, drawnSvgParts } from './skeleton-part-slots.mjs';
import { markerPart, markerSlotAt, itemSlotAt, markerSettingsFrom, ordinal, glyph } from './fill-list-marker.mjs';
import { unitSlots } from './skeleton-child-slots.mjs';
import { paintsBox } from './skeleton-paint-conservation.mjs';

export const LOGO_HANDOVER = { owner: 'site-info', kind: 'presence', detail: 'the logo image: a logo block\'s image setting paints a measured size, so a skeleton cannot hold it; choose the site logo in the editor' };

export function makeUnits( ctx ) {
	const { m, facts, cls, R, view, overrides, base, finder, rootOf, w, siteLink } = ctx;
	const { record, absorbSubtree } = w;
	const { capsOf, enumOf } = facts;
	const minLinks = facts.decisions.structural?.linkList?.minLinks ?? 2;
	// ---- units: which siblings are one block ----
	const removedBy = ( e ) => cls.briefOnly( e ) || overrides( e, m.words( e ) )?.remove;
	const typedBrandRun = ( list, i ) => {
		if ( ! facts.siteName ) {
			return null;
		}
		for ( let len = 1; len <= 3 && i + len <= list.length; len++ ) {
			const run = list.slice( i, i + len );
			if ( run.every( ( k ) => m.words( k ) && 'img' !== k.tag && ! m.blockKids( k ).length ) && run.map( m.words ).join( ' ' ).toLowerCase() === facts.siteName.toLowerCase() ) {
				return run;
			}
		}
		return null;
	};
	// A list item link: words of its own, or one piece of text beside bare decorations only (a marker dot, a glyph), which
	// the list block draws as its marker. One such link alone is a pill button; two or more stacked are a list. A link that
	// paints its own box (a background, a border: a pill) is a button wherever it stands, never a list item (two
	// stacked call-to-action pills are two buttons, not one link list).
	const listLink = ( e ) => ! ( 'a' === e.tag && view?.ownPaint?.( e ) ) && listItemLike( e );
	const listItemLike = ( e ) => m.isTextLink( e ) || ( 'a' === e.tag && !! String( e.allText ?? '' ).trim() && m.blockKids( e ).every( ( k ) => ! m.blockKids( k ).length ) && m.blockKids( e ).filter( ( k ) => m.words( k ) ).length <= 1 ) || markerRow( e );
	// A bullet row that is not a link: a marker (rules.dotMarker) beside one piece of text and nothing else.
	const markerRow = ( e ) => {
		const kids = m.blockKids( e );
		const marker = ( k ) => isMarker( k, m, R.dotMarker, view );
		return 'a' !== e.tag && ! m.words( e ) && kids.some( marker ) && 1 === kids.filter( ( k ) => ! marker( k ) ).length && kids.every( ( k ) => marker( k ) || ( m.words( k ) && ! m.blockKids( k ).length ) );
	};
	// A run of list links: stacked one above the next, or every child of a grid (a list laid out in columns).
	const linkRun = ( list, i, parent = null ) => {
		const span = [];
		for ( let j = i; j < list.length && ( listLink( list[ j ] ) || removedBy( list[ j ] ) ); j++ ) {
			span.push( list[ j ] );
		}
		while ( span.length && removedBy( span[ span.length - 1 ] ) ) {
			span.pop();
		}
		const links = span.filter( ( k ) => ! removedBy( k ) );
		const gridList = 'grid' === parent?.display && span.length === list.length;
		return links.length >= minLinks && ( m.stacked( links ) || gridList ) && ! removedBy( span[ 0 ] ) ? span : [];
	};
	// ---- rows of text that are one list: each row one piece of text with at most one leading marker ----
	const under = ( x, top ) => {
		for ( let p = x; p; p = m.byKey[ p.parentKey ] ) {
			if ( p === top ) {
				return true;
			}
		}
		return false;
	};
	// One row of a list: no control anywhere in it, and one piece of text (its own words, else its one text child) beside at
	// most one leading marker; a row with no marker is an item only inside the author's own list (`ul`, `ol`).
	const textItem = ( row, parent ) => {
		if ( isControlEl( row ) || m.els.some( ( x ) => x !== row && under( x, row ) && isControlEl( x ) ) ) {
			return null;
		}
		const marker = leadingMarker( row );
		const rest = m.blockKids( row ).filter( ( k ) => k !== marker?.el );
		let text = squash( m.words( row ) );
		if ( text && rest.length ) {
			return null;
		}
		if ( ! text ) {
			if ( 1 !== rest.length || m.blockKids( rest[ 0 ] ).some( ( k ) => squash( m.words( k ) ) ) ) {
				return null;
			}
			text = squash( m.words( rest[ 0 ] ) );
		}
		if ( ! text || ( ! marker && ! [ 'ul', 'ol' ].includes( parent?.tag ) ) ) {
			return null;
		}
		return { row, text, marker };
	};
	// A run of two or more such rows, stacked or laid out in a grid, whose markers are all of one kind (typed ordinals
	// counting up from 1, as a list numbers itself).
	const itemRun = ( list, i, parent = null ) => {
		const run = [];
		for ( let j = i; j < list.length; j++ ) {
			const it = textItem( list[ j ], parent );
			if ( ! it ) {
				break;
			}
			run.push( it );
		}
		const kinds = new Set( run.map( ( it ) => it.marker?.kind ?? 'none' ) );
		const counts = run.every( ( it, j ) => 'numbered' !== it.marker?.kind || [].concat( it.marker.ordinal.n ).includes( j + 1 ) );
		const laid = m.stacked( run.map( ( it ) => it.row ) ) || 'grid' === parent?.display || [ 'ul', 'ol' ].includes( parent?.tag );
		return run.length >= 2 && 1 === kinds.size && counts && laid ? run : [];
	};
	// A run of accordion items (rule accordion) whose parent holds other content too: one accordion with no draft element of
	// its own holds them, beside the parent's other children.
	const accordionRun = ( list, i ) => {
		const at = ( k ) => cls.widgets?.()?.of( k );
		const first = at( list[ i ] );
		if ( 'accordionItem' !== first?.rule || first.model.host ) {
			return [];
		}
		let j = i;
		while ( j < list.length && at( list[ j ] )?.model === first.model && 'accordionItem' === at( list[ j ] ).rule ) {
			j++;
		}
		return list.slice( i, j );
	};
	// A short plain text leaf (no control, glyph or number) that heads a run of links where the surface is one of
	// rules.listHeading.surfaces: { el, text, level }, or null. `level` is the heading tag's level the list block holds, the
	// block's fallback level for any other tag.
	const headsList = ( h ) => {
		const L = R.listHeading;
		const text = squash( m.words( h ) );
		if ( ! L || ! ( L.surfaces || [] ).includes( ctx.surfaceKind ) || ! text || m.blockKids( h ).length || isControlEl( h ) || ! shownEl( h ) || removedBy( h ) || /^\d+$/.test( text ) || text.split( ' ' ).length > L.maxWords || m.kids( h ).some( ( k ) => 'svg' === k.tag ) ) {
			return null;
		}
		const tag = /^h([1-6])$/.exec( h.tag );
		const levels = enumOf( facts.listSlug, L.settings.level ) || [];
		const level = tag && levels.includes( `h${ Math.max( 2, Number( tag[ 1 ] ) ) }` ) ? `h${ Math.max( 2, Number( tag[ 1 ] ) ) }` : L.fallbackLevel;
		return { el: h, text, level };
	};
	const unitsOf = ( e, list = m.blockKids( e ) ) => {
		const out = [];
		for ( let i = 0; i < list.length; ) {
			const acc = accordionRun( list, i );
			if ( acc.length ) {
				out.push( { type: 'accordion', els: acc } );
				i += acc.length;
				continue;
			}
			const brand = typedBrandRun( list, i );
			const icons = brand ? [] : cls.iconRun( list, i, e );
			const run = brand || icons.length ? [] : linkRun( list, i, e );
			const rows = brand || icons.length ? [] : itemRun( list, i, e );
			// The first piece of text of a footer column, directly above a run of links, is the list's own heading (rules.listHeading).
			const head = ! brand && ! icons.length && ! run.length && ! rows.length && 0 === i ? headsList( list[ i ] ) : null;
			const under = head ? linkRun( list, i + 1, e ) : [];
			if ( under.length ) {
				out.push( { type: 'list', els: under, heading: head } );
				i += 1 + under.length;
			} else if ( brand ) {
				out.push( { type: 'brand', els: brand } );
				i += brand.length;
			} else if ( icons.length ) {
				out.push( { type: 'icons', els: icons, parent: e } );
				i += icons.length;
			} else if ( run.length ) {
				out.push( { type: 'list', els: run } );
				i += run.length;
			} else if ( rows.length ) {
				out.push( { type: 'list', els: rows.map( ( it ) => it.row ), rows } );
				i += rows.length;
			} else {
				out.push( { type: 'single', els: [ list[ i ] ] } );
				i++;
			}
		}
		return out;
	};

	function buildBrand( els ) {
		const [ first, ...rest ] = els;
		const r = cls.classify( first, null, { typedBrand: true } );
		const node = base( first, r.candidates[ 0 ].block, {} );
		node.handover = [ LOGO_HANDOVER ];
		record( first, r, { unit: 'brand', note: `typed brand name "${ els.map( m.words ).join( ' ' ) }" is the logo block` } );
		rest.forEach( ( e ) => record( e, { action: 'absorbed', reason: `part of the typed brand name; the logo block carries it`, confidence: r.confidence, candidates: [] }, { into: first.key } ) );
		return node;
	}

	// A run of icon-only Site Info links in a drawer's top row (rule drawerIconRun): one social icons group on the first link,
	// the others absorbed into it. Fill generates the group's icons from the Site Info row; the icons are resolved inside the
	// links' parent in the root's own template, and the group is the drawer's `icons` top-row slot (chromeSlotType icons).
	function buildIcons( els, parent ) {
		const D = R.drawerIconRun;
		const [ first, ...rest ] = els;
		const slugs = els.map( ( l ) => cls.siteInfoBrand( l ).slug );
		const node = base( first, D.block, {} );
		node.siteInfoRow = slugs;
		const root = rootOf( parent );
		if ( parent.template === root.template && els.every( ( l ) => l.template === root.template ) ) {
			const sel = ( x ) => `[data-dc-tpl="${ x.tpl }"]`;
			node.draftRef = `${ root.tag }${ sel( root ) } ${ sel( parent ) }`;
			node.childRefs = Object.fromEntries( els.map( ( l, i ) => [ slugs[ i ], sel( l ) ] ) );
		}
		const targets = [ ...new Set( els.map( ( l ) => l.attrs?.target ).filter( Boolean ) ) ];
		1 === targets.length && ( node.childAttributes = { linkTarget: targets[ 0 ] } );
		node.handover = [ { owner: 'site-info', kind: 'presence', detail: D.handover } ];
		const why = { rule: 'drawerIconRun', source: 'rule drawerIconRun', reason: D.reason, confidence: 1 };
		const hit = { block: D.block, score: 1, share: 1, evidence: [ { text: `rule drawerIconRun: ${ D.reason }` } ] };
		record( first, { ...why, candidates: [ hit ] }, { unit: 'icons', slot: D.slot, rowNote: `icons generated by Fill from siteInfoRow ${ JSON.stringify( slugs ) }; ${ D.slot.attribute } ${ D.slot.value } on ${ D.slot.block }` } );
		rest.forEach( ( l ) => record( l, { ...why, action: 'absorbed', into: first.key, reason: `part of the drawer's top-row icon group: ${ D.block } draws it from Site Info`, candidates: [] } ) );
		return node;
	}

	const kindOfLink = ( l ) => {
		const kinds = [ ...cls.siteInfoKinds( l ) ].filter( ( [ k ] ) => facts.listItem.kinds.includes( k ) ).sort( ( a, b ) => b[ 1 ].w - a[ 1 ].w );
		return kinds[ 0 ]?.[ 0 ] || null;
	};
	const shownEl = ( k ) => Object.values( k.visible || {} ).some( Boolean );
	const isControlEl = ( k ) => [ 'a', 'button', 'input', 'select', 'textarea', 'label', 'form' ].includes( k.tag ) || /sc-camel-on-click="\{\{/.test( k.snippet || '' );
	const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
	// The row's leading marker, or null: an svg or icon, an empty dot or bar (rules.dotMarker), or a typed glyph, emoji or
	// ordinal (`1`, `01`, `1.`, `(1)`, `i.`, `a)`) standing before the row's text. `kind` is the list marker type it draws.
	const leadingMarker = ( row ) => {
		const first = m.kids( row ).filter( shownEl )[ 0 ];
		if ( ! first ) {
			return null;
		}
		if ( 'svg' === first.tag || ( 'img' === first.tag && m.isPart( first ) ) ) {
			return { el: first, kind: 'icon', words: '' };
		}
		if ( isMarker( first, m, R.dotMarker, view ) ) {
			return { el: first, kind: 'bullet', words: '' };
		}
		const w = squash( m.words( first ) );
		if ( ! w || m.blockKids( first ).length || isControlEl( first ) ) {
			return null;
		}
		const o = ordinal( w );
		if ( o ) {
			return { el: first, kind: 'numbered', words: w, ordinal: o };
		}
		const g = [ ...new Intl.Segmenter( undefined, { granularity: 'grapheme' } ).segment( w ) ];
		return 1 === g.length && ! /[\p{L}\p{N}]/u.test( w ) ? { el: first, kind: glyph( w ).kind, words: w } : null;
	};
	// The marker element a list row draws before its text: its first drawn svg, else its leading dot, bar, ordinal or glyph.
	const markerElOf = ( row ) => ( drawnSvgParts( m.kids( row ), m.isPart )[ 0 ] ?? leadingMarker( row )?.el ?? null );
	// { <marker part slot of item copy k>: finder } for the rows that draw a marker element, and { <item part slot of copy k>:
	// finder } for a list-item row with none (its CSS draws the marker: lib/fill-list-marker.mjs::drawnByCss) and for a row of
	// text beside its marker that paints a box of its own (a padded or ruled row: rowLooks), when the block's calibration holds a
	// marker part. A link row is the link part's, never the item's; a row's marker-and-text layout is the list block's own.
	const rowLooks = ( row ) => Object.keys( paintsBox( row, { declared: view?.declared?.( row ) ?? {}, parent: m.byKey[ row.parentKey ] ?? null, children: m.kids( row ).length } ) );
	const markerSlotsOf = ( slug, rows ) => {
		const part = markerPart( ctx.calSettings?.( slug ) );
		const out = {};
		part && rows.forEach( ( row, i ) => {
			const el = markerElOf( row );
			const item = itemSlotAt( part, i + 1 );
			el && ( out[ markerSlotAt( part, i + 1 ) ] = finder( el ) );
			item && ( el ? 'a' !== row.tag && rowLooks( row ).some( ( l ) => 'layout' !== l ) : 'li' === row.tag || 'list-item' === row.display ) && ( out[ item ] = finder( row ) );
		} );
		return out;
	};
	// The list's marker settings from the framework DB's enums (lib/fill-list-marker.mjs::markerSettingsFrom: the enum holding
	// the marker kinds, the one holding `decimal`): the kind the rows' markers draw, `none` with no marker, and for typed
	// ordinals the number style that prints them; a value the enum lacks is left to the block's default.
	function markerAttrs( slug, rows ) {
		const S = markerSettingsFrom( facts.q( "SELECT attr_name, enum_values, default_value FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' ) AND css_property IS NULL AND enum_values IS NOT NULL", slug ) );
		const marker = rows?.[ 0 ]?.marker ?? null;
		const kind = marker?.kind ?? 'none';
		const out = {};
		S.marker?.values.includes( kind ) && ( out[ S.marker.attr_name ] = kind );
		const formats = 'numbered' === kind ? marker.ordinal.formats.filter( ( f ) => rows.every( ( it ) => it.marker.ordinal.formats.includes( f ) ) ) : [];
		const format = formats.find( ( f ) => S.number?.values.includes( f ) );
		format && ( out[ S.number.attr_name ] = format );
		return out;
	}
	// host: the bare wrapper the list block is (rule listWrapper), whose own box (its grid columns, its gaps) the list's own
	// settings read; the first link stays the draft element of the link part's settings. Without a host the first link is both.
	function buildList( els, host = null, rows = null, heading = null ) {
		const slug = facts.listSlug;
		const li = facts.listItem;
		const handover = [];
		const rowOf = new Map( ( rows || [] ).map( ( it ) => [ it.row, it ] ) );
		const items = els.filter( ( l ) => ! removedBy( l ) ).map( ( l ) => {
			// A row of text (not a link): its one piece of text, the marker the list draws for it left out.
			const it = rowOf.get( l );
			if ( it ) {
				return { [ li.text ]: it.text };
			}
			const kind = kindOfLink( l );
			const href = l.attrs?.href || '';
			const real = href && '#' !== href;
			if ( kind ) {
				const owner = facts.brands.find( ( b ) => b.slug === kind );
				return { [ li.text ]: '', [ li.siteInfoSource ]: kind, ...( real && li.siteInfoLink && ! ( owner && brandOwnsAddress( owner, href ) ) ? { [ li.siteInfoLink ]: true } : {} ) };
			}
			// The draft's destination as a site address (lib/draft-link.mjs): a draft route is never written as it stands.
			const r = siteLink( href, l );
			const out = linkWrite( r, href );
			if ( 'none' === r.kind && 'a' === l.tag ) {
				handover.push( { owner: 'behaviour', kind: 'link', detail: `draft link "${ m.words( l ) }" is "#": its destination is not in the draft, url left empty` } );
			}
			out.handover && handover.push( out.handover );
			return { [ li.text ]: m.words( l ) || String( l.allText ?? '' ).replace( /\s+/g, ' ' ).trim(), ...( null !== out.value ? { [ li.url ]: out.value } : {} ) };
		} );
		const C = {};
		const ev = ( b, kind, w, text ) => ( C[ b ] ||= { block: b, evidence: [] } ).evidence.push( { kind, w, text } );
		ev( slug, 'db', W.tag, `html_tag_to_core_block: ul -> ${ slug }: the database block for a list` );
		capsOf( slug ).includes( 'list' ) && ev( slug, 'capability', W.capability, `block_capabilities: ${ slug } lists "list"` );
		ev( slug, 'structure', W.structure, rows ? `${ items.length } rows of one piece of text each${ rows[ 0 ].marker ? `, each after a ${ rows[ 0 ].marker.kind } marker` : '' }, one list` : `${ items.length } bare text links, one above the next` );
		const own = facts.tagMap.a?.core_block_slug;
		own && ev( own, 'db', W.tag, `html_tag_to_core_block: a -> ${ own } (each link on its own)` );
		const r = finish( C );
		const first = els.find( ( l ) => ! removedBy( l ) );
		const node = base( host ?? first, slug, { ...( rows ? markerAttrs( slug, rows ) : ( enumOf( slug, 'markerType' ) || [] ).includes( 'none' ) ? { markerType: 'none' } : {} ), items } );
		handover.length && ( node.handover = handover );
		// The heading above the links is the list's own heading: its words and level are settings of the list, and the heading
		// element is absorbed into the list, whose heading part Fill reads its look at (lib/skeleton-part-pairing.mjs).
		if ( heading ) {
			const L = R.listHeading;
			Object.assign( node.attributes, { [ L.settings.text ]: heading.text, [ L.settings.level ]: heading.level } );
			const row = record( heading.el, { action: 'absorbed', rule: 'listHeading', source: 'rule listHeading', reason: `${ L.reason }; the list ${ node.draftRef?.tpl ?? first?.key } holds it as its heading`, confidence: 1, candidates: [], into: ( host ?? first ).key } );
			// The absorbed heading is the draft element of the list's heading part: it joins the pending part pairings, so Fill reads
			// the heading's font, size, colour and spacing at the part's calibrated slots (lib/skeleton-propose.mjs, partPending).
			if ( L.part && node.draftRef ) {
				row.pairedPart = L.part;
				ctx.partPending.push( { e: heading.el, into: ( host ?? first ).key, part: L.part } );
			}
			absorbSubtree( heading.el, { block: slug, key: ( host ?? first ).key }, 'the heading of the list', 'listHeading' );
		}
		// The node's draft element is its first link, which is also the block's link part: the settings calibrated on that part
		// are read at the same link (decisions structural.linkList.itemSlots, lib/skeleton-part-slots.mjs::itemSlots).
		// A setting in `itemSlotsUniform` ({ setting: [ the declared properties it holds ] }) is read at the first link only when every
		// link of the run declares the same value of those properties and one is not zero: one link read for all is true only then, and
		// a run of links padded differently, or only sideways, leaves the setting unread (a gap row, never a wrong value).
		const LL = facts.decisions.structural?.linkList;
		const uniform = Object.entries( LL?.itemSlotsUniform || {} ).filter( ( [ , props ] ) => {
			const at = ( l, w ) => props.map( ( p ) => String( l.resolved?.[ w ]?.[ p ] ?? ( l.resolved ? '0px' : view?.declared?.( l )?.[ p ] ?? '0' ) ).trim() );
			const widths = [ ...new Set( els.flatMap( ( l ) => Object.keys( l.resolved || { 1440: 1 } ) ) ) ];
			return widths.every( ( w ) => els.every( ( l ) => at( l, w ).join() === at( els[ 0 ], w ).join() ) ) && widths.some( ( w ) => at( els[ 0 ], w ).some( ( v ) => ! /^0(?:px|%|r?em)?$/.test( v ) ) );
		} ).map( ( [ setting ] ) => setting );
		const linkSlots = 'a' === first?.tag && node.draftRef && ctx.calSettings ? itemSlots( { finder: finder( first ), settings: [ ...( LL?.itemSlots || [] ), ...uniform ], calibrated: ctx.calSettings( slug ) } ).slots : {};
		Object.keys( linkSlots ).length && ( node.draftSlots = { ...node.draftSlots, ...linkSlots } );
		// Each item's own marker is read at the draft element that draws it, at that copy's marker part (lib/fill-list-marker.mjs).
		const markers = markerSlotsOf( slug, els.filter( ( l ) => ! removedBy( l ) ) );
		Object.keys( markers ).length && node.draftRef && ( node.draftSlots = { ...node.draftSlots, ...markers } );
		els.forEach( ( l, i ) => {
			if ( removedBy( l ) ) {
				const o = overrides( l, m.words( l ) );
				const b = cls.briefOnly( l );
				return record( l, { action: 'remove', reason: b ? `brief-only line (${ b.id }): ${ b.reason }` : o.reason || o.source, source: b ? `decisions ${ b.id }` : o.source, confidence: 0.9, candidates: [] } );
			}
			const at = items[ els.filter( ( x, j ) => j < i && ! removedBy( x ) ).length ];
			// The list block lays each item's marker and text out itself: a row that lays them out records the list's node
			// (lib/skeleton-paint-conservation.mjs host-layout).
			const lays = node.draftRef?.tpl && rowLooks( l ).includes( 'layout' ) ? { conserve: [ { kind: 'host-layout', node: node.draftRef.tpl, looks: [ 'layout' ] } ] } : {};
			const row = record( l, { ...( i === els.findIndex( ( x ) => ! removedBy( x ) ) ? r : { ...r, candidates: r.candidates.slice( 0, 1 ) } ), ...lays }, { unit: 'list', item: at, ...( at[ li.siteInfoSource ] ? { siteInfoKind: at[ li.siteInfoSource ] } : {} ) } );
			absorbSubtree( l, { block: slug, key: l.key }, 'the list item\'s marker', 'drawsChildren' );
			return row;
		} );
		return node;
	}
	// The accordion a run of items makes when their parent holds other content (accordionRun): a node with no draft element
	// of its own, each item built as its own element. Its settings are the rule's (several open, the open item, the category
	// lines, the toggle icon: skeleton-rules.mjs::accordionRun). Its look is read from the box the items sit in, which is
	// its draft element, and from the items' parts at the calibrated children's paths (lib/skeleton-child-slots.mjs::unitSlots),
	// as an accordion with a wrapper of its own reads them. A parent that paints or pads itself is the container's own look
	// and is never read twice, so such an accordion keeps the settings and no draft element; a parent that is a bare box is the
	// accordion's, and the container made from it reads nothing of it.
	const bareBox = ( e ) => ! view?.ownPaint?.( e ) && [ 'top', 'right', 'bottom', 'left' ].every( ( side ) => /^(?:|0|0px|0%|0r?em|auto|initial|inherit|unset|normal|none)$/.test( String( view?.declared?.( e )?.[ `padding-${ side }` ] ?? '' ).trim() ) );
	function buildAccordion( els ) {
		const D = R.accordion;
		const md = cls.widgets().of( els[ 0 ] ).model;
		const run = cls.accordionRun( md );
		const boxed = bareBox( md.parent );
		const node = boxed ? base( md.parent, D.block, run.attributes ) : { name: D.block, attributes: run.attributes };
		// The accordion owns the box its items sit in (its settings hold that box's width, margins, padding and gap, which the
		// container made from the same parent would write a second time): the container stands for the parent's other content and
		// reads nothing of the box (one draft element is read by one block, lib/skeleton-double-claims.mjs).
		const host = boxed ? ctx.nodeOfKey[ md.parent.key ] : null;
		host && host !== node && [ 'draftRef', 'draftFingerprint', 'draftSlots', 'draftBandWrappers' ].forEach( ( k ) => delete host[ k ] );
		const us = boxed && D.childSlots ? unitSlots( { cfg: D.childSlots, units: run.units.units, open: run.units.open, m, finder, settings: ctx.calSettings( D.block ), revealed: ctx.inventory?.revealed || [], attrs: ctx.calParts?.( D.block )?.pathAttrs ?? null } ) : null;
		if ( us && Object.keys( us.slots ).length ) {
			node.draftSlots = us.slots;
			Object.keys( us.states ).length && ( node.draftSlotStates = us.states );
			Object.keys( us.reveals ).length && ( node.draftSlotReveals = us.reveals );
		}
		node.innerBlocks = els.flatMap( ( k ) => [].concat( w.buildNode( k, D.block ) || [] ) );
		const row = ctx.rowOf[ els[ 0 ].key ];
		const where = boxed ? `read at their parent ${ md.parent.key }, the box they sit in` : `their parent ${ md.parent.key } paints or pads itself, so it keeps its own look and the accordion has no draft element`;
		if ( row ) {
			row.unitNote = `the ${ els.length } items are one ${ D.block } with no draft element of its own (their parent ${ md.parent.key } holds other content too), settings ${ JSON.stringify( run.attributes ) }; its look is ${ where }`;
			const notes = [ ...run.notes, ...( us?.notes || [] ) ];
			notes.length && ( row.slotNotes = [ ...( row.slotNotes || [] ), ...notes ] );
		}
		return node;
	}
	return { unitsOf, removedBy, buildBrand, buildIcons, buildList, buildAccordion };
}
