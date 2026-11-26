// The control that fills a form (Spec 48 FR-48-6, FR-48-57; register A1, Bean S9 2026-10-28): a draft button whose click handler scrolls
// to a form and sets its fields (`toForm({ role, team })`) is an sgs/button linking the page's form with each field in the query
// (BEFORE the hash: a field's `valueFromParam` reads the query string) and `#<the form's anchor>`, each loop copy's values read from the
// element printing them in that copy; the saved form's root carries the anchor and its fields carry `valueFromParam`. Read from the
// draft's syntax tree, never by a name. Synthetic inventories, fact records and drafts in the readers' shapes; tests marked MUST FAIL
// fail before the rule, each with its negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { formOpenerOf, prefillParams, prefillHref } from '../lib/skeleton-form-prefill.mjs';
import { formWrites } from '../lib/fill-form.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const SCRIPT = `class Site {
	toForm(sel) {
		const form = this._main && this._main.querySelector('form'); if (!form) return;
		if (sel) Object.keys(sel).forEach((k) => { const el = form.querySelector('select[name="' + k + '"]'); if (el) el.value = sel[k]; });
		window.scrollTo({ top: form.getBoundingClientRect().top });
	}
	jump(sel) { const form = this._main.querySelector('form'); window.scrollTo(0, form.offsetTop); }
	nudge() { window.scrollTo(0, 0); }
	look() { const form = document.querySelector('form'); return form; }
	renderVals() {
		return {
			roles: ROLES.map((ro) => ({ ...ro, apply: () => this.toForm({ role: ro.title, team: ro.team }) })),
			bare: ROLES.map((ro) => ({ pick: () => this.toForm({ role: ro.title }) })),
			odd: ROLES.map((ro) => ({ ...ro, deep: () => this.toForm({ role: stranger.title }) })),
			skip: () => this.jump({ zzz: 'x' }),
			plain: () => this.toForm({ team: 'Sales' }),
			top: () => this.toForm(),
			other: () => this.nudge(),
			peek: () => this.look(),
		};
	}
}`;
const draft = ( script = SCRIPT ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'form-prefill-' ) );
	const dir = path.join( repo, 'sites', 'eye-care-ward-end', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = `<x-dc name="Site"><div></div></x-dc>\n<script data-dc-script>\n${ script }\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Site.dc.html' ), text );
	return { repo, folder: dir, record: { sources: { files: { 'Site.dc.html': crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) } } } };
};
const opener = ( handler, script ) => {
	const d = draft( script );
	return formOpenerOf( { folder: d.folder, record: d.record, component: 'Site', handler } );
};

test( 'MUST FAIL: a handler that calls a method scrolling to a form gives the fields it sets; a loop item field maps to the item path, a literal stays', () => {
	assert.deepEqual( opener( 'ro.apply' ), { fields: [ { name: 'role', rest: 'title' }, { name: 'team', rest: 'team' } ], loop: true } );
	assert.deepEqual( opener( 'plain' ), { fields: [ { name: 'team', value: 'Sales' } ], loop: false } );
	assert.deepEqual( opener( 'top' ), { fields: [], loop: false }, 'a scroll with no fields still opens the form' );
	assert.deepEqual( opener( 'it.pick' ), { fields: [], loop: true }, 'an item field made without spreading the item reads no path' );
	assert.deepEqual( opener( 'ro.deep' ), { fields: [], loop: true }, 'a path below a name other than the item is not read' );
	assert.deepEqual( opener( 'skip' ), { fields: [], loop: false }, 'a method that sets no value names no field' );
} );

test( 'NEGATIVE: a method that scrolls but looks up no form, one that looks a form up and does not scroll, an unknown handler and a draft with no opener give none', () => {
	assert.equal( opener( 'other' ), null, 'scrolls to the top, not to a form' );
	assert.equal( opener( 'peek' ), null, 'finds a form and never scrolls to it' );
	assert.equal( opener( 'missing' ), null );
	assert.equal( opener( 'ro.nothing' ), null );
	assert.equal( opener( 'ro.apply', SCRIPT.replace( "querySelector('form')", "querySelector('.card')" ) ), null );
	assert.equal( opener( 'ro.apply', SCRIPT.replace( 'window.scrollTo({ top: form.getBoundingClientRect().top });', '' ) ), null );
	assert.deepEqual( opener( 'ro.apply', SCRIPT.replace( 'if (el) el.value = sel[k];', '' ) ).fields, [], 'a method that sets no field gives no field' );
	assert.equal( opener( 'ro.apply', SCRIPT.replace( 'bare:', 'dup: ROLES.map((ro) => ({ ...ro, apply: () => this.toForm({ team: ro.team }) })), bare:' ) ), null, 'two item fields of one name that open forms differently are ambiguous' );
} );

