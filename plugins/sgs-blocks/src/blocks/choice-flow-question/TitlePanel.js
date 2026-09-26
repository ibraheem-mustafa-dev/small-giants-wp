/**
 * "Title" inspector panel for `sgs/choice-flow-question` — D7 (2026-09-26
 * plan, Bean's review: "titles need more weight"). Lets an operator pick
 * the step heading's font-weight; render.php emits the resolved value as a
 * class (never inline style — Spec 32), see style.css's
 * `__title--w{weight}` rules.
 *
 * Extracted into its own file per this build's size cap (the main edit.js
 * is already over the 250-line JS guideline) — the main thread imports and
 * renders this component; see this feature's build report for the exact
 * wiring line.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import IntroField from './IntroField';

const WEIGHT_CHOICES = [
	{ label: __( 'Regular', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-bold', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (default)', 'sgs-blocks' ), value: '700' },
	{ label: __( 'Extra bold', 'sgs-blocks' ), value: '800' },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 */
export default function TitlePanel( { attributes, setAttributes } ) {
	const { questionFontWeight } = attributes;

	return (
		<PanelBody title={ __( 'Title', 'sgs-blocks' ) } initialOpen={ false }>
			<SelectControl
				label={ __( 'Question weight', 'sgs-blocks' ) }
				value={ questionFontWeight || '700' }
				options={ WEIGHT_CHOICES }
				onChange={ ( val ) => setAttributes( { questionFontWeight: val } ) }
				help={ __( 'How bold the step heading reads.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<IntroField attributes={ attributes } setAttributes={ setAttributes } />
		</PanelBody>
	);
}
