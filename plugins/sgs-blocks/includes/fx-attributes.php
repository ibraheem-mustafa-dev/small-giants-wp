<?php
/**
 * Tier G fx attributes — server-side data-attribute injection.
 *
 * Spec 38 FR-38-4 / §11.2. The mirror of `animation-attributes.php` for the
 * motion system: it emits `data-sgs-fx*` onto DYNAMIC blocks' rendered HTML.
 *
 * Two paths exist because block attributes reach the frontend two ways, and
 * covering only one produces an effect that works on some blocks and silently
 * not on others:
 *
 *   · STATIC blocks  — `src/blocks/extensions/fx.js` writes the attributes at
 *                      save time via `blocks.getSaveContent.extraProps`, so
 *                      they are already baked into stored `post_content`.
 *   · DYNAMIC blocks — `save()` returns null, so nothing is stored. THIS FILE
 *                      injects them at render time.
 *
 * Runs at `render_block` priority 10 — BEFORE `SGS_Motion_Registry`'s sniff at
 * priority 99. That ordering is load-bearing: the registry decides whether to
 * enqueue any GSAP by looking for `data-sgs-fx` in the rendered markup, so the
 * attribute has to be present by the time it looks. Injecting at a priority
 * after 99 would leave every dynamic block's effect silently unloaded.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Block attribute name => rendered data-attribute suffix (Spec 38 §11.2).
 */
const FX_ATTR_MAP = array(
	'fx'         => 'data-sgs-fx',
	'fxTrigger'  => 'data-sgs-fx-trigger',
	'fxStart'    => 'data-sgs-fx-start',
	'fxEnd'      => 'data-sgs-fx-end',
	'fxScrub'    => 'data-sgs-fx-scrub',
	'fxStagger'  => 'data-sgs-fx-stagger',
	'fxDuration' => 'data-sgs-fx-duration',
	'fxEase'     => 'data-sgs-fx-ease',
	'fxSplit'    => 'data-sgs-fx-split',
	'fxMask'     => 'data-sgs-fx-mask',
);

/**
 * Advance past any leading `<style>`/`<script>` so a tag processor lands on the
 * block's REAL root element.
 *
 * Spec 32's no-inline contract has composites PREPEND a scoped
 * `<style id="…">…</style>` before their wrapper. `WP_HTML_Tag_Processor::
 * next_tag()` matches ANY tag including `<style>`, so calling it on the raw
 * content writes the data attributes onto the style tag — inert, and later
 * stripped wholesale by the p99 CSS-lift filter, so the effect never fires and
 * nothing anywhere reports an error. This exact bug has shipped on this project
 * before (see the identical guard in `animation-attributes.php`).
 *
 * @param string $block_content Rendered block HTML.
 * @return int Byte offset of the real root tag.
 */
function sgs_fx_root_offset( string $block_content ): int {
	$offset = 0;
	while ( \preg_match( '/^\s*<(style|script)\b[^>]*>/i', \substr( $block_content, $offset ), $m ) ) {
		$close     = '</' . \strtolower( $m[1] ) . '>';
		$close_pos = \stripos( $block_content, $close, $offset );
		if ( false === $close_pos ) {
			break; // Malformed markup — treat the whole string as-is.
		}
		$offset = $close_pos + \strlen( $close );
	}
	return $offset;
}

/**
 * Inject `data-sgs-fx*` onto a dynamic block's rendered root element.
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         Parsed block data including attrs.
 * @return string Block HTML, with fx data attributes when an effect is set.
 */
function sgs_inject_fx_attributes( string $block_content, array $block ): string {
	if ( '' === $block_content ) {
		return $block_content;
	}

	$attrs = $block['attrs'] ?? array();
	$fx    = $attrs['fx'] ?? '';

	if ( ! \is_string( $fx ) || '' === $fx ) {
		return $block_content;
	}

	// Already emitted by the static-save path — never write them twice.
	if ( false !== \strpos( $block_content, 'data-sgs-fx=' ) ) {
		return $block_content;
	}

	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	foreach ( FX_ATTR_MAP as $attr => $data_attr ) {
		if ( ! isset( $attrs[ $attr ] ) ) {
			continue;
		}
		$value = $attrs[ $attr ];

		/*
		 * Skip only genuinely ABSENT values. An emitted empty string would
		 * override the effect module's considered default with nothing.
		 *
		 * A numeric ZERO is NOT absent and must survive: `fxScrub => 0` means
		 * "no smoothing lag", a legitimate setting. The previous rule dropped
		 * every zero here, which is the same defect the JS save filter had —
		 * the client's choice vanished and the module's default silently took
		 * over. The two paths must agree, or the same block behaves differently
		 * depending on whether it was server-rendered or saved as static markup.
		 */
		if ( '' === $value || null === $value ) {
			continue;
		}

		$processor->set_attribute( $data_attr, \esc_attr( (string) $value ) );
	}

	/*
	 * Spec 38 FR-38-8 — mark the horizontal panel's TRACK.
	 *
	 * The effect translates one child element sideways. That element cannot be
	 * hand-authored: `sgs/container` is a DYNAMIC block, so `render.php`
	 * regenerates its markup on every render and any `data-sgs-fx-track` written
	 * into the editor's HTML is discarded — and per D338 an attribute a
	 * block.json doesn't declare is dropped silently, with no error and no gate.
	 * The convention came from hand-written GSAP demos where the author owns the
	 * HTML; here nobody does.
	 *
	 * So the two halves are split by ownership:
	 *   · SGS_Container_Wrapper FORCES the `__inner` element to exist when
	 *     fx === 'horizontal-panel' (only the wrapper can decide that), and
	 *   · this marks that element as the track.
	 *
	 * The mark is applied server-side, so the effect module never has to guess.
	 * If no `__inner` is found the mark is simply absent and the module bails to
	 * the CSS scroll-snap fallback rather than translating the wrong element.
	 */
	$html = $head . $processor->get_updated_html();

	if ( 'horizontal-panel' === $fx && false === \strpos( $html, 'data-sgs-fx-track' ) ) {
		$marker = new \WP_HTML_Tag_Processor( $html );
		while ( $marker->next_tag( array( 'class_name' => 'sgs-container__inner' ) ) ) {
			$marker->set_attribute( 'data-sgs-fx-track', 'true' );
			break; // The FIRST inner band is the track; nested ones are content.
		}
		$html = $marker->get_updated_html();
	}

	return $html;
}
\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_inject_fx_attributes', 10, 2 );
