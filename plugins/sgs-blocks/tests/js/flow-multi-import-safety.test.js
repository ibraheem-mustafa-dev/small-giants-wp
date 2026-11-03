/**
 * The buy box "Pick a set" mode imports parseLimits, canAddAnswer and meetsLeast from flow-multi.js
 * (.claude/plans/2026-11-03-buybox-configurator.md section 8). Importing must be side-effect free and
 * must leave the choice-flow lens flow unchanged: flow-multi.js pulls in only the selector constants,
 * runs no code at load, and the lens flow's own suite (choice-flow-multi.test.js) stays green.
 */
import fs from 'fs';
import path from 'path';
import { parseLimits, canAddAnswer, meetsLeast } from '../../src/blocks/choice-flow/flow-multi.js';

const SOURCE = fs.readFileSync( path.join( __dirname, '../../src/blocks/choice-flow/flow-multi.js' ), 'utf8' );

describe( 'importing the limit rules from flow-multi.js', () => {
	test( 'flow-multi.js imports only the selector constants, so the import adds no behaviour', () => {
		const imports = SOURCE.match( /^import .+$/gm ) || [];
		expect( imports ).toHaveLength( 1 );
		expect( imports[ 0 ] ).toContain( './flow-constants.js' );
	} );

	test( 'the three pure rules keep their contract for both blocks', () => {
		expect( parseLimits( '1', '3' ) ).toEqual( { min: 1, max: 3 } );
		expect( parseLimits( '3', '3' ) ).toEqual( { min: 3, max: 3 } );
		expect( parseLimits( null, '1' ) ).toEqual( { min: 1, max: 1 } );
		expect( canAddAnswer( 2, 3 ) ).toBe( true );
		expect( canAddAnswer( 3, 3 ) ).toBe( false );
		expect( meetsLeast( 3, 3 ) ).toBe( true );
		expect( meetsLeast( 2, 3 ) ).toBe( false );
	} );
} );
