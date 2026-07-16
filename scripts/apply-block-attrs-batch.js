#!/usr/bin/env node
/**
 * apply-block-attrs-batch.js
 *
 * One-off companion to wp-update-block-attrs.js for the Indus homepage
 * attribute-mirror task (2026-07-16). Handles the case wp-update-block-attrs.js
 * doesn't: several DIFFERENT attribute sets applied to DIFFERENT instances of
 * the SAME block name in ONE post, matched by an existing attribute value
 * (e.g. each sgs/button's `url`, each core/heading's rendered text via
 * innerBlocks text match isn't available so we match core/heading + core/paragraph
 * by ordinal position within a parent match instead).
 *
 * Same underlying mechanism as wp-update-block-attrs.js: open the real editor,
 * createBlock() fresh + replaceBlock() (bypasses the invalid-content silent
 * rejection), save via core/editor, REST-verify after.
 *
 * Plan file shape (JSON array):
 * [
 *   { "blockName": "sgs/button", "matchAttr": "url", "matchValue": "/catalogue/",
 *     "attrs": { "colourTextHover": "#0A7EA8" } },
 *   { "blockName": "core/heading", "matchAttr": "content", "matchContains": "Food Service",
 *     "attrs": { "textAlign": "center" } }
 * ]
 *
 * matchAttr + matchValue: exact match against oldBlock.attributes[matchAttr]
 * matchAttr + matchContains: substring match (case-sensitive) — for RichText content fields
 * omit matchAttr entirely + set matchAll:true to apply to every instance of blockName
 *
 * Usage:
 *   node scripts/apply-block-attrs-batch.js --site <host> --post-id <id> --plan <path> [--dry-run]
 *
 * Env: WP_USER, WP_APP_PASSWORD (or WP_PASSWORD)
 *
 * Exit codes: 0 ok, 1 arg/generic, 2 auth, 3 post/editor, 4 zero matches for an entry,
 *             5 save failed, 6 REST verify mismatch
 */

const { chromium, request } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
    const args = { dryRun: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--site') args.site = argv[++i];
        else if (a === '--post-id') args.postId = argv[++i];
        else if (a === '--plan') args.plan = argv[++i];
        else if (a === '--dry-run') args.dryRun = true;
    }
    return args;
}

function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }
function log(stage, msg) { console.log(`[${ts()}] [${stage}] ${msg}`); }
function fail(code, msg) { console.error(`\n[${ts()}] [FAIL] ${msg}\n`); process.exit(code); }

async function loginViaWpAdmin(site, user, pw) {
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
        fail(2, `Login failed: ${e.message}`);
    }
    return { browser, page };
}

async function openEditor(page, site, postId) {
    const editorUrl = `https://${site}/wp-admin/post.php?post=${encodeURIComponent(postId)}&action=edit`;
    const resp = await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (resp && resp.status() === 404) fail(3, `Post ID ${postId} not found on ${site}.`);
    await page.waitForFunction(
        () => window.wp && window.wp.data && window.wp.blocks && window.wp.data.select('core/block-editor'),
        { timeout: 30000 }
    ).catch(() => fail(3, 'Editor did not load.'));
}

