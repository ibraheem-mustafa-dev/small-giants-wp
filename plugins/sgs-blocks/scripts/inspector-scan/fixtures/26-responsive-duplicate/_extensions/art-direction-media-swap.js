/**
 * MUST NOT FLAG — the Spec 35 Part D5 art-direction shape.
 *
 * Mirrors BackgroundPanel.js:289 and :420 (the two live findings this fixture
 * was written to close, 2026-09-02). A per-device MEDIA SOURCE family is a
 * deliberate RUNTIME SWAP, not a scalar cascade: the desktop picker is the
 * always-visible base control, mounted OUTSIDE the wrapper on purpose, and the
 * wrapper carries only the optional tablet/mobile overrides. Its desktop
 * branch therefore renders help text BY DESIGN.
 *
 * ⛔ Structurally this is near-identical to `hollow-desktop-tier.js`, which is
 * a genuine bug and MUST keep flagging. The only mechanical difference is
 * WHICH control the branches mount: an asset picker (MediaUpload /
 * MediaUploadCheck) here, a scalar UnitControl there. That is exactly what
 * `isArtDirectionSwap()` keys on — plus the presence of a second picker
 * outside the wrapper, which is what proves the "base mounted outside" claim
 * rather than trusting the help-text branch on its own.
 *
 * Keep BOTH fixtures. Deleting either one lets the exemption drift into
 * suppressing the real cascade bug.
 */
export default function ArtDirectionMediaSwap( { attributes, setAttributes } ) {
	const { backgroundImage } = attributes;

	return (
		<>
			{ /* The always-visible BASE picker — deliberately outside the wrapper. */ }
			<MediaUploadCheck>
				<MediaUpload
					title="Background image"
					value={ backgroundImage }
					onSelect={ ( media ) => setAttributes( { backgroundImage: media.url } ) }
					render={ ( { open } ) => <Button onClick={ open }>Select image</Button> }
				/>
			</MediaUploadCheck>

			<ResponsiveControl label="Art direction (optional)">
				{ ( breakpoint ) => {
					if ( breakpoint === 'desktop' ) {
						return (
							<p className="sgs-inspector-help">
								The desktop image is set above. Add a tablet or mobile image only
								if it should be a different crop or composition.
							</p>
						);
					}
					const attrMap = {
						tablet: 'backgroundImageTablet',
						mobile: 'backgroundImageMobile',
					};
					return (
						<MediaUploadCheck>
							<MediaUpload
								value={ attributes[ attrMap[ breakpoint ] ] }
								onSelect={ ( media ) =>
									setAttributes( { [ attrMap[ breakpoint ] ]: media.url } )
								}
								render={ ( { open } ) => <Button onClick={ open }>Select image</Button> }
							/>
						</MediaUploadCheck>
					);
				} }
			</ResponsiveControl>
		</>
	);
}
