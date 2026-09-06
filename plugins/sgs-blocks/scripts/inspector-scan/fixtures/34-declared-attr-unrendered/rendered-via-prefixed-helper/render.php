<?php
// Mirrors the REAL sgs/brand-strip caption-typography shape (brand-strip/render.php:412):
// the declared attribute's own name never appears literally anywhere in this file —
// only a PREFIX is passed to the shared typography helper, which builds the full
// "{prefix}FontSize" key internally. A literal-name/suffix scanner cannot see this.
if ( function_exists( 'sgs_typography_css_rule' ) ) {
	$name_typography_css = sgs_typography_css_rule( $attributes, 'name', '.sgs-x__name' );
}
