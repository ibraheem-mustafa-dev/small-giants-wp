/**
 * Keyboard focus keeps the resting look (`sgsFocusRests`).
 *
 * One toggle on every SGS block. With it on, the block's hover colours, shadows and movement play on pointer hover
 * only, and keyboard focus shows the focus ring over the resting look (the ring itself is the unified focus
 * system's, `theme/sgs-theme/assets/css/focus.css`). The frontend effect is server-side:
 * `includes/class-sgs-focus-rests.php` keeps the per-block render stack that `sgs_hover_state_rules()` and the
 * motion renderer read.
 *
 * Roster rule `denylist`: every `sgs/*` block unless `supports.sgs.hideExtensions` lists `focusRests`.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { isExtensionHidden } from './hide-extensions';

/**
 * Whether the block receives the setting.
 *
 * @param {string} name Block name.
 * @return {boolean} True for an `sgs/*` block that does not hide it.
 */
function receivesFocusRests( name ) {
	return (
		typeof name === 'string' &&
		name.startsWith( 'sgs/' ) &&
		! isExtensionHidden( name, 'focusRests' )
	);
}

addFilter(
	'blocks.registerBlockType',
	'sgs/focus-rests/attribute',
	( settings, name ) => {
		if ( ! settings.attributes || ! receivesFocusRests( name ) ) {
			return settings;
		}
		return {
			...settings,
			attributes: {
				...settings.attributes,
				sgsFocusRests: { type: 'boolean', default: false },
			},
		};
	}
);

const withFocusRestsControl = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, name, isSelected } = props;
		if ( ! isSelected || ! receivesFocusRests( name ) ) {
			return <BlockEdit { ...props } />;
		}
		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'Keyboard focus', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<ToggleControl
							label={ __(
								'Keyboard focus keeps the resting look',
								'sgs-blocks'
							) }
							help={ __(
								'Hover colours, shadows and movement stay on pointer hover only; keyboard focus shows the focus ring over the resting look.',
								'sgs-blocks'
							) }
							checked={ !! attributes.sgsFocusRests }
							onChange={ ( value ) =>
								setAttributes( { sgsFocusRests: !! value } )
							}
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withFocusRestsControl' );

addFilter(
	'editor.BlockEdit',
	'sgs/focus-rests/control',
	withFocusRestsControl
);
