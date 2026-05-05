#!/usr/bin/env node
/**
 * wp-update-block-attrs.js
 *
 * Reusable Playwright helper that updates a block's attributes on a live
 * WordPress post by going through the editor — using
 *   wp.blocks.createBlock(name, attrs, innerBlocks)
 *   wp.data.dispatch('core/block-editor').replaceBlock(clientId, fresh)
 * instead of updateBlockAttributes(). The replaceBlock workaround bypasses
 * the silent rejection that happens when a stored block instance's HTML
 * doesn't match what the current save.js would produce ("invalid block
 * content"). updateBlockAttributes appears to update the editor state but
 * the change is dropped on save. createBlock + replaceBlock side-steps that.
 *
 * ============================================================================
 * WHEN TO USE (operator-friendly, plain English)
 * ----------------------------------------------------------------------------
 * Use this script whenever you need to change the settings on a block that's
 * already been placed on a live page or post — for example, changing the
 * headline colour on a hero, or swapping the call-to-action text — and you
 * want the change to actually stick. WordPress sometimes silently rejects
 * attribute updates on older block instances; this script avoids that trap by
 * rebuilding the block fresh in the editor and saving the page. You give it
 * the site, the post ID, the block name, and a JSON file of the new
 * attributes you want — it logs in, applies the change, saves, and verifies
 * the change actually persisted via the REST API. If anything goes wrong it
 * exits with a clear error code so automation can react.
 * ============================================================================
 *
 * Usage:
 *   node scripts/wp-update-block-attrs.js \
 *     --site sandybrown-nightingale-600381.hostingersite.com \
 *     --post-id 29 \
 *     --block-name sgs/hero \
 *     --attrs ./reports/hero-attrs.json \
 *     [--all-instances] \
 *     [--dry-run]
 *
 * Authentication (set BEFORE running):
 *   $env:WP_USER         = "Claude"
 *   $env:WP_APP_PASSWORD = "xxxx xxxx xxxx xxxx xxxx xxxx"
 *
 * Exit codes:
 *   0 = success (or successful dry-run)
 *   1 = generic failure / argument error
 *   2 = authentication failed
 *   3 = post-id does not exist
 *   4 = zero blocks match the requested name
 *   5 = save failed (editor state updated but post.save() did not)
 *   6 = REST verification mismatch (change did not persist — save-stage validation rejection)
 */

const { chromium, request } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
    const args = {
        allInstances: false,
        dryRun: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--site') args.site = argv[++i];
        else if (a === '--post-id') args.postId = argv[++i];
        else if (a === '--block-name') args.blockName = argv[++i];
        else if (a === '--attrs') args.attrs = argv[++i];
        else if (a === '--all-instances') args.allInstances = true;
        else if (a === '--dry-run') args.dryRun = true;
        else if (a === '--help' || a === '-h') args.help = true;
    }
    return args;
}

