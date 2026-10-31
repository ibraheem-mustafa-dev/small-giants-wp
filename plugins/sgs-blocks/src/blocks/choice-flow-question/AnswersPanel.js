/**
 * "Answers to pick" inspector panel for `sgs/choice-flow-question` (Spec 43 FR-43-27): the least and the most
 * answers a shopper may pick. Shown only on a plain question: a priced add-on step (`priceGroup`) or a
 * product-option step (`productAttribute`) takes one answer.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { VStack, NumberControl } from '../../components/primitives';

const LIMIT = 12;

/**
 * @param {number} value Raw control value.
 * @param {number} floor Lowest allowed.
 * @param {number} ceil  Highest allowed.
 * @return {number} The value as an integer between floor and ceil.
 */
function clamp( value, floor, ceil ) {
	const n = parseInt( value, 10 );
	return Number.isInteger( n ) ? Math.min( Math.max( n, floor ), ceil ) : floor;
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {JSX.Element|null} The panel, or null on a priced question.
 */
export default function AnswersPanel( { attributes, setAttributes } ) {
	if ( attributes.priceGroup || attributes.productAttribute ) {
		return null;
	}
	const max = clamp( attributes.answersMax, 1, LIMIT );
	const min = clamp( attributes.answersMin, 1, max );

	return (
		<PanelBody title={ __( 'Answers to pick', 'sgs-blocks' ) } initialOpen={ false }>
			<VStack spacing={ 3 }>
				<NumberControl
					label={ __( 'Fewest answers', 'sgs-blocks' ) }
					value={ min }
					min={ 1 }
					max={ max }
					onChange={ ( v ) => setAttributes( { answersMin: clamp( v, 1, max ) } ) }
					__next40pxDefaultSize
				/>
				<NumberControl
					label={ __( 'Most answers', 'sgs-blocks' ) }
					value={ max }
					min={ 1 }
					max={ LIMIT }
					onChange={ ( v ) => {
						const next = clamp( v, 1, LIMIT );
						setAttributes( { answersMax: next, answersMin: Math.min( min, next ) } );
					} }
					help={ __( 'Above 1 the options become toggles, Continue waits for the fewest, and a pick past the most is refused with a message. A priced step takes one answer.', 'sgs-blocks' ) }
					__next40pxDefaultSize
				/>
			</VStack>
		</PanelBody>
	);
}
