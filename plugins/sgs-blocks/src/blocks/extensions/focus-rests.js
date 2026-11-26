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
 * The switch is one block-wide row, not a panel (Bean, 2026-11-25). Where it sits is `focus-switch-home.json`
 * (written by `scripts/check-focus-switch-home.js --write`): the top of the motion Hover panel for a block that
 * declares motion, the shared Colour panel for a block with no Hover panel that holds a hover colour, and nowhere for a
 * block with neither (a switch with nothing to act on). The attribute is registered on every block either way.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { isExtensionHidden } from './hide-extensions';
import { SgsBlockWideRowsFill } from '../../components/SgsBlockWideRows';
import HOMES from './focus-switch-home.json';

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

/**
 * Where a block's switch sits: 'hover', 'colour' or '' (not drawn). A block the data does not list falls back on its
 * motion declaration, so a block added later still gets the Hover row.
 *
 * @param {string} name Block name.
 * @return {string} The home.
 */
export function focusSwitchHome( name ) {
	if ( Object.prototype.hasOwnProperty.call( HOMES.blocks, name ) ) {
		return HOMES.blocks[ name ];
	}
	return getBlockType( name )?.supports?.sgs?.motion ? 'hover' : '';
}

const withFocusRestsControl = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, name, isSelected } = props;
		const home = isSelected && receivesFocusRests( name ) ? focusSwitchHome( name ) : '';
		if ( ! home ) {
			return <BlockEdit { ...props } />;
		}
		return (
			<>
				<BlockEdit { ...props } />
				<SgsBlockWideRowsFill home={ home }>
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
				</SgsBlockWideRowsFill>
			</>
		);
	};
}, 'withFocusRestsControl' );

addFilter(
	'editor.BlockEdit',
	'sgs/focus-rests/control',
	withFocusRestsControl
);