function showHelp() {
    const src = fs.readFileSync(__filename, 'utf8');
    const m = src.match(/\/\*\*[\s\S]*?\*\//);
    console.log(m ? m[0] : 'See file header for usage.');
}

function ts() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(stage, msg) {
    console.log(`[${ts()}] [${stage}] ${msg}`);
}

function fail(code, msg) {
    console.error(`\n[${ts()}] [FAIL] ${msg}\n`);
    process.exit(code);
}

function loadAttrs(attrsPath) {
    if (!attrsPath) fail(1, '--attrs is required (path to JSON file with attribute key/value pairs)');
    const abs = path.resolve(attrsPath);
    if (!fs.existsSync(abs)) fail(1, `Attrs file not found: ${abs}`);
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch (e) {
        fail(1, `Could not parse JSON in ${abs}: ${e.message}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        fail(1, `Attrs JSON must be a plain object of { key: value } pairs. Got: ${typeof parsed}`);
    }
    return parsed;
}

async function loginViaWpAdmin(site, user, pw) {
    // Spin up Playwright, post the login form, return { browser, page } authenticated.
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    try {
        await page.goto(`https://${site}/wp-login.php`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.fill('#user_login', user);
        await page.fill('#user_pass', pw);
        await Promise.all([
            page.waitForURL(/wp-admin/, { timeout: 30000 }),
            page.click('#wp-submit'),
        ]);
    } catch (e) {
        await browser.close();
        fail(2, `Login to https://${site}/wp-login.php failed: ${e.message}\n` +
                '       Cookie auth requires the account password (or app password if accepted).');
    }
    return { browser, ctx, page };
}

async function openEditor(page, site, postId) {
    // Load post.php editor URL and wait for wp.data + wp.blocks globals to be available.
    const editorUrl = `https://${site}/wp-admin/post.php?post=${encodeURIComponent(postId)}&action=edit`;
    const resp = await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (resp && resp.status() === 404) fail(3, `Post ID ${postId} not found on ${site} (404 from post.php).`);
    try {
        await page.waitForFunction(
            () => window.wp && window.wp.data && window.wp.blocks && window.wp.data.select('core/block-editor'),
            { timeout: 30000 }
        );
    } catch (_) {
        fail(3, `Editor did not finish loading for post ${postId} on ${site}. ` +
                'Could be a 404, a permission issue, or a fatal JS error in the page.');
    }
    await page.waitForFunction(
        () => window.wp.data.select('core/block-editor').getBlockCount() > 0,
        { timeout: 30000 }
    ).catch(() => { /* zero-block posts are valid; matcher will report */ });
}

async function findBlocks(page, blockName) {
    // Recursively walk every block in the editor, collecting clientIds where block.name matches.
    return page.evaluate((targetName) => {
        const matches = [];
        const allNames = new Set();
        const walk = (blocks, parents) => {
            for (const b of blocks) {
                if (!b) continue;
                allNames.add(b.name);
                if (b.name === targetName) {
                    matches.push({ clientId: b.clientId, parents: parents.slice() });
                }
                if (b.innerBlocks && b.innerBlocks.length) {
                    walk(b.innerBlocks, parents.concat(b.name));
                }
            }
        };
        walk(window.wp.data.select('core/block-editor').getBlocks(), []);
        return { matches, allNames: Array.from(allNames).sort() };
    }, blockName);
}

async function replaceBlockAttrs(page, clientId, blockName, incomingAttrs) {
    // Workaround: read current attrs, merge incoming, createBlock fresh, replaceBlock to bypass invalid-content rejection.
    return page.evaluate(({ clientId, blockName, incomingAttrs }) => {
        const { dispatch, select } = window.wp.data;
        const oldBlock = select('core/block-editor').getBlock(clientId);
        if (!oldBlock) return { ok: false, error: `Block ${clientId} no longer in store` };
        const mergedAttrs = Object.assign({}, oldBlock.attributes, incomingAttrs);
        const fresh = window.wp.blocks.createBlock(blockName, mergedAttrs, oldBlock.innerBlocks || []);
        dispatch('core/block-editor').replaceBlock(clientId, fresh);
        return {
            ok: true,
            newClientId: fresh.clientId,
            mergedKeys: Object.keys(mergedAttrs).length,
            incomingKeys: Object.keys(incomingAttrs).length,
        };
    }, { clientId, blockName, incomingAttrs });
}

async function savePost(page) {
    // Trigger save via the editor data API and wait for isSavingPost to flip back to false without error notices.
    await page.evaluate(() => window.wp.data.dispatch('core/editor').savePost());
    try {
        await page.waitForFunction(
            () => !window.wp.data.select('core/editor').isSavingPost()
                && !window.wp.data.select('core/editor').isAutosavingPost(),
            { timeout: 45000 }
        );
    } catch (e) {
        return { ok: false, reason: 'savePost did not complete within 45s' };
    }
    // Detect save errors from the notices store.
    const errorNotice = await page.evaluate(() => {
        const notices = (window.wp.data.select('core/notices').getNotices() || [])
            .filter(n => n.status === 'error');
        return notices.length ? notices.map(n => n.content).join(' | ') : null;
    });
    if (errorNotice) return { ok: false, reason: `Editor reported save error: ${errorNotice}` };
    return { ok: true };
}

function buildAuthHeader(user, appPw) {
    if (!appPw) return null;
    const token = Buffer.from(`${user}:${appPw}`).toString('base64');
    return { Authorization: `Basic ${token}` };
}

async function fetchPostContent(site, postId, authHeader) {
    // Try /pages first, fall back to /posts. context=edit returns the raw block markup.
    const ctx = await request.newContext({
        baseURL: `https://${site}`,
        extraHTTPHeaders: authHeader || {},
        ignoreHTTPSErrors: true,
        timeout: 30000,
    });
    try {
        for (const type of ['pages', 'posts']) {
            const res = await ctx.get(`/wp-json/wp/v2/${type}/${postId}?context=edit&_fields=id,content`);
            if (res.ok()) {
                const body = await res.json();
                if (body && body.content && (body.content.raw || body.content.rendered)) {
                    return { type, raw: body.content.raw || body.content.rendered };
                }
            }
        }
    } finally {
        await ctx.dispose();
    }
    return null;
}

function parseBlockAttrsFromContent(rawContent, blockName) {
    // Find block-comment markers like <!-- wp:sgs/hero {...attrs json...} --> and parse the JSON.
    const escaped = blockName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<!--\\s*wp:${escaped}(\\s+(\\{[\\s\\S]*?\\}))?\\s*(\\/)?-->`, 'g');
    const found = [];
    let m;
    while ((m = re.exec(rawContent)) !== null) {
        const json = m[2];
        if (!json) { found.push({}); continue; }
        try {
            found.push(JSON.parse(json));
        } catch (_) {
            // Block-comment JSON is normally well-formed; bad parse means the regex matched a self-close inside text.
        }
    }
    return found;
}

function verifyAttrsMatch(persistedAttrsList, expectedAttrs, allInstances) {
    if (persistedAttrsList.length === 0) {
        return { ok: false, reason: 'No matching block markers found in saved post content', mismatches: [] };
    }
    const targets = allInstances ? persistedAttrsList : [persistedAttrsList[0]];
    const mismatches = [];
    for (let i = 0; i < targets.length; i++) {
        const persisted = targets[i];
        for (const [k, v] of Object.entries(expectedAttrs)) {
            if (JSON.stringify(persisted[k]) !== JSON.stringify(v)) {
                mismatches.push({ instance: i, key: k, expected: v, actual: persisted[k] });
            }
        }
    }
    return { ok: mismatches.length === 0, mismatches };
}

async function main() {
    const args = parseArgs(process.argv);
    if (args.help) { showHelp(); return; }

    if (!args.site) fail(1, '--site is required');
    if (!args.postId) fail(1, '--post-id is required');
    if (!args.blockName) fail(1, '--block-name is required (e.g. sgs/hero)');
    if (!args.attrs) fail(1, '--attrs is required (path to a JSON file)');

    const incomingAttrs = loadAttrs(args.attrs);
    const user = process.env.WP_USER;
    const appPw = process.env.WP_APP_PASSWORD;
    const accountPw = process.env.WP_PASSWORD || appPw;

    if (!user || !accountPw) {
        fail(2, 'Set WP_USER + WP_APP_PASSWORD (or WP_PASSWORD) env vars before running.\n' +
                '       PowerShell:  $env:WP_USER = "Claude"; $env:WP_APP_PASSWORD = "xxxx xxxx ..."');
    }

    if (args.dryRun) console.log('=== DRY RUN — no changes will be saved ===\n');

    log('AUTH', `Logging in to https://${args.site}/wp-admin as ${user}`);
    const { browser, page } = await loginViaWpAdmin(args.site, user, accountPw);

    try {
        log('EDITOR', `Opening post ${args.postId} for edit`);
        await openEditor(page, args.site, args.postId);

        log('SCAN', `Searching post for blocks matching name "${args.blockName}"`);
        const { matches, allNames } = await findBlocks(page, args.blockName);
        log('SCAN', `Found ${matches.length} match(es). Block names present on post: ${allNames.join(', ') || '(none)'}`);

        if (matches.length === 0) {
            await browser.close();
            fail(4, `No blocks named "${args.blockName}" on post ${args.postId}. ` +
                    `Block names that DO exist: ${allNames.join(', ') || '(none)'}`);
        }
        if (matches.length > 1 && !args.allInstances) {
            console.error('\n[FAIL] Multiple matching blocks found and --all-instances not set:');
            for (const m of matches) {
                console.error(`         clientId=${m.clientId}  parents=[${m.parents.join(' > ') || '(top-level)'}]`);
            }
            await browser.close();
            process.exit(1);
        }

        const targets = args.allInstances ? matches : [matches[0]];
        log('UPDATE', `Applying merged attrs to ${targets.length} instance(s). Incoming keys: ${Object.keys(incomingAttrs).join(', ')}`);

        if (args.dryRun) {
            for (const t of targets) {
                console.log(`     [dry-run] would replaceBlock(${t.clientId}) with merged attrs`);
            }
            await browser.close();
            console.log('\n=== Dry-run complete — no save attempted, no REST verification ===');
            return;
        }

        for (const t of targets) {
            const r = await replaceBlockAttrs(page, t.clientId, args.blockName, incomingAttrs);
            if (!r.ok) {
                await browser.close();
                fail(1, `replaceBlock failed for clientId ${t.clientId}: ${r.error}`);
            }
            log('UPDATE', `  ${t.clientId} replaced (new clientId=${r.newClientId}, merged ${r.mergedKeys} attrs)`);
        }

        log('SAVE', 'Calling savePost() and waiting for isSavingPost() === false');
        const saveResult = await savePost(page);
        if (!saveResult.ok) {
            await browser.close();
            fail(5, `Save did not complete cleanly: ${saveResult.reason}`);
        }
        log('SAVE', 'savePost completed without error notices');

    } finally {
        await browser.close().catch(() => {});
    }

    log('VERIFY', `Fetching post ${args.postId} via REST to confirm attrs persisted`);
    const authHeader = buildAuthHeader(user, appPw);
    const fetched = await fetchPostContent(args.site, args.postId, authHeader);
    if (!fetched) {
        fail(6, `Could not fetch post ${args.postId} content via REST after save. ` +
                'App password missing or post not exposed in /wp-json/wp/v2/{pages,posts}/<id>?context=edit.');
    }
    const persisted = parseBlockAttrsFromContent(fetched.raw, args.blockName);
    log('VERIFY', `Found ${persisted.length} "${args.blockName}" block marker(s) in saved ${fetched.type} content`);

    const verdict = verifyAttrsMatch(persisted, incomingAttrs, args.allInstances);
    if (!verdict.ok) {
        console.error('\n[FAIL] REST verification mismatch — attribute change did NOT persist.');
        console.error('       This is the canonical canary for save-stage validation rejection.');
        for (const m of verdict.mismatches) {
            console.error(`       instance=${m.instance} key=${m.key} expected=${JSON.stringify(m.expected)} actual=${JSON.stringify(m.actual)}`);
        }
        process.exit(6);
    }

    console.log('');
    console.log(`PASS — ${Object.keys(incomingAttrs).length} attr(s) updated and verified on post ${args.postId} (${args.blockName}).`);
}

main().catch(err => {
    console.error('\n[ERROR]', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    process.exit(1);
});