test( 'prefillParams names the fields every form opener sets; prefillHref puts the query before the hash and leaves out a field a copy shows no value for', () => {
	const d = draft();
	assert.deepEqual( [ ...prefillParams( { folder: d.folder, record: d.record, component: 'Site' } ) ].sort(), [ 'role', 'team' ] );
	assert.deepEqual( [ ...prefillParams( { folder: d.folder, record: { sources: { files: {} } }, component: 'Site' } ) ], [], 'no component file, no field' );
	assert.deepEqual( [ ...prefillParams( { folder: d.folder, record: d.record } ) ], [], 'no component named, no field' );
	assert.deepEqual( [ ...prefillParams( { folder: d.folder, record: d.record, component: 'Other' } ) ], [], 'the openers of another component reach the form of another page' );
	const href = prefillHref( { fields: [ { name: 'role', rest: 'title' }, { name: 'team', rest: 'team' }, { name: 'x', value: 'a b' } ], anchor: 'careers', valueOf: ( r ) => ( 'title' === r ? 'Warehouse & logistics' : null ) } );
	assert.equal( href, '?role=Warehouse%20%26%20logistics&x=a%20b#careers' );
	assert.equal( prefillHref( { fields: [], anchor: 'careers', valueOf: () => null } ), '#careers' );
	assert.equal( prefillHref( { fields: [ { name: 'a&b', value: '1' } ], anchor: 'x', valueOf: () => null } ), '?a%26b=1#x' );
} );

// The page: a heading, three role cards (a loop copy each: a title, a team and an apply button), the page's form and a literal opener.
const REFS = { 'sgs/form': { kind: 'linked', flag: 'formIsLinked', key: 'formId' } };
const SHOWN = { 375: true, 768: true, 1440: true };
const BOX = { 375: { x: 0, y: 0, w: 300, h: 40 }, 768: { x: 0, y: 0, w: 300, h: 40 }, 1440: { x: 0, y: 0, w: 300, h: 40 } };
const FOR = [ { kind: 'sc-for', list: '{{ roles }}', as: 'ro', tpl: '9' } ];
const el = ( n, copy, parent, tag, words, x = {} ) => ( { key: `Root/${ n }#${ copy }`, parentKey: parent ? `Root/${ parent[ 0 ] }#${ parent[ 1 ] }` : null, depth: x.depth ?? 1, tag, template: 'Root', tpl: n, attrs: x.attrs || {}, words, allText: words, membership: x.membership ?? ( x.loop ? FOR : [] ), srcTag: tag, srcOwnText: words,
	snippet: `<${ tag } data-dc-tpl="${ n }"${ x.click ? ` sc-camel-on-click="{{ ${ x.click } }}"` : '' }>${ words }</${ tag }>`, visible: SHOWN, box: BOX, display: 'block', widths: [ 375, 768, 1440 ], flexDirection: 'row' } );
