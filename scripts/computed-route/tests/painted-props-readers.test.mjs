// A setting entry holds every property it paints in `properties` and its first in `property` (lib/css-families.mjs::paintedProps),
// so every reader goes through paintedProps: a reader that matches `entry.property` sees only the first property of a `height,width`
// setting. tools/check-painted-props.mjs parses the route's source and lists each read of a calibration entry's `.property` that
// is not an existence test or marked `painted-props-exempt`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanRoute, scanSource, selfTest } from '../tools/check-painted-props.mjs';

test( 'MUST FAIL: no reader of a calibration or record setting entry matches its first `.property` only', () => {
	const found = scanRoute();
	assert.deepEqual( found.map( ( f ) => `${ f.file }:${ f.line } ${ f.text }` ), [] );
} );

test( 'MUST FAIL: the detector flags each shape of a read it exists for and passes the routed and exempt ones', () => {
	assert.deepEqual( selfTest(), [] );
} );

test( 'the detector reports where a read is, so a reader that goes back to `.property` names its file and line', () => {
	const [ hit ] = scanSource( 'const a = 1;\nObject.values( cal.settings ).filter( ( s ) => "x" === s.property );', 'lib/x.mjs' );
	assert.deepEqual( { file: hit.file, line: hit.line }, { file: 'lib/x.mjs', line: 2 } );
} );
