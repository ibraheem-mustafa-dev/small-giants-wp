'use strict';

// GROUND-TRUTH: spec=task brief 2026-08-08 (extensionsDir plumbing) source=file
// evidence=live-read plugins/sgs-blocks/src/blocks/extensions/ on 2026-08-08 —
// contains animation.js, block-defaults.js, conditional-visibility.js,
// custom-css.js, hide-extensions.js, hover-effects.js, image-controls.js,
// parallax.js, responsive-visibility.js (the universal inspector-control
// extensions), plus fx.js + generated-fx-*.json (an FX data pipeline, not an
// inspector control), fx-presets.json, and the index.js barrel that
// registers them all. This helper is discovery plumbing only — it does not
// itself implement any rule.
//
// Mirrors core/components.js's discover() shape deliberately: resolved from
// a ctx-supplied directory (never a hardcoded path), so a future rule built
// on this is genuinely testable against an isolated fixture copy (see
// core/selftest.js's extensionsDir, which points inside the temp fixture
// rather than the real repo).

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Lists the JS source files inside an extensions directory, excluding the
 * barrel `index.js` (which only re-exports/registers the others and carries
 * no inspector-control logic of its own).
 *
 * Returns { ok, reason, files: [ { name, file, path } ] } — `file` is the
 * bare filename (e.g. "animation.js"), `path` is the absolute path,
 * `name` is the basename without extension (e.g. "animation").
 */
function listExtensionFiles( extensionsDir ) {
	if ( ! extensionsDir || ! fs.existsSync( extensionsDir ) ) {
		return { ok: false, reason: `extensions directory not found at ${ extensionsDir }`, files: [] };
	}
	const files = fs
		.readdirSync( extensionsDir )
		.filter( ( f ) => f.endsWith( '.js' ) && f !== 'index.js' )
		.sort()
		.map( ( f ) => ( {
			name: path.basename( f, '.js' ),
			file: f,
			path: path.join( extensionsDir, f ),
		} ) );
	return { ok: true, reason: null, files };
}

module.exports = { listExtensionFiles };
