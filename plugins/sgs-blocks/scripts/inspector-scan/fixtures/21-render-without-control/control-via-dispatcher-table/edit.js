/**
 * NEGATIVE CONTROL for DISPATCHER-TABLE component resolution.
 *
 * This edit.js mounts <ContainerWrapperControls kind="layout" /> — the real
 * production façade at src/blocks/container/components/ContainerWrapperControls.js
 * — and nothing else. `contentWidth` is named nowhere in this file.
 *
 * It is not named in the façade's own code either. All six of its occurrences
 * there are COMMENTS, which the source cache strips, so the façade's full body
 * joining the corpus does not help. The attribute is owned by <WidthPanel>, one
 * file away.
 *
 * The façade's default export does not render <WidthPanel> as a JSX tag. It is a
 * TABLE-DRIVEN DISPATCHER: it reads `KIND_PANELS[ kind ]` and INVOKES each entry
 * as a function (`renderPanel({ ... })`). The only tags in its own body are
 * <InspectorControls> and <Fragment>. A resolver that recurses only on JSX tags
 * found inside the isolated export body therefore dead-ends and reports a false
 * defect — even though a client can set this control in the editor today.
 *
 * Measured on the live tree 2026-08-27: this shape produced 139 of rule 21's 211
 * FLAGGED findings, across the 16 blocks that mount this façade.
 *
 * ⛔ This fixture MUST FAIL before the dispatcher fix and pass after. It was
 * written and watched failing first. If it starts flagging again, same-file
 * reference-following has been removed or narrowed — do NOT delete the
 * assertion to make it green.
 *
 * Like control-via-nested-shared-component, this resolves against the REAL src/
 * tree, so it guards the production component graph rather than a copy of it.
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<ContainerWrapperControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				kind="layout"
			/>
		</InspectorControls>
	);
}
