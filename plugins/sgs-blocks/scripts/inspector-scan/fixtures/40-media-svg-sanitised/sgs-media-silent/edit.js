// Fixture mirroring src/blocks/media/edit.js:24,491 — the confirmed-correct
// JS-side pattern: sanitiseSvg() wraps the dangerouslySetInnerHTML value.
import { sanitiseSvg } from '../../utils';

export default function Edit( { attributes } ) {
	const { svgContent } = attributes;

	return (
		<div>
			{ /* eslint-disable-next-line react/no-danger */ }
			<div
				className="sgs-media__svg"
				aria-hidden="true"
				dangerouslySetInnerHTML={ { __html: sanitiseSvg( svgContent ) } }
			/>
		</div>
	);
}
