import { PanelColorSettings } from '@wordpress/block-editor';

export default function Panel( { colour, onChange } ) {
	return <PanelColorSettings colorSettings={ [ { value: colour, onChange, label: 'Colour' } ] } />;
}