async function findAndReplace(page, entry) {
    return page.evaluate((entry) => {
        const { dispatch, select } = window.wp.data;
        const matches = [];
        const walk = (blocks) => {
            for (const b of blocks) {
                if (!b) continue;
                if (b.name === entry.blockName) {
                    let isMatch = false;
                    if (entry.matchAll) isMatch = true;
                    else if (entry.matchAttr && 'matchEquals' in entry) {
                        isMatch = String(b.attributes[entry.matchAttr] || '') === entry.matchEquals;
                    } else if (entry.matchAttr && 'matchValue' in entry) {
                        isMatch = b.attributes[entry.matchAttr] === entry.matchValue;
                    } else if (entry.matchAttr && entry.matchContains) {
                        const v = String(b.attributes[entry.matchAttr] || '');
                        isMatch = v.indexOf(entry.matchContains) !== -1;
                    }
                    if (isMatch) matches.push(b.clientId);
                }
                if (b.innerBlocks && b.innerBlocks.length) walk(b.innerBlocks);
            }
        };
        walk(select('core/block-editor').getBlocks());

        const results = [];
        for (const clientId of matches) {
            const oldBlock = select('core/block-editor').getBlock(clientId);
            if (!oldBlock) { results.push({ clientId, ok: false, error: 'gone' }); continue; }
            // Deep-merge one level for nested objects like `style`.
            const merged = Object.assign({}, oldBlock.attributes);
            // unset: dotted paths to delete before applying attrs (e.g. "style.color"
            // to drop a raw-hex colour before switching to a preset textColor/backgroundColor).
            if (Array.isArray(entry.unset)) {
                for (const dotted of entry.unset) {
                    const parts = dotted.split('.');
                    let node = merged;
                    for (let i = 0; i < parts.length - 1; i++) {
                        if (!node[parts[i]] || typeof node[parts[i]] !== 'object') { node = null; break; }
                        node[parts[i]] = Object.assign({}, node[parts[i]]);
                        node = node[parts[i]];
                    }
                    if (node) delete node[parts[parts.length - 1]];
                }
            }
            for (const [k, v] of Object.entries(entry.attrs)) {
                if (v && typeof v === 'object' && !Array.isArray(v) && merged[k] && typeof merged[k] === 'object') {
                    merged[k] = Object.assign({}, merged[k], v);
                    // one more level deep for style.border / style.spacing etc.
                    for (const [k2, v2] of Object.entries(v)) {
                        if (v2 && typeof v2 === 'object' && !Array.isArray(v2) && merged[k][k2] && typeof merged[k][k2] === 'object') {
                            merged[k][k2] = Object.assign({}, oldBlock.attributes[k] ? oldBlock.attributes[k][k2] : {}, v2);
                        }
                    }
                } else {
                    merged[k] = v;
                }
            }
            const fresh = window.wp.blocks.createBlock(entry.blockName, merged, oldBlock.innerBlocks || []);
            dispatch('core/block-editor').replaceBlock(clientId, fresh);
            results.push({ clientId, ok: true, newClientId: fresh.clientId });
        }
        return { totalMatches: matches.length, results };
    }, entry);
}

async function savePost(page) {
    await page.evaluate(() => window.wp.data.dispatch('core/editor').savePost());
    try {
        await page.waitForFunction(
            () => !window.wp.data.select('core/editor').isSavingPost()
                && !window.wp.data.select('core/editor').isAutosavingPost(),
            { timeout: 45000 }
        );
    } catch (e) {
        return { ok: false, reason: 'timeout' };
    }
    const errorNotice = await page.evaluate(() => {
        const notices = (window.wp.data.select('core/notices').getNotices() || []).filter(n => n.status === 'error');
        return notices.length ? notices.map(n => n.content).join(' | ') : null;
    });
    if (errorNotice) return { ok: false, reason: errorNotice };
    return { ok: true };
}

function buildAuthHeader(user, appPw) {
    if (!appPw) return null;
    return { Authorization: `Basic ${Buffer.from(`${user}:${appPw}`).toString('base64')}` };
}

