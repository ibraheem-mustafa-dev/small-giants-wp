// A form record naming a lone control (Spec 48 FR-48-57; Bean 2026-10-30): the surface a form record names is the control's
// holder, the nearest element above it that renders, so it reads what the visitor fills in beside the control
// (lib/intake-skeletons.mjs::surfaceRoots). MUST FAIL: a form record naming its submit link roots at the card holding it,
// past the runtime's sc-if; negative controls: a form record naming a card, a modal record naming a link, a census with no
// parent recorded, and a control straight in the page's <main> keep the record's root.
import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceRoots } from '../lib/intake-skeletons.mjs';

const row = ( n, tag, parent ) => ( { kind: 'template-element', draftId: `Page:${ n }`, component: 'Page', detail: { tag, inFor: false, ...( undefined === parent ? {} : { parent } ) } } );
const CENSUS = { rows: [ row( 2, 'main', null ), row( 3, 'div', '2' ), row( 4, 'input', '3' ), row( 5, 'sc-if', '3' ), row( 6, 'a', '5' ), row( 7, 'a', '2' ) ] };
const rootOf = ( record, census = CENSUS ) => surfaceRoots( { folder: '.', census, records: [ { id: 'S-1', name: 'Finder', dc: 'Page', route: 'Page.dc.html', ...record } ], files: new Set( [ 'Page.dc.html' ] ) } ).surfaces[ 0 ]?.rootTpl;

test( 'MUST FAIL: a form record naming a lone link roots at the card holding the link and the field beside it', () => {
	assert.equal( rootOf( { kind: 'form', template_tpl_id: '6' } ), '3' );
	assert.equal( rootOf( { kind: 'form', template_tpl_id: '4' } ), '3', 'a lone field is held the same way' );
	// Negative controls.
	assert.equal( rootOf( { kind: 'form', template_tpl_id: '3' } ), '3', 'a record naming the card keeps it' );
	assert.equal( rootOf( { kind: 'modal', template_tpl_id: '6' } ), '6', 'only a form record names less than its surface' );
	assert.equal( rootOf( { kind: 'form', template_tpl_id: '7' } ), '7', 'a control straight in the page\'s <main> keeps its root: the page is no form' );
	const bare = { rows: CENSUS.rows.map( ( r ) => ( { ...r, detail: { tag: r.detail.tag, inFor: false } } ) ) };
	assert.equal( rootOf( { kind: 'form', template_tpl_id: '6' }, bare ), '6', 'a census with no parent recorded leaves the record\'s root' );
} );
