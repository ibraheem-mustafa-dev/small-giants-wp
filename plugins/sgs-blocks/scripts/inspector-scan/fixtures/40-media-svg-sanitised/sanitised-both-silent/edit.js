// Fixture: correctly sanitised on the JS side — proves the rule does not
// flag every dangerouslySetInnerHTML mounting SVG-shaped content, only
// unsanitised ones.
import { sanitiseSvg } from '../../utils';

export default function Edit( { attributes } ) {
	const { svgContent } = attributes;

	return (
		<div>
			{ /* eslint-disable-next-line react/no-danger */ }
			<div
				className="fixture__svg"
				aria-hidden="true"
				dangerouslySetInnerHTML={ { __html: sanitiseSvg( svgContent ) } }
			/>
		</div>
	);
}
