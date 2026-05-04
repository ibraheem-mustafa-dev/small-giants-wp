/**
 * Custom SVG block icons for SGS Blocks.
 *
 * All icons use SGS teal (#0F7E80) foreground to distinguish
 * SGS blocks from WordPress core blocks in the inserter.
 *
 * @package SGS\Blocks
 */

import { SVG, Path, Circle, Rect } from '@wordpress/primitives';

const SGS_TEAL = '#0F7E80';

/* ─── HELPER ─── */

const icon = ( src ) => ( { src, foreground: SGS_TEAL } );

/* ═══════════════════════════════════════════════════════════
   LAYOUT BLOCKS
   ═══════════════════════════════════════════════════════════ */

/** Container — two-column layout box */
export const containerIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path
			fillRule="evenodd"
			d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 1.5a.5.5 0 00-.5.5v14a.5.5 0 00.5.5h5.75v-15H5zm7.25 0v15H19a.5.5 0 00.5-.5V5a.5.5 0 00-.5-.5h-6.75z"
		/>
	</SVG>
);

/** Hero — banner with star accent */
export const heroIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M3 5a1 1 0 011-1h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5zm1.5 1v6h15V6h-15zm0 7.5V18h15v-4.5h-15z" />
		<Path d="M8 9l.72 1.45 1.6.23-1.16 1.13.27 1.6L8 12.65l-1.43.76.27-1.6-1.16-1.13 1.6-.23L8 9z" />
	</SVG>
);

/* ═══════════════════════════════════════════════════════════
   CONTENT BLOCKS
   ═══════════════════════════════════════════════════════════ */

/** Info Box — rounded square with "i" */
export const infoBoxIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path
			fillRule="evenodd"
			d="M4 4a4 4 0 014-4h8a4 4 0 014 4v16a4 4 0 01-4 4H8a4 4 0 01-4-4V4zm8 3a1.25 1.25 0 100-2.5A1.25 1.25 0 0012 7zm-1.25 3a1.25 1.25 0 012.5 0v7a1.25 1.25 0 01-2.5 0v-7z"
		/>
	</SVG>
);

/** Counter — rising bar chart */
export const counterIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="14" width="4" height="7" rx="1" />
		<Rect x="10" y="9" width="4" height="12" rx="1" />
		<Rect x="17" y="3" width="4" height="18" rx="1" />
	</SVG>
);

/** Trust Bar — shield with checkmark */
export const trustBarIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path
			fillRule="evenodd"
			d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 14.59l-3.3-3.3 1.41-1.41 1.89 1.88 5.18-5.18 1.41 1.42-6.59 6.59z"
		/>
	</SVG>
);

/** Icon List — stacked check items */
export const iconListIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M4.5 5.5L6 7l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		<Rect x="11" y="4" width="9" height="2" rx="1" />
		<Path d="M4.5 11.5L6 13l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		<Rect x="11" y="11" width="9" height="2" rx="1" />
		<Path d="M4.5 17.5L6 19l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		<Rect x="11" y="17" width="9" height="2" rx="1" />
	</SVG>
);

/** Card Grid — 2×2 grid of cards */
export const cardGridIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="3" width="8" height="8" rx="1.5" />
		<Rect x="13" y="3" width="8" height="8" rx="1.5" />
		<Rect x="3" y="13" width="8" height="8" rx="1.5" />
		<Rect x="13" y="13" width="8" height="8" rx="1.5" />
	</SVG>
);

/** CTA Section — button with forward arrow */
export const ctaSectionIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="2" y="6" width="20" height="12" rx="2" />
		<Path d="M10 12h5m0 0l-2-2m2 2l-2 2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</SVG>
);

/** Process Steps — three connected numbered circles */
export const processStepsIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Circle cx="4.5" cy="12" r="3.5" />
		<Circle cx="12" cy="12" r="3.5" />
		<Circle cx="19.5" cy="12" r="3.5" />
		<Rect x="8" y="11" width="1" height="2" fill="white" />
		<Rect x="15" y="11" width="1" height="2" fill="white" />
	</SVG>
);

/** Testimonial — opening quotation mark */
export const testimonialIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
	</SVG>
);

