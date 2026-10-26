// A local mirror reads its test site's per-site records (lib/cache.mjs::recordSite): its database is a copy of that site,
// so the media map's attachments and the menu map's menu ids are the test site's (a site run on a mirror, 2026-10-26).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { recordSite } from '../lib/cache.mjs';
import { mediaEntry } from '../lib/skeleton-carried.mjs';
import { mapEntries } from '../lib/fill-media.mjs';

const targets = JSON.parse( fs.readFileSync( new URL( '../calibration-targets.json', import.meta.url ), 'utf8' ) );
const [ mirror, { mirrorOf: site } ] = Object.entries( targets ).find( ( [ , t ] ) => t.mirrorOf );

test( 'MUST FAIL: a mirror reads its test site\'s records; any other site reads its own', () => {
	assert.equal( recordSite( mirror ), site );
	assert.equal( recordSite( site ), site );
	assert.equal( recordSite( 'no-such-site' ), 'no-such-site' );
} );

test( 'MUST FAIL: the logo lookup and Fill\'s media find the test site\'s attachment from the mirror', () => {
	const folder = fs.mkdtempSync( path.join( os.tmpdir(), 'record-site-' ) );
	fs.writeFileSync( path.join( folder, 'logo.png' ), 'png bytes' );
	const sha256 = crypto.createHash( 'sha256' ).update( fs.readFileSync( path.join( folder, 'logo.png' ) ) ).digest( 'hex' );
	const map = { sites: { [ site ]: { files: [ { asset: 'sites/x/handoff/logo.png', sha256, id: 91 } ] } } };
	assert.deepEqual( mediaEntry( { map, site: mirror, repo: folder, folder, file: 'logo.png' } ), { id: 91, asset: 'sites/x/handoff/logo.png' } );
	assert.equal( mapEntries( map, mirror, 'logo.png' ).length, 1 );
} );
