// The re-derived inventory's template and stylesheet records (Spec 48 FR-48-25, METHOD.md §5): one TR record per
// transition declaration (from the inline value, to the element's own `style-*` value; a pseudo rule on that element
// folds into it), one PS record per element whose `style-*` rules have no transition (instant), one K record per
// animation declaration (an @keyframes rule maps to the records that name it, or is its own dead-code record), and one
// RM record per helmet rule inside a reduced-motion @media. Built from the census rows and the stamped template the
// census read (lib/intake-census-template.mjs), never from the .dc.html text.
import { cssDecls, parseTransition, parseAnimation, cssBlocks, sameSelector, reducedMotionMedia, matchSelector } from './intake-inventory-css.mjs';

const nOf = ( id ) => id.slice( id.lastIndexOf( ':' ) + 1 );
const attr = ( e, name ) => e?.attrs.find( ( [ a ] ) => a === name )?.[ 1 ] ?? null;
const PSEUDO_TRIGGER = { hover: 'hover', focus: 'focus', 'focus-visible': 'focus', 'focus-within': 'focus', active: 'press' };

// The inline and pseudo declarations of one stamped element: { inline: Map, pseudo: [[pseudo, Map]] }.
export function elementStyles( e ) {
	const decl = ( v ) => new Map( cssDecls( v || '' ) );
	return {
		inline: decl( attr( e, 'style' ) ),
		pseudo: ( e?.attrs || [] ).filter( ( [ a ] ) => a.startsWith( 'style-' ) ).map( ( [ a, v ] ) => [ a.slice( 6 ), decl( v ) ] ),
	};
}

// The value a property takes when an ancestor's `style-hover` sets the custom property its inline value reads:
// { name, to } (the inline value with the var() replaced by the ancestor's hover value), or null.
function ancestorHover( elOf, comp, e, from ) {
	const m = /var\(\s*(--[\w-]+)\s*(?:,[^()]*(?:\([^()]*\))?[^()]*)?\)/.exec( from || '' );
	if ( ! m ) {
		return null;
	}
	for ( let p = e?.parent ? elOf.get( `${ comp }:${ e.parent }` ) : null, guard = 0; p && guard < 100; p = p.parent ? elOf.get( `${ comp }:${ p.parent }` ) : null, guard++ ) {
		const hit = p.attrs.filter( ( [ a ] ) => a.startsWith( 'style-' ) ).map( ( [ , v ] ) => new Map( cssDecls( v || '' ) ) ).find( ( d ) => d.has( m[ 1 ] ) );
		if ( hit ) {
			return { name: m[ 1 ], to: from.replace( m[ 0 ], hit.get( m[ 1 ] ) ) };
		}
	}
	return null;
}

// A short description of a stamped element: its tag and the first words of its static text.
export function describeElement( comp, e ) {
	const words = ( e?.texts || [] ).map( ( t ) => t.replace( /\{\{[\s\S]*?\}\}/g, '' ).trim() ).filter( Boolean ).join( ' ' ).slice( 0, 40 );
	return `<${ ( e?.tag || 'element' ).replace( /^sc-raw-/, '' ) }> ${ comp }:${ e?.n ?? '?' }${ words ? ` "${ words }"` : '' }`;
}

// The trace field of a record built from census rows: yes/no from the runtime pass, not-instrumented when it could not
// decide (a static-only census, a trace gap, or a real :hover/:focus).
export function traceOf( rows, { pseudo = false } = {} ) {
	if ( pseudo ) {
		return { observed: 'not-instrumented', note: 'real :hover/:focus is not produced by the runtime pass' };
	}
	const marks = rows.map( ( r ) => r.unreached );
	if ( marks.some( ( m ) => false === m ) ) {
		return { observed: 'yes', note: 'reached in the census runtime pass' };
	}
	if ( marks.length && marks.every( ( m ) => true === m ) ) {
		return { observed: 'no', note: 'unreached in the census runtime pass (rest mode); see the draft defects for the forced test' };
	}
	return { observed: 'not-instrumented', note: rows.some( ( r ) => r.traceGap ) ? rows.find( ( r ) => r.traceGap ).traceGap : 'static census only' };
}

