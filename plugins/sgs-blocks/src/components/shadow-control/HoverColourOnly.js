/**
 * The Hover tab of a block that has a hover shadow COLOUR but no hover shadow SHAPE. The
 * shape (how many layers, how far, how soft) is the Normal state's; only each layer's colour
 * and opacity can change on hover, so this shows one colour and opacity row per Normal layer.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import { parseStored, serialise } from '../../utils/shadow-model';
import ColourOpacity from './ColourOpacity';

/**
 * @param {Object}   props
 * @param {string}   props.baseValue    Normal-state shape text (sets the layer count).
 * @param {string}   props.baseColour   Normal-state colour text (used until hover is customised).
 * @param {string}   props.colour       Hover colour text.
 * @param {Function} props.onColourChange Receives the next hover colour text.
 */
export default function HoverColourOnly( { baseValue, baseColour, colour, onColourChange } ) {
	const source = colour && '' !== colour.trim() ? colour : baseColour;
	const parsed = parseStored( baseValue, source );
	if ( 'layers' !== parsed.kind ) {
		const single = parseStored( '0px 0px 0px 0px', source ).layers[ 0 ];
		return (
			<>
				<p className="sgs-shadow-control__note">
					{ 'preset' === parsed.kind
						? __( "This block uses a theme style, which brings its own colour. Pick one colour to use on hover instead.", 'sgs-blocks' )
						: __( 'Pick the shadow colour to use on hover.', 'sgs-blocks' ) }
				</p>
				<ColourOpacity
					colour={ single.colour }
					alpha={ single.alpha }
					onChange={ ( patch ) => onColourChange( serialise( [ { ...single, ...patch } ] ).colour ) }
				/>
			</>
		);
	}
	return (
		<>
			<p className="sgs-shadow-control__note">
				{ __( 'The shadow keeps its shape on hover. Only the colour and opacity of each layer change.', 'sgs-blocks' ) }
			</p>
			{ parsed.layers.map( ( layer, index ) =>
				layer.raw ? null : (
					<div className="sgs-shadow-control__section" key={ layer.id }>
						<strong>{ sprintf( /* translators: %d: layer number. */ __( 'Layer %d', 'sgs-blocks' ), index + 1 ) }</strong>
						<ColourOpacity
							colour={ layer.colour }
							alpha={ layer.alpha }
							onChange={ ( patch ) =>
								onColourChange( serialise( parsed.layers.map( ( l ) => ( l.id === layer.id ? { ...l, ...patch } : l ) ) ).colour )
							}
						/>
					</div>
				)
			) }
		</>
	);
}
