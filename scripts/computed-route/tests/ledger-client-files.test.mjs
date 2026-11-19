// Every client's divergence ledger (sites/<client>/build/qa/divergences.json) passes lib/ledger.mjs::validate, so a hand edit
// naming a rule the route does not know fails here instead of stopping Fill mid-run. Indus's ledger named "bean-ruling",
// "draft-placeholder" and "draft" (2026-11-02 to 11-08), which RULES never held, and Fill stopped on Home and the header
// (2026-11-19). Reads files only; contacts no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validate } from '../lib/ledger.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const SITES = path.join( REPO, 'sites' );
const ledgers = fs.readdirSync( SITES ).map( ( c ) => path.join( SITES, c, 'build', 'qa', 'divergences.json' ) ).filter( ( f ) => fs.existsSync( f ) );

test( 'MUST FAIL: every client ledger names only rules the route knows and has every key an entry needs', () => {
	assert.ok( ledgers.length > 0 );
	for ( const f of ledgers ) {
		assert.doesNotThrow( () => validate( JSON.parse( fs.readFileSync( f, 'utf8' ) ) ), path.relative( REPO, f ) );
	}
} );

test( 'negative control: an entry naming an unknown rule is refused', () => {
	const entry = { id: 'D-1', scope: 'home', node: '*', state: '*', property: 'color', expected: { rule: 'bean-ruling' }, reason: 'x', decided: '2026-11-19 test' };
	assert.throws( () => validate( [ entry ] ), /unknown rule "bean-ruling"/ );
	assert.doesNotThrow( () => validate( [ { ...entry, expected: { rule: 'bean-choice' } } ] ) );
} );
