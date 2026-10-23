// The units of siblings that are ONE block and the nodes built from them (Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): a typed brand name is the logo block, icon-only Site Info links in a drawer's
// top row are one social icons group, and two or more stacked text links are one list. `unitsOf` finds the units among an
// element's children; `buildBrand`, `buildIcons` and `buildList` build each one's node and record its rows.
// The factory takes the writer's shared context (`ctx`) after the row book (lib/skeleton-write-record.mjs) is in `ctx.w`.
import { brandOwnsAddress } from './brand-registry.mjs';
import { isMarker } from './skeleton-rules.mjs';
import { finish, W } from './skeleton-classify.mjs';

export const LOGO_HANDOVER = { owner: 'site-info', kind: 'presence', detail: 'the logo image: a logo block\'s image setting paints a measured size, so a skeleton cannot hold it; choose the site logo in the editor' };

export function makeUnits( ctx ) {
	const { m, facts, cls, R, view, overrides, base, rootOf, w } = ctx;
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
	// the list block draws as its marker. One such link alone is a pill button; two or more stacked are a list.
	const listLink = ( e ) => m.isTextLink( e ) || ( 'a' === e.tag && !! String( e.allText ?? '' ).trim() && m.blockKids( e ).every( ( k ) => ! m.blockKids( k ).length ) && m.blockKids( e ).filter( ( k ) => m.words( k ) ).length <= 1 ) || markerRow( e );
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
	const unitsOf = ( e, list = m.blockKids( e ) ) => {
		const out = [];
		for ( let i = 0; i < list.length; ) {
			const brand = typedBrandRun( list, i );
			const icons = brand ? [] : cls.iconRun( list, i, e );
			const run = brand || icons.length ? [] : linkRun( list, i, e );
			if ( brand ) {
				out.push( { type: 'brand', els: brand } );
				i += brand.length;
			} else if ( icons.length ) {
				out.push( { type: 'icons', els: icons, parent: e } );
				i += icons.length;
			} else if ( run.length ) {
				out.push( { type: 'list', els: run } );
				i += run.length;
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
	function buildList( els ) {
		const slug = facts.listSlug;
		const li = facts.listItem;
		const handover = [];
		const items = els.filter( ( l ) => ! removedBy( l ) ).map( ( l ) => {
			const kind = kindOfLink( l );
			const href = l.attrs?.href || '';
			const real = href && '#' !== href;
			if ( kind ) {
				const owner = facts.brands.find( ( b ) => b.slug === kind );
				return { [ li.text ]: '', [ li.siteInfoSource ]: kind, ...( real && li.siteInfoLink && ! ( owner && brandOwnsAddress( owner, href ) ) ? { [ li.siteInfoLink ]: true } : {} ) };
			}
			if ( ! real && 'a' === l.tag ) {
				handover.push( { owner: 'behaviour', kind: 'link', detail: `draft link "${ m.words( l ) }" is "#": its destination is not in the draft, url left empty` } );
			}
			return { [ li.text ]: m.words( l ) || String( l.allText ?? '' ).replace( /\s+/g, ' ' ).trim(), ...( real ? { [ li.url ]: href } : {} ) };
		} );
		const C = {};
		const ev = ( b, kind, w, text ) => ( C[ b ] ||= { block: b, evidence: [] } ).evidence.push( { kind, w, text } );
		ev( slug, 'db', W.tag, `html_tag_to_core_block: ul -> ${ slug }: the database block for a list` );
		capsOf( slug ).includes( 'list' ) && ev( slug, 'capability', W.capability, `block_capabilities: ${ slug } lists "list"` );
		ev( slug, 'structure', W.structure, `${ items.length } bare text links, one above the next` );
		const own = facts.tagMap.a?.core_block_slug;
		own && ev( own, 'db', W.tag, `html_tag_to_core_block: a -> ${ own } (each link on its own)` );
		const r = finish( C );
		const node = base( els.find( ( l ) => ! removedBy( l ) ), slug, { ...( ( enumOf( slug, 'markerType' ) || [] ).includes( 'none' ) ? { markerType: 'none' } : {} ), items } );
		handover.length && ( node.handover = handover );
		els.forEach( ( l, i ) => {
			if ( removedBy( l ) ) {
				const o = overrides( l, m.words( l ) );
				const b = cls.briefOnly( l );
				return record( l, { action: 'remove', reason: b ? `brief-only line (${ b.id }): ${ b.reason }` : o.reason || o.source, source: b ? `decisions ${ b.id }` : o.source, confidence: 0.9, candidates: [] } );
			}
			const at = items[ els.filter( ( x, j ) => j < i && ! removedBy( x ) ).length ];
			const row = record( l, i === els.findIndex( ( x ) => ! removedBy( x ) ) ? r : { ...r, candidates: r.candidates.slice( 0, 1 ) }, { unit: 'list', item: at, ...( at[ li.siteInfoSource ] ? { siteInfoKind: at[ li.siteInfoSource ] } : {} ) } );
			absorbSubtree( l, { block: slug, key: l.key }, 'the list item\'s marker', 'drawsChildren' );
			return row;
		} );
		return node;
	}
	return { unitsOf, removedBy, buildBrand, buildIcons, buildList };
}
