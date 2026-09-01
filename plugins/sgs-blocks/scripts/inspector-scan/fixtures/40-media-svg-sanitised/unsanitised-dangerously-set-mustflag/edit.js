// Fixture: mounts SVG-shaped content via dangerouslySetInnerHTML WITHOUT
// ever calling sanitiseSvg() anywhere in the file — the real bug this rule
// exists to catch.
export default function Edit( { attributes } ) {
	const { rawSvgMarkup } = attributes;

	return (
		<div>
			{ /* eslint-disable-next-line react/no-danger */ }
			<div
				className="fixture__svg"
				aria-hidden="true"
				dangerouslySetInnerHTML={ { __html: rawSvgMarkup } }
			/>
		</div>
	);
}
