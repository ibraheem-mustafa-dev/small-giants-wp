// The calibration cache (§3.2): one library-wide folder, one file per block, whichever site measured it. A block
// calibrated on one site is never replaced by a run on another site unless the run asks for it (--recalibrate).
import fs from 'fs';
import path from 'path';

// The site a block's cache file was measured on, or null when the block has no file.
export function cachedSite( file ) {
	if ( ! fs.existsSync( file ) ) {
		return null;
	}
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) ).site || null;
	} catch {
		return null;
	}
}

// Why a run on `site` must leave the block's cache file alone, or null when it may write it.
export function skipReason( file, site, recalibrate = false ) {
	const other = cachedSite( file );
	if ( recalibrate || ! other || other === site ) {
		return null;
	}
	return `calibrated on ${ other }; pass --recalibrate to replace`;
}
