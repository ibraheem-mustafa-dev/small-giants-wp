"""Sets Eye Care's site icon (the browser-tab and home-screen icon) over SSH: the draft's glasses mark
(assets/site-icon.svg, the lens dialog's inline mark in text #141414 on surface #FAF8F5, rendered to
assets/site-icon.png at 512px). Without one, browsers ask for /favicon.ico and get a 404.
Idempotent: reuses the attachment when one with the same file name already exists.

Usage: python apply_site_icon.py [--path domains/<site>/public_html]   (default: eye-care-test)"""
import argparse
import os
import shlex
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ICON = os.path.join(HERE, '..', 'assets', 'site-icon.png')
HOST = 'u945238940@141.136.39.73'
SSH = ['ssh', '-i', '~/.ssh/id_ed25519', '-p', '65002', HOST]
SCP = ['scp', '-i', os.path.expanduser('~/.ssh/id_ed25519'), '-P', '65002']


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        sys.exit(f'Failed ({result.returncode}): {result.stderr.strip() or result.stdout.strip()}')
    return result.stdout.strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--path', default='domains/darkcyan-grouse-898606.hostingersite.com/public_html')
    args = parser.parse_args()
    remote_tmp = 'eye-care-site-icon.png'
    run(SCP + [ICON, f'{HOST}:{remote_tmp}'])
    wp = f'cd {shlex.quote(args.path)} && wp'
    existing = run(SSH + [f"{wp} post list --post_type=attachment --name=eye-care-site-icon --field=ID"])
    if existing:
        attachment = existing.splitlines()[0]
    else:
        attachment = run(SSH + [f"{wp} media import ~/{remote_tmp} --title='Eye Care site icon' --porcelain"])
    run(SSH + [f"{wp} option update site_icon {shlex.quote(attachment)} && rm -f ~/{remote_tmp}"])
    print(f'Site icon set: attachment {attachment}')


if __name__ == '__main__':
    main()
