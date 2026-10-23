// Where a CSS rule the live probes read came from: `inline` (the element's style attribute), `custom-css` (a block's
// sgsCustomCss residual, the route's own write) or `stylesheet` (a framework, theme or WordPress rule). A residual is known
// by its element, `<style id="sgs-custom-css-<uid>">` (plugins/sgs-blocks/includes/custom-css.php), or, once the CSS
// registry has lifted it into the consolidated sheet, by the scoper's doubled per-instance scope `.sgs-c-<uid>.sgs-c-<uid>`
// (both halves the same uid; custom-css.php::sgs_custom_css_uid gives `sgs-c-` and a 4 to 16 character key or an 8-hex
// hash with an optional `-N` occurrence suffix), which survives the lift.
const DOUBLED_SCOPE = /\.(sgs-c-[a-z0-9]{4,16}(?:-\d+)?)\.\1(?![\w-])/;

// A stylesheet WordPress or the theme owns never carries a residual, whatever its selectors: the owner element ids of core's
// block library, global styles, classic-theme and block-support styles and the SGS theme and per-block plugin styles, and
// the stylesheet hrefs under wp-includes, a theme or a plugin's build folder. The registry's consolidated sheet
// (`sgs-blocks-collected`, in uploads) is none of these: it is where a lifted residual lives.
const WP_OWNER_ID = /^(?:wp-|global-styles|classic-theme-styles|core-block-supports|sgs-theme|sgs-blocks-style)/;
const WP_SHEET_HREF = /\/(?:wp-includes\/|wp-content\/themes\/|wp-content\/plugins\/[^/]+\/build\/)/;

// r: { selector or rule (the selector text), owner (the id of the stylesheet's owner element; null for the inline style),
// sheet (the stylesheet's href, or 'inline <style>'; a winner carries none) }.
export function ruleOrigin( r ) {
	if ( null === r?.owner ) {
		return 'inline';
	}
	const owner = String( r?.owner ?? '' );
	if ( /^sgs-custom-css-/.test( owner ) ) {
		return 'custom-css';
	}
	if ( WP_OWNER_ID.test( owner ) || WP_SHEET_HREF.test( String( r?.sheet ?? '' ) ) ) {
		return 'stylesheet';
	}
	return DOUBLED_SCOPE.test( String( r?.selector ?? r?.rule ?? '' ) ) ? 'custom-css' : 'stylesheet';
}

// Each rule with its origin.
export const withOrigin = ( list ) => ( list || [] ).map( ( r ) => ( { ...r, origin: ruleOrigin( r ) } ) );
