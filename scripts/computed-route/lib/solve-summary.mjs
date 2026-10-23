// The run summary lines solve.mjs prints. confirmLiveLine: the live judge's result (lib/confirm-live.mjs::writeConfirmLive's
// { file, counts, unmapped: { held, raised } }) as one line, the confirm verdict counts beside the UNMAPPED rows it held
// (the built page already paints the draft's value) and raised (it does not).
export function confirmLiveLine( cl ) {
	const held = cl?.unmapped?.held;
	const raised = cl?.unmapped?.raised;
	const unmapped = Number.isInteger( held ) && Number.isInteger( raised ) ? `; unmapped held ${ held }, raised ${ raised }` : '; unmapped not judged';
	return `confirm-live: ${ JSON.stringify( cl?.counts ?? {} ) }${ unmapped } -> ${ cl?.file }`;
}
