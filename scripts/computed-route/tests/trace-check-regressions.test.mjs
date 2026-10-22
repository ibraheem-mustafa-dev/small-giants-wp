// The trace check's event matching, run through the module trace-check.mjs itself imports: an event with no nearest
// template id is keyed '-', so it never matches a record whose template id is null.
import test from 'node:test';
import assert from 'node:assert/strict';
import { eventKey, matchFor } from '../lib/trace-match.mjs';

test( 'an event with no nearest template id matches no record with a null template id', () => {
	const recs = [ { duration_ms: 300, element: { template_tpl_id: null } } ];
	assert.equal( eventKey( { kind: 'waapi', tpl: null, near: null, dur: 300 } ), 'waapi|-|-|300' );
	assert.equal( matchFor( eventKey( { kind: 'waapi', tpl: 'tpl-7', near: null, dur: 300 } ), recs ), undefined );
} );

test( 'an event with a template id still matches the record that names it', () => {
	const recs = [ { duration_ms: 300, element: { template_tpl_id: 'tpl-7' } } ];
	assert.equal( matchFor( eventKey( { kind: 'waapi', tpl: 'tpl-7', near: null, dur: 300 } ), recs ), recs[ 0 ] );
} );

test( 'the shift moves every record duration', () => {
	const recs = [ { duration_ms: 300, element: { template_tpl_id: 'tpl-7' } } ];
	assert.equal( matchFor( 'waapi|tpl-7|-|307', recs, 7 ), recs[ 0 ] );
	assert.equal( matchFor( 'waapi|tpl-7|-|300', recs, 7 ), undefined );
} );