// The template and stylesheet records of a census. `add(prefix, record, censusRows, meta)` registers a record (from
// lib/intake-inventory-anim.mjs); returns the K records' animation names per record for the @keyframes mapping.
export function templateRecords( census, add ) {
	const elOf = new Map( census.sources.flatMap( ( s ) => s.stamped.elements.map( ( e ) => [ `${ s.component }:${ e.n }`, e ] ) ) );
	const fileOf = new Map( census.sources.map( ( s ) => [ s.component, s.file ] ) );
	const tplRows = census.rows.filter( ( r ) => ! r.draftId.includes( ':js:' ) && [ 'transition', 'keyframes', 'style-hover' ].includes( r.kind ) );
	const byEl = new Map();
	tplRows.forEach( ( r ) => byEl.set( r.draftId, [ ...( byEl.get( r.draftId ) || [] ), r ] ) );
	const rmRecords = [];
	const later = [];
	for ( const [ draftId, rows ] of byEl ) {
		const comp = rows[ 0 ].component;
		const e = elOf.get( draftId );
		const base = { dc: comp, template_tpl_id: nOf( draftId ), selector: `template element data-dc-tpl=${ nOf( draftId ) }`, description: describeElement( comp, e ) };
		const source = ( code ) => ( { file: fileOf.get( comp ) ?? comp, function: 'template', ref: null, line: null, code } );
		const sheet = rows.filter( ( r ) => 'stylesheet' === r.detail.via );
		if ( sheet.length ) {
			later.push( { comp, e, rows: sheet, source } );
		}
		const own = rows.filter( ( r ) => 'stylesheet' !== r.detail.via && '@keyframes' !== r.detail.via );
		const defs = rows.filter( ( r ) => '@keyframes' === r.detail.via );
		defs.forEach( ( r ) => later.push( { comp, e, rows: [ r ], source, def: true } ) );
		if ( ! own.length ) {
			continue;
		}
		const st = elementStyles( e );
		const pseudoRows = own.filter( ( r ) => 'style-hover' === r.kind );
		const firstPseudo = st.pseudo[ 0 ]?.[ 0 ];
		const bound = String( attr( e, 'style' ) || '' ).includes( '{{' );
		const trans = own.filter( ( r ) => 'transition' === r.kind && /^-?(webkit-)?transition(-property)?$/.test( r.detail.property ) );
		let firstTr = null;
		for ( const r of trans ) {
			const items = parseTransition( r.detail.value );
			const props = [];
			for ( const it of items ) {
				const names = 'all' === it.property ? [ ...new Set( st.pseudo.flatMap( ( [ , m ] ) => [ ...m.keys() ] ) ) ] : [ it.property ];
				( names.length ? names : [ 'all' ] ).forEach( ( name ) => {
					const from = st.inline.get( name ) ?? null;
					const own = st.pseudo.find( ( [ , m ] ) => m.has( name ) )?.[ 1 ].get( name ) ?? null;
					const via = null === own ? ancestorHover( elOf, comp, e, from ) : null;
					props.push( { property: name, from, to: own ?? via?.to ?? null, ...( via ? { viaVar: via.name } : {} ), duration_ms: it.duration_ms, delay_ms: it.delay_ms, easing: it.easing, ...( it.raw ? { formula: it.raw } : {} ) } );
				} );
			}
			const pseudo = st.pseudo.find( ( [ , m ] ) => props.some( ( x ) => m.has( x.property ) ) )?.[ 0 ];
			const uniform = ( k ) => props.every( ( x ) => x[ k ] === props[ 0 ][ k ] );
			const one = 1 === props.length || ( uniform( 'duration_ms' ) && uniform( 'delay_ms' ) && uniform( 'easing' ) );
			const viaVar = props.find( ( x ) => x.viaVar )?.viaVar;
				props.forEach( ( x ) => delete x.viaVar );
				const trigger = pseudo ? { type: PSEUDO_TRIGGER[ pseudo ] ?? 'state', detail: `style-${ pseudo } rule on the same element (!important)` }
				: viaVar ? { type: 'hover', detail: `the parent's style-hover sets ${ viaVar }` }
				: bound ? { type: 'state', detail: 'state-bound inline value ({{ }})' } : { type: 'state', detail: 'no template trigger: the value is changed by code' };
			const rec = add( 'TR', {
				name: `Transition on ${ base.description }`, mechanism: 'css-transition', element: base,
				source: source( `${ r.detail.via === 'style' ? '' : `${ r.detail.via }: ` }transition:${ r.detail.value }` ), trigger,
				properties: props.map( ( x ) => ( one ? { property: x.property, from: x.from, to: x.to, ...( x.formula ? { formula: x.formula } : {} ) } : x ) ),
				duration_ms: one ? props[ 0 ].duration_ms : 'per property', delay_ms: one ? props[ 0 ].delay_ms : 'per property', stagger: null,
				easing: one ? props[ 0 ].easing : 'per property', iterations: 1, direction: null, fill: null,
				reduced_motion: { behaviour: 'unchanged', detail: 'no reduced-motion rule' }, status: 'active', trace: traceOf( [ r ] ),
			}, [ r ], { tpl: [ draftId ], rm: true } );
			firstTr ||= rec;
		}
		const rest = own.filter( ( r ) => 'transition' === r.kind && ! trans.includes( r ) );
		if ( firstTr ) {
			add.map( firstTr, [ ...rest, ...pseudoRows ] );
		} else if ( pseudoRows.length || rest.length ) {
			const props = st.pseudo.flatMap( ( [ , m ] ) => [ ...m ].map( ( [ k, v ] ) => ( { property: k, from: st.inline.get( k ) ?? null, to: v } ) ) );
			const kind = rest.length && ! pseudoRows.length ? 'TR' : 'PS';
			add( kind, {
				name: `${ 'PS' === kind ? 'Instant pseudo rule' : 'Transition timing' } on ${ base.description }`, mechanism: 'PS' === kind ? 'css-pseudo' : 'css-transition', element: base,
				source: source( [ ...pseudoRows.map( ( r ) => `style-${ r.detail.pseudo }="${ r.detail.value }"` ), ...rest.map( ( r ) => `${ r.detail.property }:${ r.detail.value }` ) ].join( ' | ' ) ),
				trigger: firstPseudo ? { type: PSEUDO_TRIGGER[ firstPseudo ] ?? 'state', detail: `style-${ firstPseudo } rule, no transition (instant)` } : { type: 'state', detail: 'a transition longhand with no transition property' },
				properties: props.length ? props : rest.map( ( r ) => ( { property: r.detail.property, from: null, to: r.detail.value } ) ),
				duration_ms: 0, delay_ms: 0, stagger: null, easing: null, iterations: 1, direction: null, fill: null,
				reduced_motion: { behaviour: 'unchanged', detail: 'not motion-gated' }, status: pseudoRows.some( ( r ) => r.detail.bound ) ? 'no-op' : 'active',
				trace: traceOf( [ ...pseudoRows, ...rest ], { pseudo: Boolean( pseudoRows.length ) } ),
				...( pseudoRows.some( ( r ) => r.detail.bound ) ? { notes: 'a bound style-* value: the runtime compiles it raw, so the {{ }} never resolves (draft defect test 1)' } : {} ),
			}, [ ...pseudoRows, ...rest ], { tpl: [ draftId ] } );
		}
		const anims = own.filter( ( r ) => 'keyframes' === r.kind );
		const decl = anims.filter( ( r ) => /^-?(webkit-)?animation(-name)?$/.test( r.detail.property ) );
		let firstK = null;
		for ( const r of decl ) {
			firstK ||= animationRecord( add, r, base, source( `${ r.detail.property }:${ r.detail.value }` ), { tpl: [ draftId ] } );
		}
		const restK = anims.filter( ( r ) => ! decl.includes( r ) );
		if ( restK.length ) {
			firstK ? add.map( firstK, restK ) : animationRecord( add, restK[ 0 ], base, source( restK.map( ( r ) => `${ r.detail.property }:${ r.detail.value }` ).join( ';' ) ), { tpl: [ draftId ], extra: restK.slice( 1 ) } );
		}
	}
	for ( const l of later.filter( ( x ) => ! x.def ) ) {
		const blocks = cssBlocks( l.e?.body );
		const groups = new Map();
		l.rows.forEach( ( r ) => groups.set( r.detail.selector, [ ...( groups.get( r.detail.selector ) || [] ), r ] ) );
		for ( const [ selector, rows ] of groups ) {
			const block = blocks.find( ( b ) => sameSelector( b.selector, selector ) && rows.every( ( r ) => b.decls.some( ( [ p ] ) => p === r.detail.property ) ) );
			const media = block?.media ?? null;
			const src = census.sources.find( ( s ) => s.component === l.comp );
			const m = matchSelector( src?.stamped.elements || [], selector );
			const element = { dc: l.comp, template_tpl_id: m.tpl.length ? m.tpl : null, selector: `helmet <style> ${ selector }`, selection_rule: `${ media ? `@media ${ media } ` : '' }${ selector }`, description: `elements matching ${ selector }` };
			const code = `${ media ? `@media ${ media } { ` : '' }${ selector } { ${ rows.map( ( r ) => `${ r.detail.property }: ${ r.detail.value }` ).join( '; ' ) } }${ media ? ' }' : '' }`;
			if ( reducedMotionMedia( media ) ) {
				rmRecords.push( add( 'RM', {
					name: `Reduced-motion override ${ selector }`, mechanism: 'css-media', element, source: l.source( code ), trigger: { type: 'media-query', detail: media },
					properties: ( block ? block.decls.map( ( [ property, value ] ) => ( { property, from: 'as declared', to: rows.find( ( r ) => r.detail.property === property )?.detail.value ?? value } ) ) : rows.map( ( r ) => ( { property: r.detail.property, from: 'as declared', to: r.detail.value } ) ) ), duration_ms: null, delay_ms: 0, stagger: null, easing: null,
					iterations: 1, direction: null, fill: null, reduced_motion: { behaviour: 'final-state', detail: 'this rule is the reduced-motion behaviour' }, status: 'active', trace: traceOf( rows ),
				}, rows, { tpl: ( m.tpl ).map( ( n ) => `${ l.comp }:${ n }` ), selector } ) );
			} else if ( rows.some( ( r ) => 'transition' === r.kind ) ) {
				const items = rows.filter( ( r ) => 'transition' === r.kind ).flatMap( ( r ) => ( 'transition' === r.detail.property ? parseTransition( r.detail.value ) : [ { property: r.detail.property, duration_ms: null, delay_ms: null, easing: null, raw: r.detail.value } ] ) );
				add( 'TR', {
					name: `Stylesheet transition ${ selector }`, mechanism: 'css-transition', element, source: l.source( code ), trigger: { type: 'state', detail: `stylesheet rule ${ selector }${ media ? ` under @media ${ media }` : '' }` },
					properties: items.map( ( x ) => ( { property: x.property, from: null, to: null, duration_ms: x.duration_ms, delay_ms: x.delay_ms, easing: x.easing, ...( x.raw ? { formula: x.raw } : {} ) } ) ),
					duration_ms: 'per property', delay_ms: 'per property', stagger: null, easing: 'per property', iterations: 1, direction: null, fill: null,
					reduced_motion: { behaviour: 'unchanged', detail: 'no reduced-motion rule' }, status: 'active', trace: traceOf( rows ),
				}, rows, { tpl: m.tpl.map( ( n ) => `${ l.comp }:${ n }` ), rm: true } );
			} else {
				const decl = rows.find( ( r ) => /^-?(webkit-)?animation(-name)?$/.test( r.detail.property ) ) || rows[ 0 ];
				animationRecord( add, decl, element, l.source( code ), { tpl: m.tpl.map( ( n ) => `${ l.comp }:${ n }` ), extra: rows.filter( ( r ) => r !== decl ) } );
			}
		}
	}
	return { rmRecords, defs: later.filter( ( x ) => x.def ) };
}

// One K (css-animation) record from an animation declaration row (the shorthand or animation-name).
export function animationRecord( add, r, element, source, { tpl = [], extra = [], trigger = null, status = null } = {} ) {
	const a = /^-?(webkit-)?animation$/.test( r.detail.property ) ? parseAnimation( r.detail.value )[ 0 ] : { name: /animation-name/.test( r.detail.property ) ? r.detail.value : null, duration_ms: null, delay_ms: null, easing: null, iterations: 1, direction: null, fill: null };
	const none = 'none' === a.name || 'none' === String( r.detail.value ).trim();
	return add( 'K', {
		name: `CSS animation ${ a.name ?? r.detail.value } on ${ element.description }`, mechanism: 'css-animation', element, source,
		trigger: trigger ?? { type: 'load', detail: 'runs while the declaration applies' },
		properties: [ { property: 'animation-name', from: null, to: a.name ?? r.detail.value } ], duration_ms: a.duration_ms, delay_ms: a.delay_ms, stagger: null, easing: a.easing,
		iterations: a.iterations, direction: a.direction, fill: a.fill, reduced_motion: { behaviour: 'unchanged', detail: 'no reduced-motion rule' },
		status: status ?? ( none ? 'no-op' : 'active' ), trace: traceOf( [ r, ...extra ] ), ...( none ? { notes: 'animation: none declares no motion' } : {} ),
	}, [ r, ...extra ], { tpl, names: a.name && ! none ? [ a.name ] : [], rm: true } );
}

// Fills reduced_motion on every TR and K record an RM record's selector matches (or `*`): final-state.
export function applyReducedMotion( records, rmRecords, metaOf ) {
	for ( const rec of records.filter( ( x ) => metaOf( x )?.rm ) ) {
		const hit = rmRecords.find( ( rm ) => rm.element.dc === rec.element.dc && ( /(^|,)\s*\*/.test( metaOf( rm ).selector ) || metaOf( rm ).tpl.some( ( t ) => metaOf( rec ).tpl.includes( t ) ) ) );
		if ( hit ) {
			rec.reduced_motion = { behaviour: 'final-state', detail: `${ hit.id } shortens it under prefers-reduced-motion: reduce` };
		}
	}
}
