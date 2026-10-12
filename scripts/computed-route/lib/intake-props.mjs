// Prop variants (Spec 48 FR-48-29). A component draft mounted through `dc-import` declares its props in the
// `data-props` attribute of its `<script data-dc-script>` (the runtime's own prop editor list: editor, options,
// default). The design is the render with the default props, as the parent draft mounts it; another value of an enum
// prop is a variant, recorded as a state only when a parent draft mounts the component with that value. An enum prop
// no parent mounts with is listed, never built. Which props a parent passes comes from
// lib/intake-defects-keys.mjs::mountedProps (the draft-defect pass's own list); the value each mount passes is its
// stamped dc-import attribute: a literal, or a `{{ key }}` whose renderVals expression is read on the parent's syntax
// tree for the option strings it can yield.
import fs from 'fs';
import path from 'path';
import { walkAst } from './intake-census-logic.mjs';
import { logicModel, mountedProps, conditionKeys } from './intake-defects-keys.mjs';

const CAMEL = 'sc-camel-';
const decode = ( name ) => ( name.startsWith( CAMEL ) ? name.slice( CAMEL.length ).replace( /-([a-z])/g, ( _, c ) => c.toUpperCase() ) : name );
const ENTITIES = { '&quot;': '"', '&#34;': '"', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };
const unescape = ( s ) => s.replace( /&(quot|#34|apos|#39|lt|gt|amp);/g, ( m ) => ENTITIES[ m ] );

// The `data-props` declaration of a .dc.html text, cut at the `<script data-dc-script>` tag the way the runtime finds
// it (quote-aware tag scan): { props: { name: { editor, options, default, tsType } } } or { error }. A draft with no
// data-props declares no props.
export function declaredProps( text ) {
	for ( let i = text.indexOf( '<script' ); i >= 0; i = text.indexOf( '<script', i + 7 ) ) {
		const attrs = [];
		let j = i + 7;
		while ( j < text.length && '>' !== text[ j ] ) {
			const m = /^\s*([^\s=>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/.exec( text.slice( j ) );
			if ( ! m || ! m[ 0 ].length ) {
				j++;
				continue;
			}
			attrs.push( [ m[ 1 ].toLowerCase(), m[ 2 ] ?? m[ 3 ] ?? m[ 4 ] ?? '' ] );
			j += m[ 0 ].length;
		}
		if ( ! attrs.some( ( [ a ] ) => 'data-dc-script' === a ) ) {
			continue;
		}
		const raw = attrs.find( ( [ a ] ) => 'data-props' === a )?.[ 1 ];
		if ( ! raw ) {
			return { props: {} };
		}
		try {
			const all = JSON.parse( unescape( raw ) );
			return { props: Object.fromEntries( Object.entries( all ).filter( ( [ k ] ) => ! k.startsWith( '$' ) ) ) };
		} catch ( e ) {
			return { error: `data-props is not JSON: ${ e.message }` };
		}
	}
	return { props: {} };
}

// The values one mount passes for a prop: { values, how, why? }. A literal attribute is its value; `{{ key }}` is read
// through the parent's renderVals key on its syntax tree (every string literal in it that is an option); anything
// else is unresolved with why.
function mountValues( parent, raw, options ) {
	const hole = /^\s*\{\{([\s\S]+?)\}\}\s*$/.exec( raw );
	if ( ! raw.includes( '{{' ) ) {
		return { values: [ raw ], how: 'literal' };
	}
	if ( ! hole ) {
		return { values: [], how: 'bound', why: `${ raw } mixes text and a binding` };
	}
	const root = hole[ 1 ].trim().split( /[.[\s(]/ )[ 0 ];
	const m = logicModel( parent );
	const node = m.vals.get( root );
	if ( ! node ) {
		return { values: [], how: 'bound', why: `${ root } is not a key of ${ parent.component }'s renderVals() (a loop item or computed key)` };
	}
	const found = new Set();
	walkAst( node, ( n ) => {
		if ( 'StringLiteral' === n.type && ( ! options || options.includes( n.value ) ) ) {
			found.add( n.value );
		}
	} );
	return found.size ? { values: [ ...found ], how: 'bound' } : { values: [], how: 'bound', why: `renderVals ${ root } yields no ${ options ? 'option' : 'string' } literal` };
}

// The prop variants of every component a parent mounts: { props: [ { component, prop, editor, options, default,
// mounted: [ { value, by: [draftId], how } ], variants (non-default values a parent mounts), unused (an enum prop no
// parent mounts with: listed, not built), unusedOptions, gates (the sc-ifs whose condition reads the prop) } ],
// gaps }. `folder` holds the drafts; `census` is { rows, sources }.
export function propVariants( { folder, census } ) {
	const out = [];
	const gaps = [];
	const passed = mountedProps( census.rows );
	const bySource = new Map( census.sources.map( ( s ) => [ s.component, s ] ) );
	const imported = [ ...new Set( census.rows.filter( ( r ) => 'dc-import' === r.kind ).map( ( r ) => r.detail.name ) ) ];
	for ( const comp of imported ) {
		const src = bySource.get( comp );
		if ( ! src ) {
			gaps.push( { construct: 'prop-variant', draftId: comp, error: 'mounted by a parent but not in the census sources' } );
			continue;
		}
		const decl = declaredProps( fs.readFileSync( path.join( folder, src.file ), 'utf8' ) );
		if ( decl.error ) {
			gaps.push( { construct: 'prop-variant', draftId: comp, error: decl.error } );
			continue;
		}
		const loopVars = census.rows.filter( ( r ) => 'sc-for' === r.kind && r.component === comp ).map( ( r ) => r.detail.as );
		const gating = census.rows.filter( ( r ) => 'sc-if' === r.kind && r.component === comp ).map( ( r ) => [ r.draftId, conditionKeys( src, r.detail.value, { loopVars } ).props ] );
		const mounts = census.rows.filter( ( r ) => 'dc-import' === r.kind && r.detail.name === comp );
		for ( const [ prop, d ] of Object.entries( decl.props ) ) {
			const options = 'enum' === d.editor && Array.isArray( d.options ) ? d.options : null;
			const mounted = new Map();
			for ( const r of mounts ) {
				const parent = bySource.get( r.component );
				const el = parent?.stamped.elements.find( ( e ) => e.n === r.draftId.slice( r.draftId.lastIndexOf( ':' ) + 1 ) );
				const raw = el?.attrs.find( ( [ a ] ) => decode( a ) === prop )?.[ 1 ];
				if ( undefined === raw ) {
					continue;
				}
				const v = mountValues( parent, raw, options );
				if ( v.why ) {
					gaps.push( { construct: 'prop-variant', draftId: r.draftId, error: `${ comp }.${ prop }: ${ v.why }` } );
				}
				v.values.forEach( ( x ) => mounted.set( x, { value: x, by: [ ...( mounted.get( x )?.by || [] ), r.draftId ], how: v.how } ) );
			}
			const values = [ ...mounted.keys() ];
			out.push( {
				component: comp, prop, editor: d.editor ?? null, options, default: d.default ?? null,
				mounted: [ ...mounted.values() ],
				variants: options ? values.filter( ( x ) => x !== ( d.default ?? null ) ) : [],
				unused: Boolean( options ) && ! passed.get( comp )?.has( prop ),
				unusedOptions: options ? options.filter( ( o ) => ! values.includes( o ) && o !== d.default ) : [],
				gates: gating.filter( ( [ , props ] ) => props.includes( prop ) ).map( ( [ id ] ) => id ),
			} );
		}
	}
	return { props: out, gaps };
}
