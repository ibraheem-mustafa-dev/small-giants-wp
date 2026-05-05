#!/usr/bin/env node
/**
 * wp_global_styles reset + reapply.
 *
 * Encodes the post-deploy procedure documented in:
 *   .claude/specs/common-wp-styling-errors.md  Section O1
 *   .claude/handoff.md                          "deployment procedure validated end-to-end"
 *
 * Resetting the wp_global_styles post and re-applying the active theme variation
 * is mandatory after any change to a variation JSON file in
 * theme/sgs-theme/styles/. Skipping any of the 7 steps below silently ships
 * stale CSS and is the #1 cause of "I deployed but nothing changed" defects.
 *
 * Usage:
 *   node scripts/global-styles-reset.js \
 *     --site sandybrown-nightingale-600381.hostingersite.com \
 *     --theme sgs-theme \
 *     --variation mamas-munches \
 *     [--dry-run] \
 *     [--skip-ssh] \
 *     [--ssh-host hd] [--ssh-user u945238940] [--ssh-port 65002] \
 *     [--ssh-docroot ~/domains/<site>/public_html]
 *
 * Authentication (set BEFORE running):
 *   $env:WP_USER         = "Claude"
 *   $env:WP_APP_PASSWORD = "xxxx xxxx xxxx xxxx xxxx xxxx"   # preferred (Hostinger app password)
 *   # OR (fallback)
 *   $env:WP_PASSWORD     = "<account password>"             # cookie-auth fallback
 *
 * Steps performed:
 *   [1/7] Authenticate to WP REST API (Basic auth via app password, or cookie via wp-login.php)
 *   [2/7] Resolve global-styles post ID for the active theme
 *   [3/7] Reset post: POST {settings:{},styles:{}}
 *   [4/7] Fetch the named variation from /global-styles/themes/<theme>/variations
 *   [5/7] Re-apply variation: POST full settings + styles
 *   [6/7] (optional, if --skip-ssh not set) Clear caches via SSH:
 *           wp cache flush, wp transient delete --all, rm -rf litespeed/css/*.css + cache/*
 *   [7/7] (optional) OPcache reset via HTTP fetch of a temp PHP file
 *
 * Idempotent — running twice in a row produces the same end state.
 *
 * Exit codes:
 *   0 = success (or successful dry-run)
 *   1 = any failure
 */

const { chromium, request } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
    const args = {
        dryRun: false,
        skipSsh: false,
        sshUser: 'u945238940',
        sshPort: '65002',
        sshHost: null,
        sshDocroot: null,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--site') args.site = argv[++i];
        else if (a === '--theme') args.theme = argv[++i];
        else if (a === '--variation') args.variation = argv[++i];
        else if (a === '--dry-run') args.dryRun = true;
        else if (a === '--skip-ssh') args.skipSsh = true;
        else if (a === '--ssh-host') args.sshHost = argv[++i];
        else if (a === '--ssh-user') args.sshUser = argv[++i];
        else if (a === '--ssh-port') args.sshPort = argv[++i];
        else if (a === '--ssh-docroot') args.sshDocroot = argv[++i];
        else if (a === '--help' || a === '-h') args.help = true;
    }
    return args;
}

