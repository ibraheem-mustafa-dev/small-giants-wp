/**
 * Hover Effects extension — "Block Link" inspector panel.
 *
 * Split out of the former hover-effects.js (D551, Phase 2.1 header docs live
 * in ../index.js). Verbatim move of the PanelBody JSX; receives every value
 * it reads from the withHoverControls HOC as props.
 *
 * @package SGS\Blocks
 */
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { LinkPopoverField } from '../../../components';

/**
 * @param {Object}   props
 * @param {string}   props.sgsBlockLink
 * @param {boolean}  props.sgsBlockLinkTarget
 * @param {string}   props.sgsBlockLinkLabel
 * @param {Function} props.setAttributes
 */
export default function BlockLinkPanel( {
	sgsBlockLink,
	sgsBlockLinkTarget,
	sgsBlockLinkLabel,
	setAttributes,
} ) {
	return (
		<PanelBody
			title={ __( 'Block Link', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			{ /* Spec 35 §2 LINK standard (promoted from `sgs/button`'s
			   Bean-approved popover 2026-08-13) — replaces the raw
			   TextControl (type url) this panel used to render.
			   ⚠ CORRECTED 2026-08-19 — "67-block reach via this ONE
			   extension" described the PRE-D551 legacy state, when
			   `blockLink` was still denylist/universal (attached to
			   every block unless opted out). D551 (2026-08-10) flipped
			   it to opt-in via `supports.sgs.enabledExtensions`;
			   MEASURED current reach is **3 blocks** (scan of every
			   block.json's `enabledExtensions`, 2026-08-19) — this fix
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
		</PanelBody>
	);
}
