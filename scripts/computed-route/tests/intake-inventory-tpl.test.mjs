// Spec 48 FR-48-25, the template and stylesheet records (lib/intake-inventory-tpl.mjs::templateRecords) on a census
// written here (no browser): a value driven by an ancestor's style-hover custom property, and a reduced-motion record
// that lists every declaration of the matched @media block.
import test from 'node:test';
import assert from 'node:assert/strict';
import { templateRecords } from '../lib/intake-inventory-tpl.mjs';

const run = ( census ) => {
	const records = [];
	const add = ( prefix, record ) => {
		records.push( { prefix, ...record } );
		return records[ records.length - 1 ];
	};
	add.map = () => {};
	templateRecords( census, add );
	return records;
};

test( 'a transition on a var() value changed by an ancestor style-hover is a hover trigger with the resolved value', () => {
	const census = {
		sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic: '', stamped: { elements: [
			{ n: '1', parent: null, tag: 'button', attrs: [ [ 'style', 'color:red' ], [ 'style-hover', '--cr:6px;--lx:5px' ] ], texts: [] },
			{ n: '2', parent: '1', tag: 'span', attrs: [ [ 'style', 'transform:translateX(var(--lx,0px));transition:transform .35s ease;' ] ], texts: [] },
		] } } ],
		rows: [ { id: 't@App:2', kind: 'transition', component: 'App', draftId: 'App:2', detail: { via: 'style', property: 'transition', value: 'transform .35s ease' } } ],
	};
	const rec = run( census ).find( ( r ) => 'TR' === r.prefix );
	assert.equal( rec.trigger.type, 'hover', JSON.stringify( rec.trigger ) );
	assert.match( rec.trigger.detail, /--lx/ );
	assert.equal( rec.properties[ 0 ].to, 'translateX(5px)' );
} );

test( 'a reduced-motion record lists every declaration of the matched @media block, not only the motion rows', () => {
	const body = '@media (prefers-reduced-motion: reduce) { * { transition-duration: .01ms !important; scroll-behavior: auto !important; } }';
	const census = {
		sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic: '', stamped: { elements: [ { n: '1', parent: null, tag: 'sc-helmet', attrs: [], texts: [], body } ] } } ],
		rows: [ { id: 't@App:1', kind: 'transition', component: 'App', draftId: 'App:1', detail: { via: 'stylesheet', selector: '*', property: 'transition-duration', value: '.01ms !important' } } ],
	};
	const rm = run( census ).find( ( r ) => 'RM' === r.prefix );
	const names = rm.properties.map( ( p ) => p.property );
	assert.deepEqual( names, [ 'transition-duration', 'scroll-behavior' ] );
} );
