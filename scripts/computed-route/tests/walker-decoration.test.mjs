// Proves the walker stamps an underline row with the element that paints the underline (Spec 47 Session D, brief check
// (c)). collect.mjs reads text-decoration-* as the decoration a visitor sees on the text (paint.mjs::paintedDecoration:
// the nearest decorated element at or above the text carrier), but stampRefs gave those rows the pair element's own path,
// so a footer link's underline (on the <a> inside an sgs/text <p>) read as the block root's and Solve wrote the root's
// textDecoration, which cannot reach the link (footer 2026-10-09: footer-29, -30, -31 hardcode).
import test from 'node:test';
import assert from 'node:assert/strict';
import { stampRefs } from '../../parity/lib/ref-trace.mjs';

const trace = () => ( { ref: 'cr-ref-footer-30', block: 'sgs-text', path: '', textPath: 'a', decoPath: 'a', layoutPath: '', owners: [
	{ ref: 'cr-ref-footer-29', block: 'sgs-container', path: '.sgs-container__inner > p', textPath: '.sgs-container__inner > p > a', decoPath: '.sgs-container__inner > p > a', layoutPath: '.sgs-container__inner' },
] } );

test( 'MUST FAIL: an underline row is stamped with the path of the element painting the underline', () => {
	const rows = [ 'text-decoration-line', 'text-decoration-color', 'text-decoration-thickness' ].map( ( key ) => ( { kind: 'style', key, draft: 'none', live: 'underline' } ) );
	stampRefs( rows, trace() );
	rows.forEach( ( r ) => assert.equal( r.path, 'a', r.key ) );
	assert.equal( rows[ 0 ].owners[ 0 ].path, '.sgs-container__inner > p > a' );
} );

test( 'negative control: colour keeps the text path and padding the element path', () => {
	const rows = [ { kind: 'style', key: 'color', draft: 'a', live: 'b' }, { kind: 'style', key: 'padding-top', draft: '0px', live: '4px' } ];
	stampRefs( rows, trace() );
	assert.equal( rows[ 0 ].path, 'a' );
	assert.equal( rows[ 1 ].path, '' );
} );

test( 'no decorated element (decoPath null): the row keeps the element path', () => {
	const rows = [ { kind: 'style', key: 'text-decoration-line', draft: 'underline', live: 'none' } ];
	stampRefs( rows, { ...trace(), decoPath: null } );
	assert.equal( rows[ 0 ].path, '' );
} );
