<?php
// Self-test fixture stand-in for class-sgs-container-wrapper.php. Mirrors two real
// shapes from the real file: a LITERAL bracket read for `contentWidth` (the R3-e
// canonical probe this rule must never flag) and a bare-variable COMPUTED-KEY read
// via a foreach over a literal-keyed array (class-sgs-container-wrapper.php:2402-2418
// — the shape this rule deliberately declines to resolve rather than guess at).
class SGS_Container_Wrapper {
	public static function render( $attributes, $block, $content, $kind, $opts ) {
		$content_width = $attributes['contentWidth'] ?? '';

		foreach ( array(
			'alignContent' => 'align-content',
		) as $sgs_attr => $sgs_css_prop ) {
			if ( isset( $attributes[ $sgs_attr ] ) ) {
				$noop = $sgs_css_prop;
			}
		}

		return '';
	}
}