/** Testimonial Slider — quote with navigation dots */
export const testimonialSliderIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M7 14h2l1.5-3V6H6v5h2l-1 3zm6 0h2l1.5-3V6h-4.5v5h2l-1 3z" />
		<Circle cx="8" cy="20" r="1.5" />
		<Circle cx="12" cy="20" r="1.5" fillOpacity="0.35" />
		<Circle cx="16" cy="20" r="1.5" fillOpacity="0.35" />
	</SVG>
);

/** Heritage Strip — open book / history */
export const heritageStripIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M12 4C10.08 2.8 7.64 2 5 2 3.9 2 2.84 2.12 1.84 2.35A.5.5 0 001.5 2.84V18.5a.5.5 0 00.62.48C3.06 18.68 4.02 18.5 5 18.5c2.4 0 4.64.88 6.36 2.33a.5.5 0 00.64.04V4.55a.5.5 0 00-.01-.08A.47.47 0 0012 4z" />
		<Path d="M12 4c1.92-1.2 4.36-2 7-2 1.1 0 2.16.12 3.16.35a.5.5 0 01.34.49V18.5a.5.5 0 01-.62.48c-.94-.3-1.9-.48-2.88-.48-2.4 0-4.64.88-6.36 2.33a.5.5 0 01-.64.04V4.55a.5.5 0 01.01-.08.47.47 0 00-.01-.47z" fillOpacity="0.65" />
	</SVG>
);

/** Brand Strip — row of diamond logos */
export const brandStripIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M5 8l3 4-3 4-3-4 3-4z" />
		<Path d="M12 8l3 4-3 4-3-4 3-4z" />
		<Path d="M19 8l3 4-3 4-3-4 3-4z" />
	</SVG>
);

/** Certification Bar — medal / ribbon badge */
export const certificationBarIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Circle cx="12" cy="9" r="7" />
		<Path d="M12 9l1.12 2.27 2.5.37-1.81 1.76.43 2.5L12 14.78l-2.24 1.12.43-2.5-1.81-1.76 2.5-.37L12 9z" fill="white" />
		<Path d="M8.5 15.5L7 22l5-2.5L17 22l-1.5-6.5" fillOpacity="0.65" />
	</SVG>
);

/** Notice Banner — bell with notification dot */
export const noticeBannerIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M12 2a1 1 0 011 1v1.07A6.002 6.002 0 0118 10v4l2 2H4l2-2v-4a6.002 6.002 0 015-5.93V3a1 1 0 011-1z" />
		<Path d="M10 18a2 2 0 104 0" />
		<Circle cx="17" cy="5" r="3" />
	</SVG>
);

/** WhatsApp CTA — official WhatsApp brand logo */
export const whatsappCtaIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
	</SVG>
);

/* ═══════════════════════════════════════════════════════════
   FORM BLOCKS
   ═══════════════════════════════════════════════════════════ */

/** Form — clipboard with field lines */
export const formIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path
			fillRule="evenodd"
			d="M10 2a2 2 0 00-2 2H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2-2h-4zm0 1.5h4a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-4a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z"
		/>
		<Rect x="8" y="9" width="8" height="1.5" rx="0.75" fill="white" />
		<Rect x="8" y="12.5" width="6" height="1.5" rx="0.75" fill="white" />
		<Rect x="8" y="16" width="7" height="1.5" rx="0.75" fill="white" />
	</SVG>
);

/** Form Step — numbered step circles */
export const formStepIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Circle cx="5" cy="12" r="4" />
		<Circle cx="19" cy="12" r="4" fillOpacity="0.35" />
		<Rect x="9" y="11" width="6" height="2" rx="1" fillOpacity="0.5" />
		<Path d="M4.4 10.5h1.2v3H4.4v-3z" fill="white" />
	</SVG>
);

/** Form Field Text — single text input line */
export const formFieldTextIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="2" y="7" width="20" height="10" rx="2" fillOpacity="0.15" />
		<Rect x="2" y="7" width="20" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Rect x="5" y="10.5" width="1.5" height="3" rx="0.5" />
		<Rect x="8" y="11" width="6" height="2" rx="0.75" fillOpacity="0.4" />
	</SVG>
);

