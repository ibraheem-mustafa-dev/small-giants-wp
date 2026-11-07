<?php
/**
 * Shared helper for server-side render_block injectors that need to attach
 * per-instance CSS custom-property VALUES to a block's root element without
 * writing a `style="…"` attribute (Spec 32 no-inline contract, FR-32-11).
 *
 * Used by child-sizing.php and image-controls.php, which attach `--sgs-*`
 * custom properties through a scoped rule, never the root tag's `style`
 * attribute. That path is the ONLY
 * sanctioned no-inline mechanism already proven live by every migrated
 * block's render.php (e.g. quote, info-box): build a scoped `.{uid}{…}`
 * rule and append it as the block's own `<style>` tag. On the front end the
 * Spec-32 CSS collector (class-sgs-css-registry.php, render_block priority
 * 99) lifts that tag out of the block's rendered HTML into the consolidated
 * `<head>` stylesheet; in the editor (ServerSideRender REST — no wp_footer
 * flush) the tag is left inline and renders as-authored. Both paths are
 * covered with zero extra plumbing because it is literally the same shape
 * every render.php already uses.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Placeholder class name the rule builders receive while the real scope class
 * is still being decided. It is replaced by the minted class in the final CSS.
 */
const SGS_SCOPE_PLACEHOLDER = 'sgs-scope-placeholder';

/**
 * Prefixes of the scope classes the injectors mint (the `$prefix` every caller of sgs_scope_class_for_root passes).
 * A minted class is shared by every block whose rules match, so it is never reused as another injector's scope.
 */
const SGS_MINTED_SCOPE_PREFIXES = array(
	'sgs-child-sizing',
	'sgs-float-position',
	'sgs-imgctl',
	'sgs-fxpath',
	'sgs-fxshape',
	'sgs-post-content-lists',
	'sgs-card-min',
	'sgs-filter-look',
	'sgs-commerce-look',
	'sgs-chip-gap',
);

/**
 * Whether a class is one an injector minted (prefix plus eight hex digits), not a block's own uid class.
 *
 * @param string $class_name Class token.
 * @return bool
 */
