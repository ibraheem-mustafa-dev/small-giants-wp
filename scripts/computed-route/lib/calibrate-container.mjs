// What a block's source says about how it renders, for calibration to act on before any browser opens (FR-47-2):
// whether its tiers follow its container's width, and whether its render can produce output at all on a site.
import fs from 'fs';
import path from 'path';

// A PHP source with its comments removed. String literals are kept whole, so a `//` inside a URL is not a comment.
export function stripPhpComments( src ) {
	return String( src ).replace( /('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*/g, ( m, str ) => ( str ?? '' ) );
}

// True when render.php passes a literal true for the shared wrapper's `container_queries` or `container` option. The
// wrapper then emits the block's tier rules as @container rules at render time, so a built style-index.css never holds
// them. A flag set from a variable, set false, or only named in a comment does not count.
export function hasRuntimeContainerQueries( renderSource ) {
	return /['"]container(?:_queries)?['"]\s*=>\s*true\b/.test( stripPhpComments( renderSource || '' ) );
}

// Whether a block's tiers follow its container's width: an @container rule in its built stylesheet, or a render that
// emits them at run time. dirs: block folders to look in, in order (build/blocks, then src/blocks).
export function isContainerQueryBlock( short, ...dirs ) {
	for ( const dir of dirs ) {
		const css = path.join( dir, short, 'style-index.css' );
		if ( fs.existsSync( css ) && fs.readFileSync( css, 'utf8' ).includes( '@container' ) ) {
			return true;
		}
		const php = path.join( dir, short, 'render.php' );
		if ( fs.existsSync( php ) && hasRuntimeContainerQueries( fs.readFileSync( php, 'utf8' ) ) ) {
			return true;
		}
	}
	return false;
}

// The site-level gate a render has: sgs/theme-toggle returns before any output when `settings.custom.dark` is empty.
const DARK_GATE = /sgs_global_custom_setting\(\s*['"]dark['"]\s*\)/;

// A named reason when a block's render source and the site's raw theme snapshot say the calibration instance will
// never reach the page, or null. The caller reports it as the block's error instead of waiting out a page timeout.
// `settings.custom.dark` is derived at deploy from the snapshot's `_sgsDark.enabled` (push-theme-snapshot.py::
// apply_dark_palette), so either key present clears the gate.
export function renderedNothingReason( block, { renderSource, rawSnapshot } ) {
	if ( DARK_GATE.test( stripPhpComments( renderSource || '' ) ) ) {
		const custom = rawSnapshot?.settings?.custom?.dark;
		const hasDark = custom && 'object' === typeof custom && Object.keys( custom ).length > 0;
		if ( ! hasDark && true !== rawSnapshot?._sgsDark?.enabled ) {
			return `${ block } renders nothing on this site: its render.php returns early without settings.custom.dark, and the site's theme-snapshot.json has neither a settings.custom.dark palette nor "_sgsDark": { "enabled": true } for push-theme-snapshot.py to derive one from`;
		}
	}
	return null;
}
