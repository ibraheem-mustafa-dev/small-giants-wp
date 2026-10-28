// The walker check (lib/walker-check.mjs, run by `state-map.mjs --check-walkers <client>`): a surface's mapped states
// that its walker config does not walk, and a walker file a surface names that does not exist, are faults; a state the
// generated config lists as unwalked, with its reason, is reported apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { checkWalkers } from '../lib/walker-check.mjs';

const DIR = path.join( import.meta.dirname, 'fixtures', 'walker-check' );
const surfaces = () => JSON.parse( fs.readFileSync( path.join( DIR, 'surfaces.json' ), 'utf8' ) );

test( 'MUST FAIL: a missing walker file is a fault, a walked or listed-unwalked state is not, and a surface with no walker is not checked', async () => {
	const r = await checkWalkers( surfaces(), DIR );
	assert.deepEqual( r.faults, [ 'cart: walker file qa/parity/cart.fill-base.mjs does not exist' ] );
	assert.deepEqual( r.unwalked, [ 'header: rail-moved is not walked: no usable state key and no setState call in its how_to_reach' ] );
	assert.equal( r.checked, 3 );
} );

test( 'MUST FAIL: a mapped state the config neither walks nor lists is a fault (negative control: the same map with it removed is clean)', async () => {
	const s = surfaces();
	delete s.cart;
	s.header.states[ 'signed-in' ] = null;
	s.home.states[ 'with-account' ] = null;
	assert.deepEqual( ( await checkWalkers( s, DIR ) ).faults, [ 'header: signed-in is mapped but qa/parity/header.fill.mjs does not walk it', 'home: with-account is mapped but qa/parity/home.fill-base.mjs does not walk it' ] );
	delete s.header.states[ 'signed-in' ];
	delete s.home.states[ 'with-account' ];
	assert.deepEqual( ( await checkWalkers( s, DIR ) ).faults, [] );
} );