const ROLES = [ [ 'Warehouse Operative', 'Warehouse & logistics' ], [ 'Driver', 'Warehouse & logistics' ], [ 'Sales Executive', 'Sales' ] ];
const inventory = () => ( {
	generated: 'x', source: 'planted', root: 'main', keyFormat: 'x', checks: { duplicateKeys: 0 },
	elements: [
		el( 1, 0, null, 'main', '', { depth: 0 } ),
		el( 2, 0, [ 1, 0 ], 'h1', 'Careers' ),
		el( 28, 0, [ 1, 0 ], 'span', 'WRONG loop', { membership: [ { kind: 'sc-for', list: '{{ other }}', as: 'ro', tpl: '99' } ] } ),
		el( 29, 0, [ 1, 0 ], 'a', 'WRONG attribute', { loop: true } ),
		...ROLES.flatMap( ( [ title, team ], i ) => [
			el( 21, i, [ 1, 0 ], 'div', '', { loop: true } ),
			el( 22, i, [ 21, i ], 'h3', title, { loop: true, depth: 2 } ),
			el( 23, i, [ 21, i ], 'span', team, { loop: true, depth: 2 } ),
			el( 24, i, [ 21, i ], 'button', 'Apply for this role', { loop: true, depth: 2, click: 'ro.apply' } ),
		] ),
		el( 25, 0, [ 1, 0 ], 'button', 'Talk to sales', { click: 'plain' } ),
		el( 26, 0, [ 1, 0 ], 'button', 'Scroll up', { click: 'other' } ),
		el( 27, 0, [ 1, 0 ], 'span', 'Not a control', { click: 'plain' } ),
		el( 3, 0, [ 1, 0 ], 'div', '' ),
		el( 6, 0, [ 3, 0 ], 'form', '', { depth: 2 } ),
	],
} );
const tpl = ( tag, parent, chain, holes = [] ) => ( { component: 'Site', realTag: tag, attrs: {}, style: { static: [], holes: [] }, holes, membership: { scIf: [], scFor: [] }, parent, realParent: parent, parentChain: chain } );
const entry = ( tag, parent, chain, holes ) => ( { template: tpl( tag, parent, chain, holes ), surfaces: [], logic: { holes: {} } } );
const RECORD = ( surfaces = {} ) => ( {
	surfaces: {
		'S-1': { id: 'S-1', kind: 'page', name: 'Careers', dc: 'Site', parent: null, roots: [ 'Site/1' ], parts: [] },
		'S-2': { id: 'S-2', kind: 'form', name: 'Apply', dc: 'Site', parent: 'S-1', roots: [ 'Site/4' ], parts: [] },
		...surfaces,
	},
	elements: {
		'Site/1': entry( 'main', null, [] ), 'Site/2': entry( 'h1', 'Site/1', [ 'Site/1' ] ),
		'Site/21': entry( 'div', 'Site/1', [ 'Site/1' ] ),
		'Site/22': entry( 'h3', 'Site/21', [ 'Site/21', 'Site/1' ], [ { id: 'text#0', where: 'text', expr: 'ro.title', path: 'ro.title', whole: false } ] ),
		'Site/23': entry( 'span', 'Site/21', [ 'Site/21', 'Site/1' ], [ { id: 'text#0', where: 'text', expr: 'ro.team', path: 'ro.team', whole: false } ] ),
		'Site/24': entry( 'button', 'Site/21', [ 'Site/21', 'Site/1' ] ),
		'Site/25': entry( 'button', 'Site/1', [ 'Site/1' ] ), 'Site/26': entry( 'button', 'Site/1', [ 'Site/1' ] ), 'Site/27': entry( 'span', 'Site/1', [ 'Site/1' ] ),
		'Site/28': entry( 'span', 'Site/1', [ 'Site/1' ], [ { id: 'text#0', where: 'text', expr: 'ro.title', path: 'ro.title', whole: false } ] ),
		'Site/29': entry( 'a', 'Site/1', [ 'Site/1' ], [ { id: 'attr:title#0', where: 'attr:title', expr: 'ro.title', path: 'ro.title', whole: false } ] ),
		'Site/3': entry( 'div', 'Site/1', [ 'Site/1' ] ),
		'Site/4': entry( 'sc-if', 'Site/3', [ 'Site/3', 'Site/1' ] ),
		'Site/6': entry( 'form', 'Site/4', [ 'Site/4', 'Site/3', 'Site/1' ] ),
	},
} );
const LINKS = [ { recordId: 'S-2', slug: 'careers', block: 'sgs/form' } ];
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );

function run( o = {} ) {
	const d = draft( o.script );
	const factRecord = { ...RECORD( o.surfaces ), sources: d.record.sources };
	const f = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Planted' } );
	f.decisions = structuredClone( f.decisions );
	o.edit && o.edit( f.decisions.rules );
	return proposeSkeleton( { inventory: inventory(), facts: { ...f, repo: d.repo }, surface: 'careers', surfaceKind: 'page', surfaceName: 'Careers', db, rootComponent: 'Site', factRecord, formLinks: o.links ?? LINKS, refs: REFS, openers: {} } );
}
const buttonOf = ( r, n, copy ) => nodes( r.skeleton ).find( ( x ) => x.draftRef?.tpl === `Root/${ n }#${ copy }` );

