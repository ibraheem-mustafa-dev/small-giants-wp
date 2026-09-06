import { InspectorControls } from '@wordpress/block-editor';
import SgsColourPanel from '../../../../src/components/SgsColourPanel';

// NEGATIVE CONTROL for the colour-row exemption: "a colour control that
// itself lives in more than one place" (D609 requires exactly ONE
// SgsColourPanel mount per block). This fixture is a genuine bug — the
// title's colour is split across TWO SEPARATE SgsColourPanel mounts, which
// is exactly 2 distinct panel locations but ZERO non-colour panels, so it
// must NOT satisfy the exemption's "one colour + one other panel" shape and
// must still be flagged as scattered.
export default function Edit( { attributes } ) {
	const { titleColourA, titleColourB } = attributes;
	return (
		<InspectorControls>
			<SgsColourPanel
				rows={ [
					{ key: 'title-a', label: 'Title (A)', states: [ { value: titleColourA } ] },
				] }
			/>
			<SgsColourPanel
				rows={ [
					{ key: 'title-b', label: 'Title (B)', states: [ { value: titleColourB } ] },
				] }
			/>
		</InspectorControls>
	);
}
