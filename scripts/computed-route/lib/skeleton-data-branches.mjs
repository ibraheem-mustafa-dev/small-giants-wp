// Data branches of a draft surface (Spec 48 §3.4 step 1, FR-48-96), the companion of lib/skeleton-reveal.mjs. The inventory
// reads a draft in its opening state, and the reveal reader opens what a click or a state key shows. A branch (`sc-if`) whose
// test the logic derives from data (a store, a fixture object, a global: never `this.state` or `this.props`) is shown only for
// some data, such as an order confirmation's gift note or its signed-in link: no click and no state key reaches it, so its
// elements never reach the skeleton. This finds those branches and reads the page again with each one shown.
//
// Which surfaces: only a page surface whose template opts in through the pieces map (data/template-pieces.json
// `dataBranches: true`, inventoryBranches), because a state a working block draws itself (a signed-in account, an empty
// basket, a product type) read into the skeleton would build the static imitation the working block replaces. Which
// branches: every `sc-if` of the surface's component inside the surface's root whose test is a renderVals key (or its
// negation) that is falsy at every width at rest (the fact record's sample of the test) and whose value in renderVals reads
// no state, no props and no method of the component (its AST, lib/intake-ast.mjs). A test shown at rest, a width condition, a
// state value and a loop item's field are left as they are (the reveal and width reads cover them); a test of one field of a
// data value (`gift.on`) is not forced and is a note. Sibling branches that are each other's opposite need no pairing: the one
// hidden at rest is read, the one shown at rest is in the opening read.
//
// The seam: the runtime renders every template value from `{ ...props, ...logic.renderVals() }`, and an `sc-if` reads its test
// from those values. The read wraps the mounted component's own `logic.renderVals` so the test's key returns the value that
// shows the branch, and asks the runtime to render again through the logic's own setState; nothing of the draft's data source
// is replaced, so it works for any draft whatever feeds its data. A text value inside the branch that is empty at rest is given
// its key's name, so the element renders with words and is not taken for an empty, never-shown element.
//
// Bounds: one read per branch hidden at rest at each inventory width, as the reveal reader reads a state. A data branch nested directly inside it is forced in the same read (one level);
// a data branch nested deeper is not forced and is named in a note. A branch's opposite (`noNote` beside `hasNote`) is not
// touched: it keeps its resting value, so its elements stay as the opening read has them. Only elements the opening read does
// not hold are kept from a forced read, each marked `branch: { component, hosts, keys }` (the component, the page's hosts of
// it and the values that show it; lib/fill-data-branches.mjs forces the same for Fill's read) and placed in the
// opening records at its document position: before its first later sibling in the template (same host, higher template
// number or copy), else after the last element under its parent.
import fs from 'fs';
import path from 'path';
import { classMethod, isFn, keyName, loadDraft, resolveName } from './intake-ast.mjs';
import { returnsOf } from './intake-ast-eval.mjs';
import { stateKeysOf } from './read-logic-conditions.mjs';
import { parseInstanceKey, templateKey } from './fact-key.mjs';
import { loadFacts } from './fact-record.mjs';
import { SERVED_ROOT } from './key-space.mjs';
import { loadPieces, readsDataBranches } from './template-pieces.mjs';
import { settleAnimations } from '../../parity/lib/devtools.mjs';