test( 'MUST FAIL: each role button links the page\'s form with its own role and team, the query before the hash', () => {
	const r = run();
	assert.deepEqual( r.problems, [] );
	const links = [ 0, 1, 2 ].map( ( i ) => buttonOf( r, 24, i ).attributes );
	assert.deepEqual( links.map( ( a ) => a.label ), [ 'Apply for this role', 'Apply for this role', 'Apply for this role' ] );
	assert.deepEqual( links.map( ( a ) => a.url ), [
		'?role=Warehouse%20Operative&team=Warehouse%20%26%20logistics#careers',
		'?role=Driver&team=Warehouse%20%26%20logistics#careers',
		'?role=Sales%20Executive&team=Sales#careers',
	] );
	assert.equal( buttonOf( r, 24, 0 ).name, 'sgs/button' );
	assert.equal( r.proposal.rows.find( ( x ) => x.key === 'Root/24#1' ).rule, 'formPrefillOpener' );
	assert.equal( buttonOf( r, 25, 0 ).attributes.url, '?team=Sales#careers', 'a literal field is the same on every control' );
	assert.equal( buttonOf( r, 27, 0 ).attributes.url, undefined, 'only a button or link is a control, whatever its handler' );
} );

test( 'NEGATIVE: a handler that scrolls elsewhere, a page with no linked form, a copy that shows no value and the rule removed give no prefill link', () => {
	const r = run();
	assert.equal( r.proposal.rows.find( ( x ) => x.key === 'Root/26#0' ).rule, null, 'a scroll to the top is no form opener' );
	assert.equal( buttonOf( r, 26, 0 ).attributes.url, undefined );
	const noForm = run( { links: [] } );
	assert.equal( buttonOf( noForm, 24, 0 ).attributes.url, undefined, 'no linked form on the page, nothing to link to' );
	const off = run( { edit: ( R ) => delete R.formPrefillOpener } );
	assert.equal( buttonOf( off, 24, 0 ).attributes.url, undefined, 'the rule removed' );
	const inv = inventory();
	inv.elements.find( ( x ) => x.key === 'Root/23#1' ).words = '';
	const d = draft();
	const f = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Planted' } );
	const partial = proposeSkeleton( { inventory: inv, facts: { ...f, repo: d.repo }, surface: 'careers', surfaceKind: 'page', surfaceName: 'Careers', db, rootComponent: 'Site', factRecord: { ...RECORD(), sources: d.record.sources }, formLinks: LINKS, refs: REFS, openers: {} } );
	assert.equal( buttonOf( partial, 24, 1 ).attributes.url, '?role=Driver#careers', 'a field the copy shows no value for is left out' );
	assert.equal( buttonOf( partial, 24, 0 ).attributes.url, '?role=Warehouse%20Operative&team=Warehouse%20%26%20logistics#careers' );
} );

// The role values are read inside the control's own loop copy, never by copy number: a mounted card's elements all end `#0` (copy
// numbers count stampings per host), and a copy whose title an `sc-if` drops shifts the numbers of the copies after it.
const proposeWith = ( inv, entries = {} ) => {
	const d = draft();
	const f = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Planted' } );
	const record = RECORD();
	return proposeSkeleton( { inventory: inv, facts: { ...f, repo: d.repo }, surface: 'careers', surfaceKind: 'page', surfaceName: 'Careers', db, rootComponent: 'Site', factRecord: { ...record, elements: { ...record.elements, ...entries }, sources: d.record.sources }, formLinks: LINKS, refs: REFS, openers: {} } );
};
const EXPECTED = [ '?role=Warehouse%20Operative&team=Warehouse%20%26%20logistics#careers', '?role=Driver&team=Warehouse%20%26%20logistics#careers', '?role=Sales%20Executive&team=Sales#careers' ];

