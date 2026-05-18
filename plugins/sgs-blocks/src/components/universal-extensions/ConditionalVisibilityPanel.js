/**
 * ConditionalVisibilityPanel — shared Inspector panel for conditional block visibility.
 *
 * Renders login state, user role, date range, day-of-week, URL parameter, and
 * referrer visibility conditions. This component is a convenience wrapper around
 * the controls already provided globally by
 * src/blocks/extensions/conditional-visibility.js (which registers them on all
 * blocks via addFilter('editor.BlockEdit')). Use this panel directly inside a
 * block's edit.js when you want the controls at a specific inspector position
 * rather than appended to the end.
 *
 * NOTE: conditional-visibility.js already wires these controls to every block
 * globally. Only import this component if you need custom placement.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
} from '@wordpress/components';

const LOGIN_OPTIONS = [
	{ label: __( 'Always (no restriction)', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Logged-in users only', 'sgs-blocks' ), value: 'logged-in' },
	{ label: __( 'Logged-out visitors only', 'sgs-blocks' ), value: 'logged-out' },
];

/**
 * ConditionalVisibilityPanel component.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes object.
 * @param {Function} props.setAttributes Block setAttributes callback.
 * @return {JSX.Element} Inspector panel.
 */
export default function ConditionalVisibilityPanel( { attributes, setAttributes } ) {
	const {
		sgsConditionLoggedIn,
		sgsConditionDateStart,
		sgsConditionDateEnd,
		sgsConditionUrlParam,
		sgsConditionReferrer,
	} = attributes;

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Visibility Conditions', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SelectControl
					label={ __( 'Login state', 'sgs-blocks' ) }
					help={ __( 'Restrict who sees this block.', 'sgs-blocks' ) }
					value={ sgsConditionLoggedIn || 'none' }
					options={ LOGIN_OPTIONS }
					onChange={ ( val ) =>
						setAttributes( { sgsConditionLoggedIn: val } )
					}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={ __( 'Show from (YYYY-MM-DD)', 'sgs-blocks' ) }
					help={ __( 'Block hidden before this date. Leave empty for no start restriction.', 'sgs-blocks' ) }
					value={ sgsConditionDateStart || '' }
					onChange={ ( val ) =>
						setAttributes( { sgsConditionDateStart: val } )
					}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={ __( 'Show until (YYYY-MM-DD)', 'sgs-blocks' ) }
					help={ __( 'Block hidden after this date. Leave empty for no end restriction.', 'sgs-blocks' ) }
					value={ sgsConditionDateEnd || '' }
					onChange={ ( val ) =>
						setAttributes( { sgsConditionDateEnd: val } )
					}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={ __( 'URL parameter (key=value)', 'sgs-blocks' ) }
					help={ __( 'Only show when this GET param is present, e.g. "promo=summer".', 'sgs-blocks' ) }
					value={ sgsConditionUrlParam || '' }
					onChange={ ( val ) =>
						setAttributes( { sgsConditionUrlParam: val } )
					}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={ __( 'Referrer contains', 'sgs-blocks' ) }
					help={ __( 'Only show when HTTP referrer contains this string.', 'sgs-blocks' ) }
					value={ sgsConditionReferrer || '' }
					onChange={ ( val ) =>
						setAttributes( { sgsConditionReferrer: val } )
					}
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</InspectorControls>
	);
}
