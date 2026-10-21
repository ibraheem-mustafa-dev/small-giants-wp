// The text of the draft's navigation links (Spec 48 FR-48-55 part 3): for each surface that carries a menu, the label a
// link shows, keyed by the route it opens. A link is a text hole over a list (`{{ item.label }}` in a loop) whose
// resolved logic values (facts.json) are strings; the route comes from the draft's object literal that holds that
// label beside an `href` (`{ label: 'Contact', href: '#/contact' }`). A label two literals give different routes is
// ambiguous and carries no entry, so the page title stands in for it.
import fs from 'fs';
import path from 'path';
import { loadDraft, keyName } from './intake-ast.mjs';

const WIDTHS = [ '1440', '768', '375' ];
const stringValues = ( hole ) => {
	for ( const w of WIDTHS ) {
		const v = hole?.[ w ]?.v;
		if ( hole?.[ w ]?.loop && Array.isArray( v ) && v.length && v.every( ( x ) => 'string' === x.t ) ) {
			return v.map( ( x ) => x.v );
		}
	}
	return [];
};
// A bare "#" is a disclosure, never a route.
const routeOf = ( href, front ) => {
	if ( '#' === ( href || '' ).trim() ) {
		return null;
	}
	const m = /^#?\/?([^?#]*)$/.exec( href || '' );
	return m && ! /^[a-z][a-z0-9+.-]*:/i.test( href ) ? ( m[ 1 ].replace( /\/+$/, '' ) || front ) : null;
};

// { label -> route | null (ambiguous) } from every object literal with a static label and href.
export function labelRoutes( drafts, front = 'home' ) {
	const out = new Map();
	for ( const d of drafts.filter( ( x ) => x.idx ) ) {
		for ( const n of d.idx.all.filter( ( o ) => 'ObjectExpression' === o.type ) ) {
			const prop = ( k ) => n.properties.find( ( p ) => 'ObjectProperty' === p.type && keyName( p ) === k && 'StringLiteral' === p.value?.type )?.value.value;
			const [ label, href ] = [ prop( 'label' ), prop( 'href' ) ];
			const route = label && href ? routeOf( href, front ) : null;
			if ( route ) {
				out.set( label, out.has( label ) && out.get( label ) !== route ? null : route );
			}
		}
	}
	return out;
}

// The client's build manifest (sites/<client>/build/surfaces.json); {} when the file is absent, an error when it is unreadable.
export function readSurfaces( repo, client ) {
	const file = path.join( repo, 'sites', client, 'build', 'surfaces.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : {};
}

// { text: { <surface kind>: { <route>: <link text> } }, conflicts: [ message ] } for one client; empty when the facts or the
// draft are not there. Two lists on one surface giving one route different text carry no entry (the page title stands in)
// and are reported, as labelRoutes reports a label with two routes.
export function readLinkTextReport( { repo, client, front = 'home' } ) {
	const facts = path.join( repo, 'sites', client, 'build', 'intake', 'facts.json' );
	const folder = path.join( repo, 'sites', client, 'handoff' );
	if ( ! fs.existsSync( facts ) || ! fs.existsSync( folder ) ) {
		return { text: {}, conflicts: [] };
	}
	const { elements } = JSON.parse( fs.readFileSync( facts, 'utf8' ) );
	const files = fs.readdirSync( folder ).filter( ( f ) => f.endsWith( '.dc.html' ) );
	const routes = labelRoutes( files.map( ( f ) => loadDraft( folder, f ) ), front );
	const seen = {};
	const clash = new Map();
	for ( const e of Object.values( elements ) ) {
		if ( ! e.template?.inFor ) {
			continue;
		}
		const hole = e.template.holes?.find( ( h ) => 'text' === h.where && /\.label$/.test( h.path ) );
		const labels = hole ? stringValues( e.logic?.holes?.[ hole.id ] ) : [];
		for ( const kind of new Set( ( e.surfaces || [] ).map( ( s ) => s.kind ) ) ) {
			for ( const label of labels ) {
				const route = routes.get( label );
				if ( ! route ) {
					continue;
				}
				seen[ kind ] ??= {};
				const k = `${ kind }\u0000${ route }`;
				if ( undefined !== seen[ kind ][ route ] && seen[ kind ][ route ] !== label ) {
					clash.set( k, [ ...new Set( [ ...( clash.get( k ) || [ seen[ kind ][ route ] ] ), label ] ) ] );
				}
				seen[ kind ][ route ] ??= label;
			}
		}
	}
	const text = {};
	for ( const [ kind, byRoute ] of Object.entries( seen ) ) {
		for ( const [ route, label ] of Object.entries( byRoute ) ) {
			if ( ! clash.has( `${ kind }\u0000${ route }` ) ) {
				text[ kind ] = { ...text[ kind ], [ route ]: label };
			}
		}
	}
	const conflicts = [ ...clash ].map( ( [ k, v ] ) => {
		const [ kind, route ] = k.split( '\u0000' );
		return `the ${ kind } surface's lists give the route "${ route }" different link text (${ v.map( ( x ) => `"${ x }"` ).join( ' and ' ) }); no draft text is carried for it`;
	} );
	return { text, conflicts };
}

// { <surface kind>: { <route>: <link text> } } (readLinkTextReport's text).
export const readLinkText = ( args ) => readLinkTextReport( args ).text;
