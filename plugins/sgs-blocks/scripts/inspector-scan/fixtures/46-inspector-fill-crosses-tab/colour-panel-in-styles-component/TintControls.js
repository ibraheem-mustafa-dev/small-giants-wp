import { SgsColourPanel, fillRow } from '../../components';

export default function TintControls( { attributes, setAttributes } ) {
	return (
		<>
			<SgsColourPanel
				rows={ [ fillRow( { key: 'tint', label: 'Tint', attrs: { base: 'tint' }, attributes, setAttributes } ) ] }
			/>
		</>
	);
}
