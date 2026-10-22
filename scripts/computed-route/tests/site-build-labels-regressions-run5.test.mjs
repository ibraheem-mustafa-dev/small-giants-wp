// Bug-hunter run 5, lib/site-build-labels.mjs::routeOf (reached through labelRoutes): a href's query, fragment and spaces never change its route,
// and a protocol-relative href is external.
import test from 'node:test';
import assert from 'node:assert/strict';
import { labelRoutes } from '../lib/site-build-labels.mjs';

const str = ( value ) => ( { type: 'StringLiteral', value } );
const id = ( name ) => ( { type: 'Identifier', name } );
const routeFor = ( href ) => {
	const node = { type: 'ObjectExpression', properties: [
		{ type: 'ObjectProperty', key: id( 'label' ), value: str( 'L' ) },
		{ type: 'ObjectProperty', key: id( 'href' ), value: str( href ) },
	] };
	return labelRoutes( [ { idx: { all: [ node ] } } ] ).get( 'L' );
};

test( 'MUST FAIL (query and fragment): they are cut from the route', () => {
	assert.equal( routeFor( '#/contact?x=1' ), 'contact' );
	assert.equal( routeFor( '/about#team' ), 'about' );
} );

test( 'MUST FAIL (whitespace): a href is trimmed', () => {
	assert.equal( routeFor( ' /x' ), 'x' );
} );

test( 'MUST FAIL (protocol-relative): an external link has no route', () => {
	assert.equal( routeFor( '//cdn.example.com/docs' ), undefined );
} );

test( 'plain routes are unchanged', () => {
	assert.equal( routeFor( '#/contact' ), 'contact' );
	assert.equal( routeFor( '/' ), 'home' );
	assert.equal( routeFor( 'https://x.com/a' ), undefined );
} );
