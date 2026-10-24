// The UNMAPPED table of fill-report.md names the state each row was read in, as fill-report.json already does: a reader of
// the report sees `hover` on the burger's hover rows instead of an empty cell (lib/fill-report.mjs::fillReport).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillReport } from '../lib/fill-report.mjs';

const row = ( state, reason ) => ( { property: 'color', value: '{"375":"rgb(10, 126, 168)"}', node: 'cr-ref-header-16', block: 'sgs/nav-bar-menu', slot: '.bar', state, reason } );
const report = ( unmapped ) => fillReport( { client: 'c', surface: 's', draft: 'd', nodes: 1, targets: 1, writes: [], unmapped, notes: [], handover: [], spacing: [], fluid: [], held: [], snaps: [], steps: [], entrances: [] } );
const unmappedTable = ( md ) => md.split( '## UNMAPPED' )[ 1 ].split( '## Already held' )[ 0 ];

test( 'MUST FAIL: an UNMAPPED row read in a state shows the state in the markdown table, a rest row an empty cell', () => {
	const t = unmappedTable( report( [ row( 'hover', 'default-state: sgs/nav-bar-menu changes color on hover by itself' ), row( null, 'no-setting: rest row' ) ] ).markdown );
	assert.match( t, /\| Property \| Value \| State \| Node \| Block \| Element \| Reason \|/ );
	assert.match( t, /\| color \| \{"375":"rgb\(10, 126, 168\)"\} \| hover \| cr-ref-header-16 \| sgs\/nav-bar-menu \| \.bar \| default-state:/ );
	assert.match( t, /\| color \| \{"375":"rgb\(10, 126, 168\)"\} \| {2}\| cr-ref-header-16 \| sgs\/nav-bar-menu \| \.bar \| no-setting: rest row/ );
} );

test( 'the json list keeps each row\'s state beside the markdown table (negative control: nothing is invented for a rest row)', () => {
	const { json } = report( [ row( 'open', 'script-look: open' ), row( null, 'no-setting: rest row' ) ] );
	assert.deepEqual( json.unmapped.map( ( u ) => u.state ), [ 'open', null ] );
} );
