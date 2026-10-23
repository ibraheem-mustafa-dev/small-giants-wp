// Where a CSS rule the live probes read came from: `inline` (the element's style attribute), `custom-css` (a block's
// sgsCustomCss residual, the route's own write) or `stylesheet` (a framework, theme or WordPress rule). A residual is known
// by its element, `<style id="sgs-custom-css-<uid>">` (plugins/sgs-blocks/includes/custom-css.php), or, once the CSS
// registry has lifted it into the consolidated sheet, by the scoper's doubled per-instance scope `.sgs-c-<uid>.sgs-c-<uid>`
// (both halves the same uid; custom-css.php::sgs_custom_css_uid gives `sgs-c-` and a 4 to 16 character key or an 8-hex
// hash with an optional `-N` occurrence suffix), which survives the lift.
const DOUBLED_SCOPE = /\.(sgs-c-[a-z0-9]{4,16}(?:-\d+)?)\.\1(?![\w-])/;

// r: { selector or rule (the selector text), owner (the id of the stylesheet's owner element; null for the inline style) }.
export function ruleOrigin( r ) {
	if ( null === r?.owner ) {
		return 'inline';
	}
	const selector = String( r?.selector ?? r?.rule ?? '' );
	return /^sgs-custom-css-/.test( String( r?.owner ?? '' ) ) || DOUBLED_SCOPE.test( selector ) ? 'custom-css' : 'stylesheet';
}

// Each rule with its origin.
export const withOrigin = ( list ) => ( list || [] ).map( ( r ) => ( { ...r, origin: ruleOrigin( r ) } ) );
