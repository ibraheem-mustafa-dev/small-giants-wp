<?php
/**
 * One shared rule for every block instance whose declarations are identical.
 *
 * Each block prints its per-instance CSS under its own uid class (`sgs-<block>-<hash of its attributes>`), so two
 * instances that differ in ANY attribute print the same rule body again under another selector. A block whose group
 * of declarations repeats across instances calls `sgs_shared_rules()` instead: the class is minted from a hash of the
 * rules themselves (the same idea as `sgs_scope_class_for_root()` in helpers-scoped-instance-vars.php), the block puts
 * that class on its root element, and every instance with the same rules prints the same text. `sgs_style_tags()` cuts
 * the shared text out of the block's CSS into a `<style>` tag of its own, so the collector
 * (`class-sgs-css-registry.php::sgs_collect_css`, keyed by the md5 of each tag's text) keeps one copy, at the position
 * of the first instance that printed it.
 *
 * Order stays the cascade. The shared text sits where the block's own rules sat (the tag is cut in place, never moved
 * to the front or the back), so a rule of the same instance printed after it still overrides it, and a later instance
 * only re-uses a copy printed earlier. The selector's specificity is the one the unshared rule had: the shared class
 * stands where the uid class stood. Nothing regroups the collected CSS.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

/** Placeholder class the rule builder receives while the real shared class is still being decided. */
const SGS_SHARED_RULES_PLACEHOLDER = 'sgs-shared-placeholder';

/** Comment markers that fence a shared group inside a block's CSS string; plain CSS comments if nothing cuts them. */
const SGS_SHARED_RULES_OPEN  = '/*sgs-shared*/';
const SGS_SHARED_RULES_CLOSE = '/*sgs-shared-end*/';

if ( ! function_exists( 'sgs_shared_rules' ) ) {
	/**
	 * Mint the shared class for a group of rules and fence the rules for `sgs_style_tags()`.
	 *
	 * The class is `<prefix>-<8 hex digits of md5( prefix | the rules built with a placeholder class )>`, so the same
	 * declarations give the same class on every request, in the editor and in a REST render; different declarations
	 * give different classes. The prefix must be listed in `SGS_MINTED_SCOPE_PREFIXES`
	 * (helpers-scoped-instance-vars.php) so no injector mistakes the class for the block's own uid.
	 *
	 * @param string   $prefix  Class prefix (no trailing hyphen), e.g. `sgs-band-width`.
	 * @param callable $css_for Receives a class name (no leading dot) and returns the complete rules it scopes: whole
	 *                          top-level rules or at-rules, never a fragment. '' means nothing to print.
	 * @param string   $seed    Extra text that goes into the hash only. A block whose group must always follow another
	 *                          shared rule of its own passes that rule's text, so two blocks share the class only when
	 *                          the rule before it is the same too and the pair never prints in the other order.
	 * @return array{class: string, css: string} The class to add to the block's root, and the fenced rules to append
	 *                          to the block's CSS. Both are '' when there is nothing to print.
	 */
	function sgs_shared_rules( string $prefix, callable $css_for, string $seed = '' ): array {
		// Built once, with the placeholder: the builder only places the class name in selectors, so the minted class
		// replaces the placeholder in the text.
		$probe = trim( (string) $css_for( SGS_SHARED_RULES_PLACEHOLDER ) );
		if ( '' === $probe ) {
			return array(
				'class' => '',
				'css'   => '',
			);
		}
		$class = $prefix . '-' . substr( md5( $prefix . '|' . $probe . ( '' === $seed ? '' : '|' . $seed ) ), 0, 8 );
		return array(
			'class' => $class,
			'css'   => SGS_SHARED_RULES_OPEN . str_replace( SGS_SHARED_RULES_PLACEHOLDER, $class, $probe ) . SGS_SHARED_RULES_CLOSE,
		);
	}
}

if ( ! function_exists( 'sgs_style_tags' ) ) {
	/**
	 * Turn a block's CSS string into `<style>` tags, one for each fenced shared group and one for each stretch of the
	 * block's own CSS between them, in the order they were written.
	 *
	 * Without a fence this is the single `<style>` tag the block printed before. The caller strips HTML tags from the
	 * CSS first (`wp_strip_all_tags`, which leaves the comment fences alone). The `id`, when given, goes on the first
	 * tag that holds the block's own CSS.
	 *
	 * @param string $css Already-sanitised CSS, possibly holding fenced shared groups.
	 * @param string $id  Optional id for the first own-CSS tag.
	 * @return string Zero or more `<style>` tags ('' when the CSS is empty).
	 */
	function sgs_style_tags( string $css, string $id = '' ): string {
		$parts = preg_split(
			'#' . preg_quote( SGS_SHARED_RULES_OPEN, '#' ) . '(.*?)' . preg_quote( SGS_SHARED_RULES_CLOSE, '#' ) . '#s',
			$css,
			-1,
			PREG_SPLIT_DELIM_CAPTURE
		);
		if ( false === $parts ) {
			return '' === trim( $css ) ? '' : '<style' . ( '' !== $id ? ' id="' . htmlspecialchars( $id, ENT_QUOTES ) . '"' : '' ) . '>' . $css . '</style>';
		}
		$out     = '';
		$id_used = '' === $id;
		foreach ( $parts as $i => $part ) {
			if ( '' === trim( $part ) ) {
				continue;
			}
			if ( 1 === $i % 2 ) {
				$out .= '<style>' . $part . '</style>';
				continue;
			}
			$attr    = $id_used ? '' : ' id="' . htmlspecialchars( $id, ENT_QUOTES ) . '"';
			$id_used = true;
			$out    .= '<style' . $attr . '>' . $part . '</style>';
		}
		return $out;
	}
}