function sgs_scope_class_is_minted( string $class_name ): bool {
	foreach ( SGS_MINTED_SCOPE_PREFIXES as $prefix ) {
		if ( 1 === preg_match( '/^' . preg_quote( $prefix, '/' ) . '-[0-9a-f]{8}$/', $class_name ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Find an existing SGS uid-pattern class (`sgs-<slug>-<8hex>`, the pattern
 * every migrated render.php already emits as its scoping selector, e.g.
 * `sgs-info-box-a1b2c3d4`) within a root tag's class attribute, or mint a
 * scoping class with the given prefix when none exists. This function only
 * DECIDES the class name; the caller adds it to the root tag's class list.
 *
 * Only a block's own uid class is reused; a class an injector minted (SGS_MINTED_SCOPE_PREFIXES) never is.
 * A minted suffix is the hash of the CSS rules it scopes, so the same rules
 * give the same class on every request, render order, editor and REST render.
 * Blocks with identical rules share one class and the collector keeps one
 * copy of the rule. When `$rules_for_scope` is null the root tag markup is
 * hashed instead.
 *
 * `$per_instance` is for scopes whose CSS value names the instance itself (an
 * anchor name): the nth block in a request with the same seed gets a seed
 * that includes n, which is stable for a given page because render order is.
 *
 * @param string        $root_tag_html   The root element's OPENING tag markup only,
 *                                        BEFORE any classes this request adds.
 * @param string        $prefix          Fallback prefix (no trailing hyphen),
 *                                        e.g. 'sgs-imgctl'.
 * @param callable|null $rules_for_scope Receives a scope class name (no leading
 *                                        dot) and returns the CSS text scoped by it.
 * @param bool          $per_instance    Give each repeat of the same seed its own class.
 * @return string Class name (no leading dot) to use as the scoping selector.
 */
function sgs_scope_class_for_root( string $root_tag_html, string $prefix, ?callable $rules_for_scope = null, bool $per_instance = false ): string {
	if ( preg_match( '/\bclass=["\']([^"\']*)["\']/', $root_tag_html, $class_match ) ) {
		if ( preg_match_all( '/(?<![\w-])sgs-[a-z-]+-[0-9a-f]{8}(?![\w-])/', $class_match[1], $uid_matches ) ) {
			foreach ( $uid_matches[0] as $candidate ) {
				if ( ! sgs_scope_class_is_minted( $candidate ) ) {
					return $candidate;
				}
			}
		}
	}
	$seed = $prefix . '|' . ( null === $rules_for_scope ? $root_tag_html : (string) $rules_for_scope( SGS_SCOPE_PLACEHOLDER ) );
	if ( $per_instance ) {
		$seen          = &sgs_scope_seed_counts();
		$n             = $seen[ $seed ] ?? 0;
		$seen[ $seed ] = $n + 1;
		$seed .= '|' . $n;
	}
	return $prefix . '-' . substr( \md5( $seed ), 0, 8 );
}

/**
 * Per-request count of how many times each per-instance seed has been used.
 *
 * @param bool $reset Clear the counts (a new request starts empty; tests call this).
 * @return array<string, int>
 */
function &sgs_scope_seed_counts( bool $reset = false ): array {
	static $counts = array();
	if ( $reset ) {
		$counts = array();
	}
	return $counts;
}

/**
 * Append a scoped `<style>` rule declaring CSS custom properties on the
 * given scope class, to a block's rendered HTML. No-op when there are no
 * declarations. See file docblock for why appending a `<style>` tag (rather
 * than an inline `style=""` attribute) is the correct + already-proven
 * mechanism.
 *
 * @param string $block_content Rendered block HTML to append to.
 * @param string $scope_class   Selector class name (no leading dot).
 * @param array  $declarations  CSS declarations, each already a complete
 *                               `property:value` string (e.g. `--sgs-hover-scale:1.02`).
 * @return string Block HTML with the scoped `<style>` tag appended.
 */
function sgs_append_scoped_var_style( string $block_content, string $scope_class, array $declarations ): string {
	if ( empty( $declarations ) || '' === $scope_class ) {
		return $block_content;
	}
	$css = '.' . $scope_class . '{' . \implode( ';', $declarations ) . '}';
	return $block_content . '<style>' . \wp_strip_all_tags( $css ) . '</style>';
}

/**
 * Extract just the root element's OPENING tag from a block-content substring
 * that starts at the real root (i.e. past any leading `<style>`/`<script>`
 * tags — see the `$sgs_root_offset` skip-loop every injector in this family
 * already runs). Returns '' when no tag is found (malformed markup).
 *
 * @param string $root_and_beyond Substring starting at the root element.
 * @return string
 */
function sgs_extract_root_opening_tag( string $root_and_beyond ): string {
	if ( \preg_match( '/^<[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/', $root_and_beyond, $tag_match ) ) {
		return $tag_match[0];
	}
	return '';
}

/**
 * Add a marker class and a scope class to a block's root element and append the scoped rules as the block's own
 * `<style>` tag (never a `style=""` attribute). Any leading `<style>`/`<script>` the block prepends is skipped to
 * reach the real root. The scope reuses the block's own uid class when it has one.
 *
 * @param string   $block_content Rendered block HTML.
 * @param string   $marker        Marker class and minted-scope prefix (in SGS_MINTED_SCOPE_PREFIXES).
 * @param callable $css_for       Receives the scope class (no dot), returns the scoped CSS ('' = emit nothing).
 * @return string Block HTML with the classes and the rules added.
 */
function sgs_inject_scoped_rules( string $block_content, string $marker, callable $css_for ): string {
	$offset = 0;
	while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $block_content, $offset ), $lead ) ) {
		$close     = '</' . strtolower( $lead[1] ) . '>';
		$close_pos = stripos( $block_content, $close, $offset );
		if ( false === $close_pos ) {
			return $block_content;
		}
		$offset = $close_pos + strlen( $close );
	}
	$head = substr( $block_content, 0, $offset );
	$root = substr( $block_content, $offset );

	$root_tag = sgs_extract_root_opening_tag( ltrim( $root ) );
	if ( '' === $root_tag ) {
		return $block_content;
	}
	$scope   = sgs_scope_class_for_root( $root_tag, $marker, $css_for );
	$has_uid = (bool) preg_match( '/\bclass=["\'][^"\']*\b' . preg_quote( $scope, '/' ) . '\b/', $root_tag );
	$classes = $has_uid ? $marker : $marker . ' ' . $scope;

	if ( preg_match( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', $root ) ) {
		$root = preg_replace( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', '$1' . $classes . ' ', $root, 1 );
	} else {
		$root = preg_replace( '/^(\s*<\w+)(\b)/', '$1 class="' . $classes . '"$2', $root, 1 );
	}

	$css = $css_for( $scope );
	if ( '' === $css ) {
		return $head . $root;
	}
	return $head . $root . '<style>' . wp_strip_all_tags( $css ) . '</style>';
}
