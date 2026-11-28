# Prompt to paste into Claude Code

1. Unzip `mic-site.zip` somewhere on your computer.
2. Open a terminal in the unzipped `mic-site` folder and start Claude Code (`claude`).
3. Fill in the two bits in [square brackets] below, then paste the whole thing in.

---

```
I need you to deploy a static website to one of my test domains.

The project is in this folder. Read README.md and CLAUDE.md first and follow them.

Test domain: [TEST DOMAIN, e.g. mic.mytestdomain.co.uk or mytestdomain.co.uk/mic]
Hosting: [HOW I ACCESS IT, e.g. "cPanel at Krystal, I have SSH" / "SFTP details in my password manager" / "Cloudflare Pages, I'm logged in to wrangler"]

What I need:
1. Check the site works locally first: serve the site/ folder over http and confirm every page loads with no console errors.
2. Work out the right way to upload to my hosting based on what I've told you. If you need credentials or a login, stop and tell me exactly what to enter or run myself. Don't save any passwords in files.
3. Upload the CONTENTS of site/ (not the folder itself) to the web root for the test domain, or the subfolder if I gave one.
4. If it's Apache/cPanel, add a small .htaccess for the 404 page, gzip and asset caching, as described in CLAUDE.md.
5. Keep robots.txt and the noindex tags. This is a test domain and must not be indexed.
6. Verify the live test URL: every page returns 200, burger menu opens on mobile width, fonts and images load, and a made-up URL shows the 404 page.
7. Give me the live URL and a short list of anything that didn't work.

Don't change the design, copy or layout. Don't add a build step or framework. Explain anything I need to do in plain English, step by step, with what "done" looks like.
```
