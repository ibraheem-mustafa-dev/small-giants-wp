/**
 * ResponsiveBoxControls: the one shared "Spacing" inspector panel (Spec 37 FR-37-16, Spec 49 §9.5).
 *
 * Every block that owns `padding` and `margin` tier objects mounts this panel instead of building its own Padding and
 * Margin pair. It edits the ONE `{desktop,tablet,mobile}` object model through the SGS-owned `ResponsiveOverride`
 * device switcher, with `SgsBoxControl` (four sides, linked or unlinked, a preset select plus value and unit per side,
 * the `BOX_UNITS` units) inside each row. Attribute names and shapes are the block's own: `padding` and `margin`.
 *
 * What the panel reads from the block, so no mount passes it:
 * - Which rows to show: a Padding row when the block declares `padding`, a Margin row when it declares `margin`
 *   (`getBlockType( name ).attributes`). A block that owns only one shows only that one. With no registered block (a
 *   test) both show.
 * - The side defaults a block's stylesheet paints on an untouched side (`utils/spacing-defaults.js::spacingDefaultsFor`,
 *   resolved for the device being edited and the block's settings).
 * - The paired Vertical / Horizontal mode (`block.json::supports.sgs.spacingAxes`, `utils/spacing-axes.js`).
 *
 * Max width and Content width are off unless the mount passes `showMaxWidth` or `showContentWidth` (gallery passes
 * both). `title` defaults to "Spacing".
 *
 * Per-side inheritance is handled by the PHP emitter (`sgs_responsive_normalise_object` + per-side null-coalesce): a
 * blank side on tablet or mobile inherits the tier above. The editor writes only the tier the operator touched;
 * `ResponsiveOverride` supplies the inherited-value indicator and the keyboard reset (WCAG 2.2).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockEditContext } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import { PanelBody, SelectControl } from '@wordpress/components';
import SgsBoxControl from './SgsBoxControl';
import ResponsiveOverride from './ResponsiveOverride';
import SgsLengthControl from './SgsLengthControl';
import { normaliseResponsiveBox, BOX_UNITS } from './ResponsiveBoxControl';
import { spacingDefaultsFor } from '../utils/spacing-defaults';
import { spacingAxesFor } from '../utils/spacing-axes';

/** contentWidth tokens: mirror the PHP resolver (normal gives content-size, wide gives wide-size, full is no cap). */
const CONTENT_WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Normal (content width)', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Wide', 'sgs-blocks' ), value: 'wide' },
];

/**
 * One tier-object box row (Padding or Margin).
 *
 * @param {Object}   props
 * @param {string}   props.attr          'padding' or 'margin'.
 * @param {string}   props.label         Visible label.
 * @param {string}   props.blockName     Registered block name, for defaults and axes.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @return {JSX.Element} The row.
 */
function BoxRow( { attr, label, blockName, attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			label={ label }
			value={ attributes[ attr ] }
			onChange={ ( obj ) => setAttributes( { [ attr ]: obj } ) }
		>
			{ ( { tier, ownValue, setOwnValue } ) => (
				<SgsBoxControl
					label={ label }
					values={
						ownValue && typeof ownValue === 'object' ? ownValue : {}
					}
					units={ BOX_UNITS }
					presets
					defaults={
						blockName
							? spacingDefaultsFor( blockName, attr, {
									attributes,
									tier,
							  } )
							: undefined
					}
					splitOnAxis={
						blockName ? spacingAxesFor( blockName, attr ) : false
					}
					onChange={ ( next ) =>
						setOwnValue( normaliseResponsiveBox( next ) )
					}
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes               Block attributes ({ padding, margin, maxWidth, contentWidth }).
 * @param {Function} props.setAttributes            Block setAttributes.
 * @param {string}   [props.title='Spacing']        Panel title.
 * @param {boolean}  [props.initialOpen=false]      PanelBody initial state.
 * @param {string}   [props.blockName]              Registered block name; defaults to the block being edited.
 * @param {boolean}  [props.showMaxWidth=false]     Show the Max width row (the block owns `maxWidth`).
 * @param {boolean}  [props.showContentWidth=false] Show the Content width row (the block owns `contentWidth`).
 * @return {JSX.Element} The inspector panel.
 */
export default function ResponsiveBoxControls( {
	attributes,
	setAttributes,
	title = __( 'Spacing', 'sgs-blocks' ),
	initialOpen = false,
	blockName: blockNameProp = '',
	showMaxWidth = false,
	showContentWidth = false,
} ) {
	const context = useBlockEditContext();
	const blockName = blockNameProp || context?.name || '';
	const declared = blockName ? getBlockType( blockName )?.attributes : null;
	const owns = ( attr ) => ! declared || attr in declared;
	const { maxWidth, contentWidth } = attributes;

	return (
		<PanelBody title={ title } initialOpen={ initialOpen }>
			{ /* No wrapper label on the BoxControl: core's BoxControl paints its own label unconditionally and has no
			     hideLabelFromVision handling, so `ResponsiveOverride` draws the visible label with the Tablet and
			     Mobile markers and hides the control's duplicate (hideDuplicateLabels). */ }
			{ owns( 'padding' ) && (
				<BoxRow
					attr="padding"
					label={ __( 'Padding', 'sgs-blocks' ) }
					blockName={ blockName }
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			) }
			{ owns( 'margin' ) && (
				<BoxRow
					attr="margin"
					label={ __( 'Margin', 'sgs-blocks' ) }
					blockName={ blockName }
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			) }

			{ showMaxWidth && (
				<ResponsiveOverride
					label={ __( 'Max width', 'sgs-blocks' ) }
					value={ maxWidth }
					onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
				>
					{ ( {
						ownValue,
						effectiveValue,
						inherited,
						setOwnValue,
					} ) => (
						<SgsLengthControl
							label={ __( 'Max width', 'sgs-blocks' ) }
							hideLabelFromVision
							units={ BOX_UNITS }
							value={ ownValue || '' }
							placeholder={ inherited ? effectiveValue : '' }
							onChange={ ( v ) => setOwnValue( v || '' ) }
						/>
					) }
				</ResponsiveOverride>
			) }

			{ showContentWidth && (
				<ResponsiveOverride
					label={ __( 'Content width', 'sgs-blocks' ) }
					value={ contentWidth }
					onChange={ ( obj ) =>
						setAttributes( { contentWidth: obj } )
					}
				>
					{ ( { tier, ownValue, setOwnValue } ) => (
						<SelectControl
							label={ __( 'Content width', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ ownValue || '' }
							options={
								tier === 'desktop'
									? CONTENT_WIDTH_OPTIONS
									: [
											{
												label: __(
													'— inherit —',
													'sgs-blocks'
												),
												value: '',
											},
											...CONTENT_WIDTH_OPTIONS,
									  ]
							}
							onChange={ ( v ) => setOwnValue( v ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveOverride>
			) }
		</PanelBody>
	);
}