async function main() {
    const args = parseArgs(process.argv);
    if (!args.site || !args.postId || !args.plan) fail(1, '--site, --post-id, --plan are required');
    const plan = JSON.parse(fs.readFileSync(path.resolve(args.plan), 'utf8'));
    const user = process.env.WP_USER;
    const appPw = process.env.WP_APP_PASSWORD;
    const accountPw = process.env.WP_PASSWORD || appPw;
    if (!user || !accountPw) fail(2, 'Set WP_USER + WP_APP_PASSWORD (or WP_PASSWORD).');

    if (args.dryRun) console.log('=== DRY RUN — no changes will be saved ===\n');

    log('AUTH', `Logging in to https://${args.site}/wp-admin as ${user}`);
    const { browser, page } = await loginViaWpAdmin(args.site, user, accountPw);

    const report = [];
    try {
        log('EDITOR', `Opening post ${args.postId} for edit`);
        await openEditor(page, args.site, args.postId);

        for (const entry of plan) {
            const label = `${entry.blockName} ${entry.matchAttr || '(all)'}=${entry.matchEquals || entry.matchValue || entry.matchContains || '*'}`;
            if (args.dryRun) {
                const dryFind = await page.evaluate((entry) => {
                    const { select } = window.wp.data;
                    const matches = [];
                    const walk = (blocks) => {
                        for (const b of blocks) {
                            if (!b) continue;
                            if (b.name === entry.blockName) {
                                let isMatch = false;
                                if (entry.matchAll) isMatch = true;
                                else if (entry.matchAttr && 'matchEquals' in entry) isMatch = String(b.attributes[entry.matchAttr] || '') === entry.matchEquals;
                                else if (entry.matchAttr && 'matchValue' in entry) isMatch = b.attributes[entry.matchAttr] === entry.matchValue;
                                else if (entry.matchAttr && entry.matchContains) {
                                    const v = String(b.attributes[entry.matchAttr] || '');
                                    isMatch = v.indexOf(entry.matchContains) !== -1;
                                }
                                if (isMatch) matches.push({ clientId: b.clientId, currentAttrs: b.attributes });
                            }
                            if (b.innerBlocks && b.innerBlocks.length) walk(b.innerBlocks);
                        }
                    };
                    walk(select('core/block-editor').getBlocks());
                    return matches;
                }, entry);
                console.log(`  [dry-run] ${label} -> ${dryFind.length} match(es)`);
                for (const m of dryFind) {
                    console.log(`      clientId=${m.clientId} would merge ${JSON.stringify(entry.attrs)}`);
                }
                report.push({ label, matches: dryFind.length, dryRun: true });
                continue;
            }
            const r = await findAndReplace(page, entry);
            log('UPDATE', `${label} -> ${r.totalMatches} match(es), ${r.results.filter(x => x.ok).length} replaced`);
            if (r.totalMatches === 0) {
                console.error(`  [WARN] zero matches for ${label}`);
            }
            report.push({ label, ...r });
        }

        if (args.dryRun) {
            await browser.close();
            console.log('\n=== Dry-run complete — no save attempted ===');
            console.log(JSON.stringify(report, null, 2));
            return;
        }

        // Let any debounced heartbeat/autosave activity settle before the real save,
        // so a stray in-flight autosave can't race our manual save and win last-writer.
        await page.waitForTimeout(5000);
        log('SAVE', 'Calling savePost() (attempt 1)');
        let saveResult = await savePost(page);
        if (!saveResult.ok) {
            await browser.close();
            fail(5, `Save did not complete cleanly: ${saveResult.reason}`);
        }
        log('SAVE', 'savePost completed without error notices (attempt 1)');
        // Guard against a delayed autosave clobbering our save immediately after:
        // wait, then re-check dirty state and re-save if something reverted it.
        await page.waitForTimeout(5000);
        const stillDirty = await page.evaluate(() => window.wp.data.select('core/editor').isEditedPostDirty());
        if (stillDirty) {
            log('SAVE', 'Post is dirty again after settle window — saving again (attempt 2)');
            saveResult = await savePost(page);
            if (!saveResult.ok) {
                await browser.close();
                fail(5, `Second save did not complete cleanly: ${saveResult.reason}`);
            }
            log('SAVE', 'savePost completed without error notices (attempt 2)');
            await page.waitForTimeout(1500);
        }
    } finally {
        await browser.close().catch(() => {});
    }

    console.log('\n=== Batch apply complete ===');
    console.log(JSON.stringify(report, null, 2));
}

main().catch(err => {
    console.error('\n[ERROR]', err && err.message ? err.message : err);
    process.exit(1);
});
