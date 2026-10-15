<?php
/**
 * Motion custom target: a cloning-only `custom:<n>` target resolved inside the block root (Spec 38A FR-38A-5, §6.2).
 *
 * Only the cloning tool writes a custom target, and only with a review row (`review.draftNode` and `review.reason`,
 * both non-empty text). The stored selector is always emitted as `.{scope} <selector>`, so it can never reach outside
 * the block root. A target is refused (resolves to nothing, so no CSS and no markup change) when it has no review row,
 * no selector, or a selector that is not a single scoped selector: a list (comma), a block, at-rule, tag or backslash
 * character, a leading `html`, `body` or `:root`, or a leading `+` or `~` sibling combinator that would leave the root.
 * A leading `>` is fine: it selects a direct child of the scoped root.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Custom_Target
 */
final class Sgs_Motion_Custom_Target {

	/**
	 * Longest selector the schema allows (`scopedSelector.maxLength`).
	 */
	private const MAX_LENGTH = 200;

	/**
	 * The only characters a scoped selector may contain (classes, ids, tags, attributes, pseudo-classes, combinators).
	 */
	private const ALLOWED = '/^[A-Za-z0-9_\-.#:\[\]="\' >+~()*]+$/';

	/**
	 * Matches only when the selector holds none of the characters that could end the rule or the style block.
	 */
	private const DENIED = '/^[^<{};\\\\@,\/]*$/';

	/**
	 * Whether a custom element carries a complete review row.
	 *
	 * @param array<string,mixed> $element The custom element.
	 * @return bool
	 */
	public static function is_reviewed( array $element ): bool {
		$review = isset( $element['review'] ) && is_array( $element['review'] ) ? $element['review'] : array();
		foreach ( array( 'draftNode', 'reason' ) as $key ) {
			if ( ! isset( $review[ $key ] ) || ! is_string( $review[ $key ] ) || '' === trim( $review[ $key ] ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Whether a selector is one selector that stays inside the block root once prefixed.
	 *
	 * @param string $selector Trimmed selector.
	 * @return bool
	 */
	public static function is_scoped( string $selector ): bool {
		if ( '' === $selector || strlen( $selector ) > self::MAX_LENGTH ) {
			return false;
		}
		// Fail closed: only the characters a scoped selector needs pass, and a regex error (false) is a refusal.
		if ( 1 !== preg_match( self::ALLOWED, $selector ) ) {
			return false;
		}
		// Belt and braces: none of these can reach the printed <style> block, whatever the allow-list says.
		if ( 1 !== preg_match( self::DENIED, $selector ) ) {
			return false;
		}
		if ( 1 === preg_match( '/^(?:html|body|:root)(?![A-Za-z0-9_-])/i', $selector ) ) {
			return false;
		}
		return 1 !== preg_match( '/^[+~]/', $selector );
	}

	/**
	 * Resolve one custom target.
	 *
	 * @param string              $scope   The scoped root's class.
	 * @param array<string,mixed> $element The element stored under `custom:<n>`.
	 * @return array{selector:string,match:array{root:bool,classes:array<int,string>,tag:?string,child:bool}}|null Null
	 *         when the target is unreviewed or its selector is not scoped.
	 */
	public static function resolve( string $scope, array $element ): ?array {
		$selector = isset( $element['selector'] ) && is_string( $element['selector'] ) ? trim( $element['selector'] ) : '';
		if ( ! self::is_reviewed( $element ) || ! self::is_scoped( $selector ) ) {
			return null;
		}
		$last = self::last_compound( $selector );
		return array(
			'selector' => '.' . $scope . ' ' . $selector,
			'match'    => array(
				'root'    => false,
				'classes' => $last['classes'],
				'tag'     => $last['tag'],
				'child'   => false,
			),
		);
	}

	/**
	 * The classes and tag of a selector's last compound (used to find a target's elements in the markup; the
	 * descendant context before it is checked only in the emitted CSS).
	 *
	 * @param string $selector A schema-valid selector.
	 * @return array{classes:array<int,string>,tag:?string}
	 */
	public static function last_compound( string $selector ): array {
		$parts    = preg_split( '/\s*[>+~]\s*|\s+/', $selector );
		$compound = is_array( $parts ) ? (string) end( $parts ) : '';
		$compound = (string) preg_replace( '/::?[a-zA-Z-]+(\([^)]*\))?|\[[^\]]*\]/', '', $compound );
		preg_match_all( '/\.([A-Za-z0-9_-]+)/', $compound, $m );
		$tag = preg_match( '/^([a-zA-Z][a-zA-Z0-9]*)/', $compound, $t ) ? strtoupper( $t[1] ) : null;
		return array(
			'classes' => $m[1],
			'tag'     => $tag,
		);
	}
}