const DEPTH = 8;
const SKIP = new Set( [ 'loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'range' ] );
const KEY = /^[A-Za-z_$][\w$]*$/;
const strip = ( v ) => String( v ?? '' ).replace( /^\s*\{\{\s*|\s*\}\}\s*$/g, '' ).trim();
const falsy = ( x ) => [ 'undefined', 'null' ].includes( x.t ) || ( 'boolean' === x.t && ! x.v ) || ( 'number' === x.t && 0 === x.v ) || ( 'string' === x.t && '' === x.v );

// The value nodes renderVals gives a key (its value in each object renderVals returns).
function renderValsOf( L, key ) {
	const rv = classMethod( L, 'renderVals' );
	const fn = rv && ( isFn( rv ) ? rv : rv.value );
	return ( fn ? returnsOf( L, fn ) : [] ).filter( ( o ) => 'ObjectExpression' === o.type ).flatMap( ( o ) => o.properties.filter( ( p ) => 'ObjectProperty' === p.type && keyName( p ) === key ).map( ( p ) => p.value ) );
}

// Whether a value reads the component's state, props or one of its methods, through the variables it uses.
export function readsComponent( L, node ) {
	const seen = new Set();
	const visit = ( n, depth ) => {
		if ( ! n || depth > DEPTH || seen.has( n ) ) {
			return false;
		}
		seen.add( n );
		if ( 'ThisExpression' === n.type ) {
			return true;
		}
		if ( 'Identifier' === n.type ) {
			const r = resolveName( L, n );
			return 'var' === r?.kind && r.init ? visit( r.init, depth + 1 ) : false;
		}
		for ( const k of Object.keys( n ) ) {
			if ( SKIP.has( k ) ) {
				continue;
			}
			const v = n[ k ];
			for ( const c of Array.isArray( v ) ? v : [ v ] ) {
				// A property name is no read of a variable (`o.gift` reads `o`, not a variable `gift`).
				if ( c && 'string' === typeof c.type && ! ( 'property' === k && 'MemberExpression' === n.type && ! n.computed ) && ! ( 'key' === k && 'ObjectProperty' === n.type && ! n.computed ) && visit( c, depth ) ) {
					return true;
				}
			}
		}
		return false;
	};
	return visit( node, 0 );
}

// The data branches of a surface: { branches: [ { component, el, test, keys, nested } ], notes }. `record` is the fact record,
// `draft` the component's draft file (loadDraft), `component` the component the surface renders, `within` the template key of
// the surface's root element (null: the whole component).
export function dataBranches( { record, draft, component, within = null } ) {
	const notes = [];
	const L = draft?.idx;
	if ( ! L ) {
		return { branches: [], notes: [ `${ component }: the draft's logic cannot be read, so no data branch is forced` ] };
	}
	const stateKeys = new Set( stateKeysOf( L ) );
	const els = Object.entries( record?.elements || {} ).filter( ( [ k, e ] ) => k.startsWith( `${ component }/` ) && ( ! within || k === within || ( e.template?.parentChain || [] ).includes( within ) ) ).map( ( [ key, e ] ) => ( { key, ...e } ) );
	const tests = new Map();
	// Each hidden data branch: the key and value that show it, or a note naming why it is not forced.
	for ( const e of els.filter( ( x ) => 'sc-if' === x.template?.tag ) ) {
		const raw = strip( e.template.own?.value );
		const hole = ( e.template.holes || [] ).find( ( h ) => 'attr:value' === String( h.where ).split( '#' )[ 0 ] );
		const vs = Object.values( e.logic?.holes?.[ hole?.id ] || {} ).flatMap( ( w ) => w?.v || [] );
		if ( ! vs.length || ! vs.every( falsy ) || e.logic?.width ) {
			continue;
		}
		const negated = raw.startsWith( '!' );
		const key = raw.replace( /^!\s*/, '' );
		// The value the test starts from: a loop item's field is per item (no renderVals key), a state value is the reveal
		// reader's; only a test whose renderVals value reads data is forced.
		const top = key.split( '.' )[ 0 ];
		const loopVar = ( e.template.membership?.scFor || [] ).some( ( f ) => f.as === top );
		const values = KEY.test( top ) && ! loopVar ? renderValsOf( L, top ) : [];
		if ( ! values.length || values.some( ( v ) => readsComponent( L, v ) ) ) {
			continue;
		}
		if ( ! KEY.test( key ) ) {
			notes.push( `${ e.key } ({{ ${ raw } }}) is hidden at rest and tests a field of the data value ${ top }: only a whole value is forced, so it is not read` );
			continue;
		}
		tests.set( e.key, { key, value: ! negated } );
	}
	// A text value inside a branch that is empty at rest: its key gets its own name for the forced read.
	const samplesIn = ( branchKey ) => Object.fromEntries( els.filter( ( x ) => ( x.template?.membership?.scIf || [] ).some( ( s ) => s.key === branchKey ) ).flatMap( ( x ) => ( x.template.holes || [] ).filter( ( h ) => 'text' === String( h.where ).split( '#' )[ 0 ] && KEY.test( h.expr ) && ! stateKeys.has( h.expr ) ).filter( ( h ) => Object.values( x.logic?.holes?.[ h.id ] || {} ).flatMap( ( w ) => w?.v || [] ).every( falsy ) ).map( ( h ) => [ h.expr, h.expr ] ) ) );
	const outer = ( k ) => ( record.elements[ k ]?.template?.membership?.scIf || [] ).map( ( s ) => s.key ).filter( ( b ) => tests.has( b ) );
	const branches = [];
	for ( const [ el, t ] of tests ) {
		const up = outer( el );
		if ( up.length ) {
			if ( up.length > 1 ) {
				notes.push( `${ el } ({{ ${ t.key } }}) sits ${ up.length } data branches deep (${ up.join( ', ' ) }): only one level is forced, so it is not read` );
			}
			continue;
		}
		const nested = [ ...tests ].filter( ( [ k ] ) => 1 === outer( k ).length && outer( k )[ 0 ] === el );
		const keys = { ...samplesIn( el ), ...Object.fromEntries( nested.flatMap( ( [ k ] ) => Object.entries( samplesIn( k ) ) ) ), [ t.key ]: t.value, ...Object.fromEntries( nested.map( ( [ , n ] ) => [ n.key, n.value ] ) ) };
		branches.push( { component, el, test: t.key, keys, nested: nested.map( ( [ k ] ) => k ) } );
	}
	return { branches, notes };
}

// The data branches of one surface from its files: the client's fact record and the component's draft in the handoff folder.
// `rootTpl`: the surface root's template number (the intake skeleton's `root.tpl`), so a branch outside the surface is not read.
export function surfaceDataBranches( { repo, client, component, rootTpl = null } ) {
	const folder = path.join( repo, 'sites', client, 'handoff' );
	if ( ! component || ! fs.existsSync( path.join( folder, `${ component }.dc.html` ) ) ) {
		return { branches: [], notes: [ `no draft file for ${ component ?? 'the surface' }, so no data branch is forced` ] };
	}
	const record = loadFacts( client, { repo } );
	return dataBranches( { record, draft: loadDraft( folder, `${ component }.dc.html` ), component, within: null == rootTpl ? null : templateKey( { dc: component, tpl: String( rootTpl ) } ) } );
}

// In-page: wraps (patch) or restores (no patch) `logic.renderVals` of every mounted instance of the named hosts, and asks the
// runtime to render again through the logic's own setState. Returns how many instances it reached.
export function forceRenderVals( { hosts, patch } ) {
	let count = 0;
	for ( const host of document.querySelectorAll( '.sc-host' ) ) {
		const name = host.dataset.scName;
		if ( ! hosts.includes( name ) ) {
			continue;
		}
		const k = Object.keys( host ).find( ( x ) => x.startsWith( '__reactFiber$' ) );
		let f = k ? host[ k ] : null;
		while ( f && ! ( f.stateNode && f.stateNode.logic && f.stateNode.__name === name ) ) {
			f = f.return;
		}
		const logic = f?.stateNode?.logic;
		if ( ! logic ) {
			continue;
		}
		if ( patch ) {
			logic.__sgsRenderVals ||= logic.renderVals;
			const own = logic.__sgsRenderVals;
			logic.renderVals = function () {
				return { ...( own.call( this ) || {} ), ...patch };
			};
		} else if ( logic.__sgsRenderVals ) {
			logic.renderVals = logic.__sgsRenderVals;
			delete logic.__sgsRenderVals;
		} else {
			continue;
		}
		logic.setState( {} );
		count++;
	}
	return count;
}

// The document order of two sibling records: by template number, then copy, when both are elements of the same host; null
// when they cannot be compared (another host's element).
function before( a, b ) {
	const x = parseInstanceKey( a.key );
	const y = parseInstanceKey( b.key );
	if ( ! x || ! y || x.chain.join( '>' ) !== y.chain.join( '>' ) ) {
		return null;
	}
	return x.tpl < y.tpl || ( x.tpl === y.tpl && x.copy < y.copy );
}

// The opening records with each read's new records put in at their document position (see the header). reads: [ { branch:
// { component, keys }, records } ], each read's records in its own document order. A record whose key the opening records or
// an earlier read already hold is the same element and is not added again.
export function mergeDataReads( base, reads ) {
	const out = [ ...base ];
	const have = new Set( base.filter( ( r ) => ! r.reveal ).map( ( r ) => r.key ) );
	for ( const { branch, records } of reads ) {
		const fresh = records.filter( ( r ) => ! have.has( r.key ) );
		const freshKeys = new Set( fresh.map( ( r ) => r.key ) );
		for ( const root of fresh.filter( ( r ) => ! freshKeys.has( r.parentKey ) ) ) {
			// The root and the new records under it, in the read's order.
			const under = new Set( [ root.key ] );
			const group = fresh.filter( ( r ) => ( r === root || under.has( r.parentKey ) ) && under.add( r.key ) ).map( ( r ) => ( { ...r, branch } ) );
			const parentAt = out.findIndex( ( r ) => r.key === root.parentKey );
			const next = out.findIndex( ( r, i ) => i > parentAt && r.parentKey === root.parentKey && ! r.reveal && true === before( root, r ) );
			let at = next;
			if ( at < 0 ) {
				// After the last record under the parent (or at the end when the parent is not in the read).
				const inside = new Set( [ root.parentKey ] );
				at = parentAt < 0 ? out.length : parentAt + 1;
				while ( at < out.length && inside.has( out[ at ].parentKey ) ) {
					inside.add( out[ at ].key );
					at++;
				}
			}
			out.splice( at, 0, ...group );
			group.forEach( ( r ) => have.add( r.key ) );
		}
	}
	return out;
}

// One read per data branch at the page's current width: force it, settle, read, restore, settle. `read()` returns the records
// of the surface's root as the opening read does; `hosts` maps a component to the host names it renders as on this page (the
// served root is `Root`). Returns the opening records with each branch's new elements in place.
export async function readDataBranches( { page, branches, read, base, settle = () => settleAnimations( page, { floor: 500, cap: 3000 } ), hosts = ( c ) => [ c ], log = () => {} } ) {
	const reads = [];
	for ( const b of branches ) {
		const names = hosts( b.component );
		if ( ! await page.evaluate( forceRenderVals, { hosts: names, patch: b.keys } ) ) {
			log( `data branch ${ b.el } ({{ ${ b.test } }}): ${ b.component } is not mounted` );
			continue;
		}
		await settle();
		reads.push( { branch: { component: b.component, hosts: names, keys: b.keys }, records: await read() } );
		await page.evaluate( forceRenderVals, { hosts: names, patch: null } );
		await settle();
	}
	return mergeDataReads( base, reads );
}

// What the inventory reader forces for one manifest surface: { list (dataBranches), hosts, notes }. Only a page surface whose
// template (surfaces.json `target.template`) opts in through the pieces map (`data`, data/template-pieces.json) forces
// anything. The surface's component is its draft file (surfaces.json `draftIndex`), served as the runtime's root host; its
// root is the intake skeleton's root element (intake.json `skeletons[intakeSurface].root.tpl`). A surface with no intake
// skeleton or no draft file forces nothing. `branchesOf` finds the branches (surfaceDataBranches; tests plant one).
export function inventoryBranches( { repo, client, surface, data = loadPieces(), branchesOf = surfaceDataBranches } ) {
	const read = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );
	const entry = read( path.join( repo, 'sites', client, 'build', 'surfaces.json' ) )?.[ surface ];
	const skel = entry?.intakeSurface ? read( path.join( repo, 'sites', client, 'build', 'intake', 'intake.json' ) )?.skeletons?.[ entry.intakeSurface ] : null;
	const component = entry?.draftIndex ? path.basename( entry.draftIndex ).replace( /\.dc\.html$/i, '' ) : null;
	if ( ! skel || ! component || 'page' !== skel.kind || ! readsDataBranches( entry?.target?.template, data ) ) {
		return { list: [], hosts: ( c ) => [ c ], notes: skel && component ? [] : [ `${ surface }: no intake skeleton or draft file, so no data branch is forced` ] };
	}
	const { branches, notes } = branchesOf( { repo, client, component, rootTpl: skel.root?.tpl ?? null } );
	return { list: branches, hosts: ( c ) => ( c === component ? [ c, SERVED_ROOT ] : [ c ] ), notes };
}

// The inventory reader's step at one width (lib/skeleton-inventory.mjs): with `branches` ({ list, hosts }, inventoryBranches)
// it reads each data branch with `collect( ...args )`, the reader's own in-page collector, and puts the new elements into
// `res.records`. Nothing happens without branches.
export async function addDataBranches( { page, res, collect, args, branches, w, log = () => {}, settle = undefined } ) {
	if ( ! branches?.list?.length ) {
		return;
	}
	const read = async () => {
		const r = await page.evaluate( collect, args );
		if ( r.error ) {
			throw new Error( `${ r.error } in a data branch at ${ w }px` );
		}
		return r.records;
	};
	const before = res.records.length;
	res.records = await readDataBranches( { page, branches: branches.list, hosts: branches.hosts, read, base: res.records, log, ...( settle ? { settle } : {} ) } );
	log( `inventory ${ w }px data branches: ${ branches.list.length } read, ${ res.records.length - before } elements added` );
}