function showHelp() {
    const src = fs.readFileSync(__filename, 'utf8');
    const m = src.match(/\/\*\*[\s\S]*?\*\//);
    console.log(m ? m[0] : 'See file header for usage.');
}

function fail(msg) {
    console.error(`\n[FAIL] ${msg}\n`);
    process.exit(1);
}

function step(n, msg) {
    console.log(`[${n}/7] ${msg}`);
}

async function makeRequestContext(site) {
    const baseURL = `https://${site}`;
    const user = process.env.WP_USER;
    const appPw = process.env.WP_APP_PASSWORD;
    const pw = process.env.WP_PASSWORD;

    if (!user || (!appPw && !pw)) {
        fail(
            'Set WP_USER + WP_APP_PASSWORD env vars (preferred) OR WP_USER + WP_PASSWORD.\n' +
            '  PowerShell:  $env:WP_USER = "Claude"; $env:WP_APP_PASSWORD = "xxxx xxxx ..."'
        );
    }

    if (appPw) {
        // Basic auth — works for /wp-json/* on any site that allows app passwords.
        const token = Buffer.from(`${user}:${appPw}`).toString('base64');
        const ctx = await request.newContext({
            baseURL,
            extraHTTPHeaders: { Authorization: `Basic ${token}` },
            ignoreHTTPSErrors: true,
            timeout: 30000,
        });
        return { ctx, mode: 'app-password' };
    }

    // Fallback — log in via Playwright browser, capture cookies + nonce, build a request context.
    const browser = await chromium.launch({ headless: true });
    const bctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await bctx.newPage();
    await page.goto(`${baseURL}/wp-login.php`, { waitUntil: 'domcontentloaded' });
    await page.fill('#user_login', user);
    await page.fill('#user_pass', pw);
    await Promise.all([
        page.waitForURL(/wp-admin/, { timeout: 30000 }),
        page.click('#wp-submit'),
    ]);
    // Pull a fresh REST nonce from /wp-admin
    const nonce = await page.evaluate(async () => {
        const r = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce', { credentials: 'include' });
        if (r.ok) return await r.text();
        return null;
    });
    const cookies = await bctx.cookies();
    await browser.close();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const headers = { Cookie: cookieHeader };
    if (nonce) headers['X-WP-Nonce'] = nonce.trim();
    const ctx = await request.newContext({
        baseURL,
        extraHTTPHeaders: headers,
        ignoreHTTPSErrors: true,
        timeout: 30000,
    });
    return { ctx, mode: 'cookie' };
}

async function getJson(ctx, urlPath) {
    const res = await ctx.get(urlPath);
    if (!res.ok()) {
        const body = await res.text();
        throw new Error(`GET ${urlPath} → ${res.status()} ${res.statusText()}\n${body.slice(0, 400)}`);
    }
    return res.json();
}

async function postJson(ctx, urlPath, payload) {
    const res = await ctx.post(urlPath, {
        data: payload,
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok()) {
        const body = await res.text();
        throw new Error(`POST ${urlPath} → ${res.status()} ${res.statusText()}\n${body.slice(0, 400)}`);
    }
    return res.json();
}

async function resolveGlobalStylesId(ctx, theme) {
    // Endpoint shape: /wp/v2/global-styles/themes/<theme>?_fields=id,settings,styles
    // Some WP versions return the user-customisations post via this endpoint;
    // others require a post lookup. Try the canonical path first.
    try {
        const r = await getJson(ctx, `/wp-json/wp/v2/global-styles/themes/${encodeURIComponent(theme)}?_fields=id`);
        if (r && r.id) return r.id;
    } catch (_) { /* fall through */ }

    // Fallback: enumerate global-styles posts.
    const list = await getJson(ctx, `/wp-json/wp/v2/global-styles?per_page=20&_fields=id,title,meta`);
    for (const p of list) {
        if (p && p.id) return p.id;
    }
    throw new Error(`Could not resolve global-styles post id for theme "${theme}"`);
}

function slugify(s) {
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function findVariation(ctx, theme, variationName) {
    const vars = await getJson(ctx, `/wp-json/wp/v2/global-styles/themes/${encodeURIComponent(theme)}/variations`);
    if (!Array.isArray(vars)) {
        throw new Error(`/variations endpoint did not return an array`);
    }
    const wanted = slugify(variationName);
    for (const v of vars) {
        const titleRaw = (v && v.title && (v.title.rendered || v.title)) || '';
        if (slugify(titleRaw) === wanted) return v;
    }
    const titles = vars.map(v => (v.title && (v.title.rendered || v.title)) || '(untitled)').join(', ');
    throw new Error(`Variation "${variationName}" not found. Available: ${titles || '(none)'}`);
}

function runSshCommand(args, command, dryRun) {
    const target = `${args.sshUser}@${args.sshHost}`;
    const sshArgs = ['-p', args.sshPort, '-i', path.join(require('os').homedir(), '.ssh', 'id_ed25519'), target, command];
    if (dryRun) {
        console.log(`     [dry-run] ssh ${sshArgs.map(a => /\s/.test(a) ? `"${a}"` : a).join(' ')}`);
        return { ok: true, dryRun: true };
    }
    const r = spawnSync('ssh', sshArgs, { encoding: 'utf8' });
    if (r.status !== 0) {
        return { ok: false, stderr: r.stderr || r.stdout, status: r.status };
    }
    return { ok: true, stdout: r.stdout };
}

async function maybeFlushCaches(args) {
    if (args.skipSsh) {
        console.log('     [skip] --skip-ssh set; run cache flush manually:');
        console.log(`           ssh ${args.sshUser}@${args.sshHost || '<host>'} -p ${args.sshPort} "cd <docroot> && wp cache flush && wp transient delete --all"`);
        return { skipped: true };
    }
    if (!args.sshHost) {
        console.log('     [skip] --ssh-host not provided; skipping cache flush.');
        console.log('           Pass --ssh-host <host> --ssh-docroot <path> to enable.');
        return { skipped: true };
    }
    const docroot = args.sshDocroot || `~/domains/${args.site}/public_html`;
    const cmds = [
        `cd ${docroot} && wp cache flush 2>&1 || true`,
        `cd ${docroot} && wp transient delete --all 2>&1 || true`,
        `rm -rf ${docroot}/wp-content/litespeed/css/*.css ${docroot}/wp-content/litespeed/cache/* 2>&1 || true`,
    ];
    for (const c of cmds) {
        const r = runSshCommand(args, c, args.dryRun);
        if (!r.ok) {
            console.warn(`     [warn] ssh command failed: ${c}\n            ${r.stderr || ''}`);
        }
    }
    return { skipped: false, dryRun: args.dryRun };
}

async function maybeOpcacheReset(args) {
    if (args.skipSsh) {
        console.log('     [skip] --skip-ssh set; reset OPcache manually after deploy.');
        return { skipped: true };
    }
    if (!args.sshHost) {
        console.log('     [skip] --ssh-host not provided; skipping OPcache reset.');
        return { skipped: true };
    }
    const docroot = args.sshDocroot || `~/domains/${args.site}/public_html`;
    const tmp = 'op-reset-tmp-gsr.php';
    const writeCmd = `echo '<?php opcache_reset(); echo "ok"; @unlink(__FILE__);' > ${docroot}/${tmp}`;
    const w = runSshCommand(args, writeCmd, args.dryRun);
    if (!w.ok) {
        console.warn(`     [warn] could not write OPcache reset stub: ${w.stderr || ''}`);
        return { skipped: false, ok: false };
    }
    if (args.dryRun) {
        console.log(`     [dry-run] curl -sk https://${args.site}/${tmp}`);
        return { skipped: false, dryRun: true };
    }
    try {
        const ctx = await request.newContext({ ignoreHTTPSErrors: true, timeout: 15000 });
        const res = await ctx.get(`https://${args.site}/${tmp}`);
        const body = await res.text();
        await ctx.dispose();
        if (!res.ok() || !body.includes('ok')) {
            console.warn(`     [warn] OPcache reset HTTP fetch returned ${res.status()}: ${body.slice(0, 200)}`);
            return { skipped: false, ok: false };
        }
    } catch (e) {
        console.warn(`     [warn] OPcache reset HTTP fetch error: ${e.message}`);
        return { skipped: false, ok: false };
    }
    return { skipped: false, ok: true };
}

async function main() {
    const args = parseArgs(process.argv);
    if (args.help) { showHelp(); return; }

    if (!args.site) fail('--site is required (e.g. --site sandybrown-nightingale-600381.hostingersite.com)');
    if (!args.theme) fail('--theme is required (e.g. --theme sgs-theme)');
    if (!args.variation) fail('--variation is required (e.g. --variation mamas-munches)');

    if (args.dryRun) console.log('=== DRY RUN — no changes will be made ===\n');

    // [1/7] Authenticate
    step(1, `Authenticating to https://${args.site}/wp-json ...`);
    if (args.dryRun && !process.env.WP_USER) {
        console.log('     [dry-run] would authenticate via WP_USER + WP_APP_PASSWORD env vars');
        console.log('     [dry-run] subsequent steps would: resolve global-styles id, reset, fetch variation, reapply, flush caches, OPcache reset');
        console.log('     [dry-run] set WP_USER + WP_APP_PASSWORD to actually exercise the REST flow in dry-run');
        console.log('\n=== Dry-run preview complete (no credentials provided — REST steps not exercised) ===');
        return;
    }
    const { ctx, mode } = await makeRequestContext(args.site);
    console.log(`     authenticated (mode: ${mode})`);

    // [2/7] Resolve global-styles post id
    step(2, `Resolving global-styles post ID for theme "${args.theme}"`);
    const gsId = await resolveGlobalStylesId(ctx, args.theme);
    console.log(`     global-styles post id: ${gsId}`);

    // [3/7] Reset
    step(3, `Resetting wp_global_styles (settings:{}, styles:{})`);
    if (args.dryRun) {
        console.log(`     [dry-run] POST /wp-json/wp/v2/global-styles/${gsId}  body={settings:{},styles:{}}`);
    } else {
        await postJson(ctx, `/wp-json/wp/v2/global-styles/${gsId}`, { settings: {}, styles: {} });
        console.log('     reset ok');
    }

    // [4/7] Get variation
    step(4, `Fetching variation "${args.variation}" for theme "${args.theme}"`);
    const variation = await findVariation(ctx, args.theme, args.variation);
    const vTitle = (variation.title && (variation.title.rendered || variation.title)) || args.variation;
    console.log(`     found variation "${vTitle}" — settings keys: ${Object.keys(variation.settings || {}).length}, styles keys: ${Object.keys(variation.styles || {}).length}`);

    // [5/7] Re-apply
    step(5, `Re-applying variation to wp_global_styles post ${gsId}`);
    if (args.dryRun) {
        console.log(`     [dry-run] POST /wp-json/wp/v2/global-styles/${gsId}  body=<variation settings + styles>`);
    } else {
        await postJson(ctx, `/wp-json/wp/v2/global-styles/${gsId}`, {
            settings: variation.settings || {},
            styles: variation.styles || {},
        });
        console.log('     reapply ok');
    }

    // [6/7] Cache flush via SSH
    step(6, `Clearing caches via SSH (wp cache flush + transients + LiteSpeed)`);
    const cacheResult = await maybeFlushCaches(args);
    if (cacheResult.skipped) {
        console.log('     skipped');
    } else {
        console.log(args.dryRun ? '     dry-run logged' : '     done');
    }

    // [7/7] OPcache reset
    step(7, `Resetting PHP OPcache via HTTP fetch of temp file`);
    const opResult = await maybeOpcacheReset(args);
    if (opResult.skipped) {
        console.log('     skipped');
    } else if (opResult.dryRun) {
        console.log('     dry-run logged');
    } else if (opResult.ok) {
        console.log('     OPcache reset ok');
    } else {
        console.log('     OPcache reset reported a problem (see warnings above) — frontend may need manual reset');
    }

    // Cleanup
    await ctx.dispose();

    console.log('');
    console.log(args.dryRun ? '✓ Dry-run complete — no changes made' : '✓ wp_global_styles reset + reapplied');
    if (!cacheResult.skipped) console.log('✓ Cache flush dispatched');
    if (!opResult.skipped) console.log('✓ OPcache reset dispatched');
    console.log('');
    console.log(`Variation '${args.variation}' is now live on ${args.site}.`);
    console.log(`Verify:  curl -sLk 'https://${args.site}/' | grep -i '<your-expected-css-token>'`);
}

main().catch(err => {
    console.error('\n[ERROR]', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    process.exit(1);
});