/** Form Field Email — envelope */
export const formFieldEmailIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2-.5L12 11l8-5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
		<Rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
	</SVG>
);

/** Form Field Phone — telephone handset */
export const formFieldPhoneIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
	</SVG>
);

/** Form Field Textarea — multi-line text area */
export const formFieldTextareaIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="2" y="3" width="20" height="18" rx="2" fillOpacity="0.15" />
		<Rect x="2" y="3" width="20" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Rect x="5" y="7" width="10" height="1.5" rx="0.75" />
		<Rect x="5" y="10.5" width="14" height="1.5" rx="0.75" fillOpacity="0.5" />
		<Rect x="5" y="14" width="8" height="1.5" rx="0.75" fillOpacity="0.5" />
	</SVG>
);

/** Form Field Select — dropdown box with chevron */
export const formFieldSelectIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="2" y="7" width="20" height="10" rx="2" fillOpacity="0.15" />
		<Rect x="2" y="7" width="20" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Rect x="5" y="11" width="8" height="2" rx="0.75" fillOpacity="0.5" />
		<Path d="M17 10.5l2 2.5-2 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(90 18 12.75)" />
	</SVG>
);

/** Form Field Radio — circle with inner dot */
export const formFieldRadioIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Circle cx="12" cy="12" r="4.5" />
	</SVG>
);

/** Form Field Checkbox — square with checkmark */
export const formFieldCheckboxIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="3" width="18" height="18" rx="3" />
		<Path d="M7.5 12l3 3 6-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
	</SVG>
);

/** Form Field Tiles — selectable tile grid */
export const formFieldTilesIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="3" width="8" height="8" rx="1.5" />
		<Rect x="13" y="3" width="8" height="8" rx="1.5" fillOpacity="0.35" />
		<Rect x="3" y="13" width="8" height="8" rx="1.5" fillOpacity="0.35" />
		<Rect x="13" y="13" width="8" height="8" rx="1.5" fillOpacity="0.35" />
		<Path d="M5 7l1.5 1.5L9 5.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</SVG>
);

/** Form Field File — cloud upload */
export const formFieldFileIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M6.34 8.16A5.5 5.5 0 0112 4a5.5 5.5 0 015.28 3.95A4.002 4.002 0 0118 16H6a4 4 0 01-.66-7.94L6.34 8.16z" />
		<Path d="M12 12v5m0-5l-2 2m2-2l2 2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</SVG>
);

/** Form Field Consent — shield with lock */
export const formFieldConsentIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
		<Rect x="10" y="10" width="4" height="5" rx="1" fill="white" />
		<Path d="M10.5 10V8.5a1.5 1.5 0 013 0V10" fill="none" stroke="white" strokeWidth="1.5" />
	</SVG>
);

/** Form Field Date — calendar */
export const formFieldDateIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="4" width="18" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
		<Circle cx="8" cy="14" r="1.5" />
		<Circle cx="12" cy="14" r="1.5" />
		<Circle cx="16" cy="14" r="1.5" />
		<Rect x="7" y="2" width="1.5" height="4" rx="0.5" />
		<Rect x="15.5" y="2" width="1.5" height="4" rx="0.5" />
	</SVG>
);

/** Form Field Number — hash symbol with input */
export const formFieldNumberIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="2" y="7" width="20" height="10" rx="2" fillOpacity="0.15" />
		<Rect x="2" y="7" width="20" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Path d="M8 9.5v5M11 9.5v5M6 11.5h5M6 13.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
		<Rect x="14" y="11" width="5" height="2" rx="0.75" fillOpacity="0.5" />
	</SVG>
);

/** Form Field Hidden — eye with slash */
export const formFieldHiddenIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="2" y="7" width="20" height="10" rx="2" fillOpacity="0.15" />
		<Rect x="2" y="7" width="20" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Path d="M4 12c1.5-3 4.5-5 8-5s6.5 2 8 5c-1.5 3-4.5 5-8 5s-6.5-2-8-5z" fillOpacity="0.3" />
		<Circle cx="12" cy="12" r="2" />
		<Path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
	</SVG>
);

