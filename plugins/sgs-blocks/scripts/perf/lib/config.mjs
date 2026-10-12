/**
 * Paths and constants shared by the editor typing harness (measure-editor-typing.mjs) and its lib/ modules.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The scripts/perf folder: the harness's home, where the default --out file goes. */
export const PERF_DIR = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
/** The repository root, four levels above scripts/perf. */
export const REPO_ROOT = path.resolve( PERF_DIR, '../../../..' );

/** A --compare run fails when p95 or heap is more than this fraction above the baseline. */
export const TOLERANCE = 0.10;
/** Width of the consecutive windows whose p95s make up the headline statistic. */
export const WINDOW_MS = 10000;
/** The default page: the 200-block fixture built from fixtures/editor-200-blocks.json. */
export const DEFAULT_PAGE = '5196';
export const TARGET_TEXT_INDEX = 12; // zero-based: the 13th sgs/text that sits directly in an sgs/container, in document order
