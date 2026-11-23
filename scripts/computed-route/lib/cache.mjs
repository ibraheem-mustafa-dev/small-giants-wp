// What a reader works from for one block (§3.2): the setting record and the client's site look, in the keys the route
// reads (lib/setting-record.mjs::loadRecord), and the site whose per-site records a site reads. The browser-measured
// calibration this module used to read and write is retired: the setting record and the site look are built offline.
import fs from 'fs';
import { readTargets } from './site-targets.mjs';
import { loadRecord, recordFixtureFile, readRecordFixture } from './setting-record.mjs';

let siteTargets = null;
const targetsNow = () => ( siteTargets ||= readTargets() );

// The site whose records `site` uses: the test site a mirror copies (`mirrorOf`), else the site itself. `targets` defaults
// to both targets files (lib/site-targets.mjs::readTargets), read once.
export function paintSite( site, targets = targetsNow() ) {
	return ( Object.hasOwn( targets, String( site ) ) && targets[ site ].mirrorOf ) || site;
}

// The site whose per-site records (the media map's attachments) `site` reads: a mirror's database is a copy of the test
// site it mirrors (refreshed from it), so it reads that site's records. The menu map and the catalogue are also read here,
// under the site's own record first (lib/skeleton-carried.mjs::carriedIds), because the site build records what it made on
// a mirror under the mirror's own name.
export const recordSite = paintSite;

// What a reader works from for one block in one client's look: the setting record and the site look built from the
// client's theme snapshot (lib/setting-record.mjs::loadRecord). `dir` is read only for a test's fixture record
// (writeRecordFixture); the record is in the framework database and the site look in scripts/computed-route/site-look.
// Null when the block has no record.
export function loadCalibration( dir, block, client ) {
	if ( dir && fs.existsSync( recordFixtureFile( dir, block, client ) ) ) {
		return readRecordFixture( dir, block, client || null );
	}
	return loadRecord( block, client || null );
}
