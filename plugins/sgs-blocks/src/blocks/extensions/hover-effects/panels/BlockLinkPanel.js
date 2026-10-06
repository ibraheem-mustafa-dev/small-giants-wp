/**
 * Hover Effects extension — "Block Link" inspector panel.
 *
 * Split out of the former hover-effects.js (D551, Phase 2.1 header docs live
 * in ../index.js). Verbatim move of the PanelBody JSX; receives every value
 * it reads from the withHoverControls HOC as props.
 *
 * @package SGS\Blocks
 */
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { LinkPopoverField } from '../../../../components';

/**
 * @param {Object}   props
 * @param {string}   props.sgsBlockLink
 * @param {boolean}  props.sgsBlockLinkTarget
 * @param {string}   props.sgsBlockLinkLabel
 * @param {boolean}  props.sgsBlockLinkAuto    Whole-block link using the
 *                                             block's own destination.
 * @param {boolean}  props.hasAutoUrl          The block declares
 *                                             supports.sgs.blockLinkAutoUrl,
 *                                             so it resolves its own URL at
 *                                             render time.
 * @param {string}   props.autoUrlHelp         Plain-English description of
 *                                             where this block's own
 *                                             destination goes.
 * @param {Function} props.setAttributes
 */
export default function BlockLinkPanel( {
	sgsBlockLink,
	sgsBlockLinkTarget,
	sgsBlockLinkLabel,
	sgsBlockLinkAuto = false,
	hasAutoUrl = false,
	autoUrlHelp = '',
	setAttributes,
} ) {
	return (
		<PanelBody
			title={ __( 'Block Link', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			{ /* A block that resolves its own destination at render time
			   (supports.sgs.blockLinkAutoUrl — a product card knows its
			   product's permalink, a logo knows the site home) offers this
			   toggle INSTEAD of asking the operator to type a URL. The two
			   are never both live: while the toggle is on the URL field is
			   hidden, so one capability keeps exactly one control. The URL
			   itself is handed to the same overlay mechanism from the
			   block's render.php, through
			   includes/helpers-stretched-link.php::sgs_stretched_link_handover. */ }
			{ hasAutoUrl && (
				<ToggleControl
					label={ __( 'Make the whole block one link', 'sgs-blocks' ) }
					help={
						autoUrlHelp ||
						__( 'The whole block becomes clickable, using the destination this block already has. Buttons inside it keep working.', 'sgs-blocks' )
					}
					checked={ !! sgsBlockLinkAuto }
					onChange={ ( val ) => setAttributes( { sgsBlockLinkAuto: !! val } ) }
					__nextHasNoMarginBottom
				/>
			) }
			{ ! ( hasAutoUrl && sgsBlockLinkAuto ) && (
			<>
			{ /* Spec 35 §2 LINK standard (promoted from `sgs/button`'s
			   Bean-approved popover 2026-08-13) — replaces the raw
			   TextControl (type url) this panel used to render.
			   ⚠ CORRECTED 2026-08-19 — "67-block reach via this ONE
			   extension" described the PRE-D551 legacy state, when
			   `blockLink` was still denylist/universal (attached to
			   every block unless opted out). D551 (2026-08-10) flipped
			   it to opt-in via `supports.sgs.enabledExtensions`;
			   MEASURED current reach is **6 blocks** (scan of every
			   block.json's `enabledExtensions`, 2026-10-06) — this fix
			   was the highest-leverage single fix in the LINK rollout
			   at the time it shipped, not a description of today's
			   reach. `showRel` stays off + `enableInternalResolution`
			   stays off:
			   `sgsBlockLink` has no rel attribute and no ID-resolution
			   consumer in `includes/hover-effects/link-overlay.php` —
			   only `url`/`linkTarget` exist on the wire. The accessible-
			   label field is this extension's OWN bespoke field (no
			   other consumer has one), passed via `renderExtraFields`
			   rather than forcing a new field onto the shared
			   component's contract. */ }
			<LinkPopoverField
				label={ __( 'Link URL', 'sgs-blocks' ) }
				help={ __( 'Makes the whole card clickable. Any link/button already inside the block stays clickable too. Leave empty to disable.', 'sgs-blocks' ) }
				value={ {
					url: sgsBlockLink,
					linkTarget: sgsBlockLinkTarget ? '_blank' : '_self',
				} }
				targetMode="boolean"
				showRel={ false }
				onChange={ ( next ) => {
					const patch = {};
					if ( undefined !== next.url ) {
						patch.sgsBlockLink = next.url;
					}
					if ( undefined !== next.linkTarget ) {
						patch.sgsBlockLinkTarget = '_blank' === next.linkTarget;
					}
					setAttributes( patch );
				} }
				renderExtraFields={ () => (
					<TextControl
						label={ __( 'Accessible label for the card link', 'sgs-blocks' ) }
						help={ __( 'Read by screen readers — the card link has no visible text of its own. Leave empty to fall back to the link’s domain.', 'sgs-blocks' ) }
						value={ sgsBlockLinkLabel }
						onChange={ ( val ) => setAttributes( { sgsBlockLinkLabel: val || '' } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			/>
			</>
			) }
		</PanelBody>
	);
}
