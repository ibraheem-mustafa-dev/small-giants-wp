/**
 * The CSS a block's stylesheet ships as: the source text with the build's own postbuild rewrites applied, in the order
 * package.json's `postbuild` runs them over build/blocks: shadow-lift (scripts/shadow-lift: adds the hover lift of a
 * resting shadow), hover-guard (scripts/hover-guard: guards every :hover member against touch and adds its pressed twin)
 * and shadow-fallback (scripts/shadow-fallback: adds the forced-colours fallback of a shadow). The setting check reads
 * this, not the source, so its record holds what a visitor's page holds (diff.py::shipped_css).
 *
 * Usage: node shipped-css.js <stylesheet> <block.json or ''>   (the shipped CSS on stdout)
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );

const SCRIPTS = path.resolve( __dirname, '..' );
const PLUGIN = path.resolve( SCRIPTS, '..' );
const THEME_JSON = path.resolve( PLUGIN, '..', '..', 'theme', 'sgs-theme', 'theme.json' );

const lift = require( path.join( SCRIPTS, 'shadow-lift', 'transform.js' ) );
const guard = require( path.join( SCRIPTS, 'hover-guard', 'transform.js' ) );
const fallback = require( path.join( SCRIPTS, 'shadow-fallback', 'transform.js' ) );

/** The theme's hover map and shadow preset slugs, read as scripts/shadow-lift/run.js::loadThemeContext reads them. */
function themeContext() {
	let json = {};
	try {
		json = JSON.parse( fs.readFileSync( THEME_JSON, 'utf8' ) );
	} catch ( e ) {
		return { hoverMap: null, presetSlugs: new Set() };
	}
	const settings = json.settings || {};
	const presets = ( settings.shadow && Array.isArray( settings.shadow.presets ) ) ? settings.shadow.presets : [];
	const hoverMap = ( settings.custom && settings.custom.shadowHover && 'object' === typeof settings.custom.shadowHover ) ? settings.custom.shadowHover : null;
	return { hoverMap, presetSlugs: new Set( presets.map( ( p ) => p.slug ).filter( Boolean ) ) };
}

/** `supports.sgs.shadowLift: false` on the block (scripts/shadow-lift/run.js::blockShadowLiftDisabled). */
function liftDisabled( blockJson ) {
	if ( ! blockJson ) {
		return false;
	}
	try {
		const json = JSON.parse( fs.readFileSync( blockJson, 'utf8' ) );
		const flag = json && json.supports && json.supports.sgs && json.supports.sgs.shadowLift;
		return false === flag;
	} catch ( e ) {
		return false;
	}
}

function main() {
	const [ file, blockJson ] = process.argv.slice( 2 );
	let css = fs.readFileSync( file, 'utf8' );
	css = lift.transformCss( css, file, { ...themeContext(), disabled: liftDisabled( blockJson ) } ).css;
	css = guard.transformCss( css, file ).css;
	css = fallback.transformCss( css, file ).css;
	process.stdout.write( css );
}

main();
