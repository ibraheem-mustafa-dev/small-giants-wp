/**
 * Modal Settings inspector controls for "let other elements open this modal"
 * (the block's HTML anchor as the shared link target, plus the optional
 * open-on-page-load behaviour). Extracted out of edit.js, which is already
 * over the framework's 250-line JS file limit — new logic goes in a new file
 * rather than growing it further.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { ToggleControl, Notice } from '@wordpress/components';

/**
 * The "Link to this modal with #<anchor>" readout, so a client can copy the
 * id straight from the panel they already have open — any link or button
 * anywhere on the page pointing `href="#<anchor>"` or
 * `data-sgs-modal-open="<anchor>"` at it opens this modal (view.js's single
 * delegated click listener). Uses the block's own native HTML anchor
 * (supports.anchor:true, set under the Advanced panel) rather than a new
 * attribute, since this block already declares that support.
 *
 * @param {Object}      props        Component props.
 * @param {string}      props.anchor The block's current HTML anchor value.
 * @return {JSX.Element} The notice.
 */
export function ModalAnchorNotice( { anchor } ) {
	if ( anchor ) {
		return (
			<Notice status="info" isDismissible={ false }>
				{ sprintf(
					/* translators: %s: the block's HTML anchor id. */
					__(
						'Link to this modal with #%s — any link or button on the page using that as its target will open it.',
						'sgs-blocks'
					),
					anchor
				) }
			</Notice>
		);
	}

	return (
		<Notice status="info" isDismissible={ false }>
			{ __(
				'To let other links or buttons on the page open this modal, set an HTML anchor for this block (Advanced panel, further down the Inspector) — then link to it with "#that-anchor".',
				'sgs-blocks'
			) }
		</Notice>
	);
}

/**
 * The "open automatically when linked to directly" toggle (openOnHashLoad,
 * block.json). Off by default so an existing anchor link to this block keeps
 * its normal jump-to-position behaviour unless the operator opts in; disabled
 * (not hidden) until an anchor is set, since it does nothing without one.
 *
 * @param {Object}   props                  Component props.
 * @param {string}   props.anchor           The block's current HTML anchor value.
 * @param {boolean}  props.openOnHashLoad   Current attribute value.
 * @param {Function} props.setAttributes    Block editor setAttributes.
 * @return {JSX.Element} The control.
 */
export function ModalHashLoadToggle( { anchor, openOnHashLoad, setAttributes } ) {
	return (
		<ToggleControl
			label={ __( 'Open automatically when linked to directly', 'sgs-blocks' ) }
			help={
				anchor
					? sprintf(
							/* translators: %s: the block's HTML anchor id. */
							__(
								'When someone opens a link ending in #%s (e.g. from another page), this modal opens straight away on page load.',
								'sgs-blocks'
							),
							anchor
					  )
					: __(
							'Set an HTML anchor above first — this only works once the modal has one to be linked to.',
							'sgs-blocks'
					  )
			}
			checked={ !! openOnHashLoad }
			onChange={ ( val ) => setAttributes( { openOnHashLoad: val } ) }
			disabled={ ! anchor }
			__nextHasNoMarginBottom
		/>
	);
}
