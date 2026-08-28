/**
 * Fixture: definition -- a block ALREADY migrated onto <SgsBorderControl>.
 * Must classify 'already-done' and never be re-transformed.
 */
import { SgsBorderControl } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const { borderStyle, borderColour, borderWidth } = attributes;
	return (
		<PanelBody title={ __( 'Border', 'sgs-blocks' ) }>
			<SgsBorderControl
				widthValues={ borderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
				widthPresets={ [ '10', '20', '30' ] }
				styleValue={ borderStyle }
				onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourValue={ borderColour }
				onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
			/>
		</PanelBody>
	);
}