test( 'MUST FAIL: mounted cards whose element keys all end #0 each link their own role', () => {
	const inv = inventory();
	const rekey = ( k ) => k?.replace( /^Root\/(2[1-4])#(\d)$/, ( all, n, i ) => ( '21' === n ? `Root>Card@21#${ i }` : `Root>Card@21#${ i }/${ n }#0` ) );
	inv.elements.forEach( ( x ) => Object.assign( x, { key: rekey( x.key ), parentKey: rekey( x.parentKey ) } ) );
	const r = proposeWith( inv );
	const url = ( i ) => nodes( r.skeleton ).find( ( x ) => x.draftRef?.tpl === `Root>Card@21#${ i }/24#0` )?.attributes.url;
	assert.deepEqual( [ 0, 1, 2 ].map( url ), EXPECTED );
} );

test( 'MUST FAIL: a copy whose title an sc-if drops leaves its role out, and the copies after it keep their own', () => {
	const inv = inventory();
	inv.elements = inv.elements.filter( ( x ) => x.key !== 'Root/22#1' );
	Object.assign( inv.elements.find( ( x ) => x.key === 'Root/22#2' ), { key: 'Root/22#1' } );
	const r = proposeWith( inv );
	assert.deepEqual( [ 0, 1, 2 ].map( ( i ) => buttonOf( r, 24, i ).attributes.url ), [ EXPECTED[ 0 ], '?team=Warehouse%20%26%20logistics#careers', EXPECTED[ 2 ] ] );
} );

// A loop body of several top-level elements and no wrapper: each copy's title, team and button are siblings under the page, their
// template ids in source order. `buttonFirst` draws the button before the title and team, which then take the later ids 31 and 32.
const FIRST = {
	'Site/31': entry( 'h3', 'Site/1', [ 'Site/1' ], [ { id: 'text#0', where: 'text', expr: 'ro.title', path: 'ro.title', whole: false } ] ),
	'Site/32': entry( 'span', 'Site/1', [ 'Site/1' ], [ { id: 'text#0', where: 'text', expr: 'ro.team', path: 'ro.team', whole: false } ] ),
};
const unwrapped = ( buttonFirst = false ) => {
	const inv = inventory();
	const copies = inv.elements.filter( ( x ) => /^Root\/2[234]#/.test( x.key ) );
	copies.forEach( ( x ) => Object.assign( x, { parentKey: 'Root/1#0', depth: 1 } ) );
	buttonFirst && copies.filter( ( x ) => /^Root\/2[23]#/.test( x.key ) ).forEach( ( x ) => {
		const n = 22 === x.tpl ? 31 : 32;
		Object.assign( x, { key: x.key.replace( /^Root\/2[23]#/, `Root/${ n }#` ), tpl: n, snippet: x.snippet.replace( /data-dc-tpl="2[23]"/, `data-dc-tpl="${ n }"` ) } );
	} );
	const order = buttonFirst ? [ 24, 31, 32 ] : [ 22, 23, 24 ];
	const at = inv.elements.findIndex( ( x ) => x.key === 'Root/21#0' );
	const sorted = [ 0, 1, 2 ].flatMap( ( i ) => order.map( ( n ) => copies.find( ( x ) => x.key === `Root/${ n }#${ i }` ) ) );
	inv.elements = [ ...inv.elements.slice( 0, at ).filter( ( x ) => ! copies.includes( x ) ), ...sorted, ...inv.elements.slice( at ).filter( ( x ) => ! copies.includes( x ) && ! /^Root\/21#/.test( x.key ) ) ];
	return inv;
};

test( 'MUST FAIL: a loop body of several top-level elements (no wrapper) links each button with the title and team of its own copy, whether the button comes last or first', () => {
	const urls = ( inv, entries ) => {
		const r = proposeWith( inv, entries );
		return [ 0, 1, 2 ].map( ( i ) => buttonOf( r, 24, i )?.attributes.url );
	};
	const without = ( inv, key ) => Object.assign( inv, { elements: inv.elements.filter( ( x ) => x.key !== key ) } );
	const team = ( i ) => `?team=${ 2 === i ? 'Sales' : 'Warehouse%20%26%20logistics' }#careers`;
	assert.deepEqual( urls( unwrapped() ), EXPECTED, 'the button last: the title and team before it are its copy\'s' );
	assert.deepEqual( urls( unwrapped( true ), FIRST ), EXPECTED, 'the button first: the title and team after it are its copy\'s' );
	assert.deepEqual( urls( without( unwrapped(), 'Root/22#1' ) ), [ EXPECTED[ 0 ], team( 1 ), EXPECTED[ 2 ] ], 'NEGATIVE: a copy whose title an sc-if drops takes no title from its neighbours' );
	assert.deepEqual( urls( without( unwrapped(), 'Root/22#0' ) ), [ team( 0 ), EXPECTED[ 1 ], EXPECTED[ 2 ] ], 'the first copy\'s title dropped: the copies after it keep their own' );
	assert.deepEqual( urls( without( unwrapped(), 'Root/24#0' ) ), [ undefined, EXPECTED[ 1 ], EXPECTED[ 2 ] ], 'the first copy has no button: the second copy takes its own title, not the first\'s' );
	assert.deepEqual( urls( without( unwrapped( true ), 'Root/31#0' ), FIRST ), [ team( 0 ), EXPECTED[ 1 ], EXPECTED[ 2 ] ], 'the button first and the first copy\'s title dropped' );
	// The card wraps its button in a footer: the copy is the whole card (the control's outermost ancestor in the loop), not the footer.
	const footed = inventory();
	[ 0, 1, 2 ].forEach( ( i ) => {
		const button = footed.elements.find( ( x ) => x.key === `Root/24#${ i }` );
		footed.elements.splice( footed.elements.indexOf( button ), 0, el( 30, i, [ 21, i ], 'div', '', { loop: true, depth: 2 } ) );
		Object.assign( button, { parentKey: `Root/30#${ i }`, depth: 3 } );
	} );
	assert.deepEqual( urls( footed ), EXPECTED, 'a button in the card\'s footer' );
} );

// A loop body whose top-level elements are sc-if alternatives: each copy draws one card, and the second copy's variant has its own,
// higher template ids (41 to 44). Ids rise from the first copy's card to the second's, so the run around the second card takes in the
// first; the second button still reads its own card's title and team.
test( 'MUST FAIL: a copy drawn by an sc-if alternative with higher template ids reads its own card, not the lower-numbered card before it', () => {
	const inv = inventory();
	const variant = { 21: 41, 22: 42, 23: 43, 24: 44 };
	inv.elements.filter( ( x ) => /^Root\/2[1-4]#1$/.test( x.key ) ).forEach( ( x ) => {
		const n = variant[ x.tpl ];
		Object.assign( x, { key: `Root/${ n }#1`, tpl: n, parentKey: 'Root/21#1' === x.parentKey ? 'Root/41#1' : x.parentKey, snippet: x.snippet.replace( /data-dc-tpl="\d+"/, `data-dc-tpl="${ n }"` ) } );
	} );
	const hole = ( path ) => [ { id: 'text#0', where: 'text', expr: path, path, whole: false } ];
	const entries = {
		'Site/41': entry( 'div', 'Site/1', [ 'Site/1' ] ),
		'Site/42': entry( 'h3', 'Site/41', [ 'Site/41', 'Site/1' ], hole( 'ro.title' ) ),
		'Site/43': entry( 'span', 'Site/41', [ 'Site/41', 'Site/1' ], hole( 'ro.team' ) ),
		'Site/44': entry( 'button', 'Site/41', [ 'Site/41', 'Site/1' ] ),
	};
	const r = proposeWith( inv, entries );
	assert.deepEqual( [ buttonOf( r, 24, 0 ), buttonOf( r, 44, 1 ), buttonOf( r, 24, 2 ) ].map( ( b ) => b?.attributes.url ), EXPECTED );
} );

test( 'NEGATIVE: inside the copy, an attribute printing the item path is no value, and a copy stops at the control\'s own loop (cards grouped by an outer loop)', () => {
	const inv = inventory();
	const OUTER = { kind: 'sc-for', list: '{{ groups }}', as: 'g', tpl: '98' };
	const at = inv.elements.findIndex( ( x ) => x.key === 'Root/21#0' );
	inv.elements.splice( at, 0, el( 20, 0, [ 1, 0 ], 'div', '', { membership: [ OUTER ] } ) );
	inv.elements.filter( ( x ) => /^Root\/2[1-4]#/.test( x.key ) ).forEach( ( x ) => Object.assign( x, { membership: [ OUTER, ...FOR ] }, x.key.startsWith( 'Root/21#' ) ? { parentKey: 'Root/20#0' } : {} ) );
	[ 0, 1, 2 ].forEach( ( i ) => inv.elements.splice( inv.elements.findIndex( ( x ) => x.key === `Root/22#${ i }` ), 0, el( 29, i, [ 21, i ], 'a', 'WRONG attribute', { loop: true, depth: 2 } ) ) );
	inv.elements = inv.elements.filter( ( x ) => x.key !== 'Root/29#0' || x.parentKey === 'Root/21#0' );
	const r = proposeWith( inv );
	assert.deepEqual( [ 0, 1, 2 ].map( ( i ) => buttonOf( r, 24, i ).attributes.url ), EXPECTED );
} );

test( 'MUST FAIL: the saved form\'s root carries the anchor its page links to, from the slug the page\'s linked block references', () => {
	const formInventory = { generated: 'x', source: 'planted', root: 'form', keyFormat: 'x', checks: { duplicateKeys: 0 }, elements: [ el( 6, 0, null, 'form', '', { depth: 0 } ), el( 7, 0, [ 6, 0 ], 'input', '', { attrs: { type: 'text' } } ) ] };
	const d = draft();
	const f = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Planted' } );
	const record = { ...RECORD(), sources: d.record.sources };
	const of = ( links ) => proposeSkeleton( { inventory: formInventory, facts: { ...f, repo: d.repo }, surface: 'apply', surfaceKind: 'form', surfaceName: 'Apply', db, rootComponent: 'Site', factRecord: record, formLinks: links, refs: REFS, openers: {}, surfaceId: 'S-2' } );
	const root = of( LINKS ).skeleton[ 0 ];
	assert.equal( root.name, 'sgs/form' );
	assert.equal( root.attributes.anchor, 'careers' );
	assert.equal( of( [] ).skeleton[ 0 ].attributes.anchor, undefined, 'a form no page links to has no anchor' );
	assert.equal( of( [ { recordId: 'S-9', slug: 'other', block: 'sgs/form' } ] ).skeleton[ 0 ].attributes.anchor, undefined, 'another form\'s link names another record' );
} );

test( 'MUST FAIL: a select whose name a form opener sets carries valueFromParam; a field no opener sets, and a run with no draft folder, do not', () => {
	const d = draft();
	const node = ( name, attributes, ref ) => ( { name, attributes, innerBlocks: [], ref } );
	const flat = [ node( 'sgs/form-field-select', { label: 'Role' }, 'role' ), node( 'sgs/form-field-select', { label: 'Size' }, 'size' ) ];
	const nodesList = flat.map( ( n, i ) => ( { index: i, name: n.name, targets: [ { id: `${ i }:`, slot: '', finder: { tpl: `Root/${ 30 + i }#0` } } ] } ) );
	const sel = ( name ) => ( { form: { tag: 'select', name, options: [ { value: '', label: 'Choose' }, { value: 'a', label: 'A' } ] } } );
	const reads = { widths: { 1440: { '0:': sel( 'role' ), '1:': sel( 'size' ) } } };
	const facts = { elements: {}, sources: d.record.sources };
	const written = ( out, ref ) => Object.fromEntries( out.writes.filter( ( w ) => w.node === ref ).map( ( w ) => [ w.attr, w.after ] ) );
	const out = formWrites( { nodes: nodesList, flat, refOf: ( n ) => n.ref, reads, facts, db, folder: d.folder, component: 'Site' } );
	assert.equal( written( out, 'role' ).valueFromParam, 'role' );
	assert.equal( written( out, 'size' ).valueFromParam, undefined );
	const bare = formWrites( { nodes: nodesList, flat, refOf: ( n ) => n.ref, reads, facts, db, component: 'Site' } );
	assert.equal( written( bare, 'role' ).valueFromParam, undefined, 'no draft folder to read the opener from' );
} );

test( 'MUST FAIL: a form in another component of the draft takes no valueFromParam from the opener of this page', () => {
	const d = draft();
	const text = '<x-dc name="Apply"><form><select name="role"></select></form></x-dc>\n';
	fs.writeFileSync( path.join( d.folder, 'Apply.dc.html' ), text );
	const sources = { files: { ...d.record.sources.files, 'Apply.dc.html': crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) } };
	const flat = [ { name: 'sgs/form-field-select', attributes: { label: 'Role' }, innerBlocks: [], ref: 'role' } ];
	const nodesList = [ { index: 0, name: flat[ 0 ].name, targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/30#0' } } ] } ];
	const reads = { widths: { 1440: { '0:': { form: { tag: 'select', name: 'role', options: [ { value: '', label: 'Choose' }, { value: 'a', label: 'A' } ] } } } } };
	const run = ( component ) => formWrites( { nodes: nodesList, flat, refOf: ( n ) => n.ref, reads, facts: { elements: {}, sources }, db, folder: d.folder, component } );
	const param = ( out ) => out.writes.find( ( w ) => 'role' === w.node && 'valueFromParam' === w.attr )?.after;
	assert.equal( param( run( 'Apply' ) ), undefined, 'the Apply form is not on the page whose opener sets role' );
	assert.equal( param( run( 'Site' ) ), 'role', 'negative control: the form on the page of the opener takes it' );
} );

test( 'MUST FAIL: through Fill\'s own arguments (the served page\'s component), a form imported from its own draft file takes no valueFromParam from the page\'s opener; the page\'s inline form does', () => {
	const d = draft();
	const text = '<x-dc name="Apply"><form><select name="role"></select></form></x-dc>\n';
	fs.writeFileSync( path.join( d.folder, 'Apply.dc.html' ), text );
	const sources = { files: { ...d.record.sources.files, 'Apply.dc.html': crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) } };
	const sel = { form: { tag: 'select', name: 'role', options: [ { value: '', label: 'Choose' }, { value: 'a', label: 'A' } ] } };
	// The field's finder chain is the inventory key's: `Root>Apply@…` inside the imported child, `Root/…` on the page itself.
	const run = ( tpl ) => {
		const flat = [ { name: 'sgs/form-field-select', attributes: { label: 'Role' }, innerBlocks: [], ref: 'role' } ];
		const nodesList = [ { index: 0, name: flat[ 0 ].name, targets: [ { id: '0:', slot: '', finder: { tpl } } ] } ];
		// fill.mjs passes `component: intakeParts.rootComponent`, the served page's component (here Site), never the form's.
		const out = formWrites( { nodes: nodesList, flat, refOf: ( n ) => n.ref, reads: { widths: { 1440: { '0:': sel } } }, facts: { elements: {}, sources }, db, folder: d.folder, component: 'Site' } );
		return out.writes.find( ( w ) => 'role' === w.node && 'valueFromParam' === w.attr )?.after;
	};
	assert.equal( run( 'Root>Apply@466#0/30#0' ), undefined, 'the imported Apply form is not where the page\'s opener scrolls' );
	assert.equal( run( 'Root/30#0' ), 'role', 'negative control: the page\'s inline form takes it' );
	assert.ok( fs.readFileSync( path.join( REPO, 'scripts/computed-route/fill.mjs' ), 'utf8' ).includes( 'component: intakeParts.rootComponent, idxFor, folder: draftFolder }' ), 'Fill passes the served page\'s component' );
} );

test( 'MUST FAIL: a field built from the schema for a step the page never rendered (no target of its own) reads the openers of its enclosing form\'s component', () => {
	const d = draft();
	const text = '<x-dc name="Apply"><form><select name="role"></select></form></x-dc>\n';
	fs.writeFileSync( path.join( d.folder, 'Apply.dc.html' ), text );
	const sources = { files: { ...d.record.sources.files, 'Apply.dc.html': crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) } };
	const schema = [ { label: 'You', fields: [ { name: 'role', label: 'Role', options: [ 'Driver', 'Sales' ] } ] } ];
	const facts = { elements: {}, sources, logic: { statics: { Apply: { entries: [ { name: 'schema', kind: 'array', value: schema } ] }, Site: { entries: [ { name: 'schema', kind: 'array', value: schema } ] } } } };
	const run = ( tpl ) => {
		const flat = [ { name: 'sgs/form', attributes: {}, innerBlocks: [], ref: 'form' }, { name: 'sgs/form-field-select', attributes: { label: 'Role', fieldName: 'role' }, innerBlocks: [], ref: 'role' } ];
		const nodesList = [ { index: 0, name: 'sgs/form', parent: null, targets: [ { id: '0:', slot: '', finder: { tpl } } ] }, { index: 1, name: 'sgs/form-field-select', parent: 0, targets: [] } ];
		const out = formWrites( { nodes: nodesList, flat, refOf: ( n ) => n.ref, reads: { widths: { 1440: {} } }, facts, db, folder: d.folder, component: 'Site' } );
		return out.writes.find( ( w ) => 'role' === w.node && 'valueFromParam' === w.attr )?.after;
	};
	assert.equal( run( 'Root>Apply@466#0/6#0' ), undefined, 'the built role field of the imported Apply form is not where the page\'s opener scrolls' );
	assert.equal( run( 'Root/6#0' ), 'role', 'negative control: the built role field of the page\'s inline form takes it' );
} );

test( 'NEGATIVE: the standing decisions stay valid with the rule', () => {
	const f = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO } );
	assert.deepEqual( decisionsProblems( f ), [] );
	assert.equal( f.decisions.rules.formPrefillOpener.block, 'sgs/button' );
} );