/** Form Field Address — location pin with address lines */
export const formFieldAddressIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M12 2a7 7 0 00-7 7c0 4.5 7 13 7 13s7-8.5 7-13a7 7 0 00-7-7z" />
		<Circle cx="12" cy="9" r="2.5" fill="white" />
		<Rect x="3" y="16" width="9" height="1.5" rx="0.75" fillOpacity="0.5" />
		<Rect x="3" y="19" width="7" height="1.5" rx="0.75" fillOpacity="0.5" />
	</SVG>
);

/** Form Review — clipboard with tick */
export const formReviewIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path
			fillRule="evenodd"
			d="M10 2a2 2 0 00-2 2H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2-2h-4zm0 1.5h4a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-4a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z"
		/>
		<Path d="M8.5 13l2.5 2.5L16 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
	</SVG>
);

/** Table of Contents — nested list with connector line */
export const tableOfContentsIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="3" width="12" height="2" rx="1" />
		<Rect x="6" y="7.5" width="10" height="1.5" rx="0.75" fillOpacity="0.6" />
		<Rect x="6" y="11" width="9" height="1.5" rx="0.75" fillOpacity="0.6" />
		<Rect x="9" y="14.5" width="8" height="1.5" rx="0.75" fillOpacity="0.4" />
		<Rect x="6" y="18" width="11" height="1.5" rx="0.75" fillOpacity="0.6" />
		<Rect x="3" y="7" width="1.5" height="14" rx="0.5" fillOpacity="0.3" />
	</SVG>
);

/* ═══════════════════════════════════════════════════════════
   INTERACTIVE BLOCKS
   ═══════════════════════════════════════════════════════════ */

/** Accordion — stacked expandable sections */
export const accordionIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="2" width="18" height="5" rx="1.5" />
		<Path d="M16.5 4.5l-1 1-1-1" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
		<Rect x="3" y="9" width="18" height="5" rx="1.5" fillOpacity="0.5" />
		<Rect x="3" y="16" width="18" height="5" rx="1.5" fillOpacity="0.35" />
	</SVG>
);

/** Accordion Item — single expandable section */
export const accordionItemIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="3" width="18" height="18" rx="2" fillOpacity="0.15" />
		<Rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Rect x="6" y="7" width="8" height="2" rx="0.75" />
		<Path d="M16 7l1.5 1.5L19 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		<Rect x="6" y="12" width="12" height="1.5" rx="0.75" fillOpacity="0.4" />
		<Rect x="6" y="15.5" width="9" height="1.5" rx="0.75" fillOpacity="0.4" />
	</SVG>
);

/** Tabs — horizontal tab bar with content panel */
export const tabsIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="3" width="5" height="4" rx="1" />
		<Rect x="9.5" y="3" width="5" height="4" rx="1" fillOpacity="0.4" />
		<Rect x="16" y="3" width="5" height="4" rx="1" fillOpacity="0.4" />
		<Rect x="3" y="7" width="18" height="14" rx="1.5" fillOpacity="0.15" />
		<Rect x="3" y="7" width="18" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Rect x="6" y="11" width="10" height="1.5" rx="0.75" fillOpacity="0.5" />
		<Rect x="6" y="14.5" width="7" height="1.5" rx="0.75" fillOpacity="0.35" />
	</SVG>
);

/** Tab — single tab panel */
export const tabIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="3" width="18" height="18" rx="2" fillOpacity="0.15" />
		<Rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
		<Rect x="3" y="3" width="6" height="4" rx="1" />
		<Rect x="6" y="10" width="12" height="1.5" rx="0.75" fillOpacity="0.5" />
		<Rect x="6" y="13.5" width="9" height="1.5" rx="0.75" fillOpacity="0.35" />
	</SVG>
);

/** Feature Grid — 4-cell grid representing info-box layout */
export const featureGridIcon = icon(
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Rect x="3" y="3" width="8" height="8" rx="1.5" />
		<Rect x="13" y="3" width="8" height="8" rx="1.5" fillOpacity="0.5" />
		<Rect x="3" y="13" width="8" height="8" rx="1.5" fillOpacity="0.5" />
		<Rect x="13" y="13" width="8" height="8" rx="1.5" fillOpacity="0.25" />
	</SVG>
);
