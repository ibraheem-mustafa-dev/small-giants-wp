import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import { MotionEasingControl, SgsLengthControl } from '../../components';

/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — the accordion expander's
 * caret styling, mounted inside `RowExtrasPanel` beside the expander icon and
 * its open turn. The same seven attributes `sgs/nav-bar-menu` uses for its
 * dropdown arrow (size, gap, resting and hover opacity, turn time and curve),
 * painted onto `.sgs-nav-drawer-menu__caret` by
 * `includes/nav-menu-caret-css.php::sgs_nav_menu_caret_css`.
 *
 * Attribute names are read from `attributes` here; the panel that mounts this
 * receives the full `attributes` object from edit.js.
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    Block attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function ExpanderCaretControls( { attributes, setAttributes } ) {
	const {
		submenuCaretSize,
		submenuCaretGap,
		submenuCaretOpacity,
		submenuCaretOpacityHover,
		submenuCaretTurnDuration,
		submenuCaretTurnEasing,
		submenuCaretTurnEasingCustom,
	} = attributes;

	return (
		<>
			<SgsLengthControl
				label={ __( 'Expander size', 'sgs-blocks' ) }
				value={ submenuCaretSize || '' }
				onChange={ ( value ) =>
					setAttributes( { submenuCaretSize: value || '' } )
				}
				help={ __( 'Empty rides the row’s own font size.', 'sgs-blocks' ) }
				units={ [ { value: 'px', label: 'px' } ] }
				presets={ false }
			/>
			<SgsLengthControl
				label={ __( 'Gap from the label', 'sgs-blocks' ) }
				value={ submenuCaretGap || '' }
				onChange={ ( value ) =>
					setAttributes( { submenuCaretGap: value || '' } )
				}
				help={ __(
					'For a row that opens as a whole (an item with no page of its own). A row with a page keeps its expander pinned to the row end as a separate touch target.',
					'sgs-blocks'
				) }
				units={ [ { value: 'px', label: 'px' } ] }
				presets={ false }
			/>
			<RangeControl
				label={ __( 'Expander opacity at rest', 'sgs-blocks' ) }
				value={
					typeof submenuCaretOpacity === 'number'
						? submenuCaretOpacity
						: undefined
				}
				min={ 0 }
				max={ 1 }
				step={ 0.05 }
				allowReset
				onChange={ ( value ) =>
					setAttributes( { submenuCaretOpacity: value } )
				}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Expander opacity on hover', 'sgs-blocks' ) }
				value={
					typeof submenuCaretOpacityHover === 'number'
						? submenuCaretOpacityHover
						: undefined
				}
				min={ 0 }
				max={ 1 }
				step={ 0.05 }
				allowReset
				onChange={ ( value ) =>
					setAttributes( { submenuCaretOpacityHover: value } )
				}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Expander turn time (ms)', 'sgs-blocks' ) }
				help={ __(
					'How long the expander takes to turn as its section opens. Empty keeps the default 200ms.',
					'sgs-blocks'
				) }
				value={
					typeof submenuCaretTurnDuration === 'number'
						? submenuCaretTurnDuration
						: undefined
				}
				min={ 0 }
				max={ 1000 }
				step={ 10 }
				allowReset
				onChange={ ( value ) =>
					setAttributes( { submenuCaretTurnDuration: value } )
				}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<MotionEasingControl
				label={ __( 'Expander turn curve', 'sgs-blocks' ) }
				value={ submenuCaretTurnEasing }
				custom={ submenuCaretTurnEasingCustom }
				fallback="ease"
				onChange={ ( value ) =>
					setAttributes( { submenuCaretTurnEasing: value } )
				}
				onCustomChange={ ( value ) =>
					setAttributes( { submenuCaretTurnEasingCustom: value } )
				}
			/>
		</>
	);
}
