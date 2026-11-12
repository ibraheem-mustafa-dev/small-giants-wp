/**
 * The last step of npm's postbuild: writes build/.postbuild-done once every postbuild step has passed.
 *
 * `build-deploy.py --skip-build` reuses whatever build/ holds and refuses one without this marker, so a build made
 * with webpack alone (no style.css copies, no shadow-lift, hover-guard or shadow-fallback transforms) cannot ship.
 * `npm run prebuild` (clean:build) and wp-scripts both empty build/, so a later partial build never inherits it.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const build = path.resolve( __dirname, '..', 'build' );
if ( ! fs.existsSync( build ) ) {
	console.error( '[mark-postbuild-done] build/ not found' );
	process.exit( 1 );
}
fs.writeFileSync( path.join( build, '.postbuild-done' ), new Date().toISOString() + '\n' );
console.log( '[mark-postbuild-done] build/.postbuild-done written' );
