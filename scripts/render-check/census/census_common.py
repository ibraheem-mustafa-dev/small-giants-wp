"""Shared helpers for the Custom CSS census scripts: site and output-folder arguments, and running a PHP helper through WP-CLI in WSL."""
import argparse
import os
import re
import shlex
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT_ROOT = 'E:/sgs-tmp/render-check/census'


sys.path.insert(0, os.path.dirname(HERE))
from rc_site import to_wsl  # noqa: E402 - the render check's converter (refuses a path that is not on a drive)


def add_site_args(ap, site_required=True):
    ap.add_argument('--site', required=site_required, help='WSL site folder name under /var/www (a local mirror, for example local-mediatest-classa)')
    ap.add_argument('--out', help='output folder (default %s/<site>/)' % OUT_ROOT)


def resolve(args):
    """Validate --site and return the output folder, created if missing."""
    if args.site and not re.fullmatch(r'local-[A-Za-z0-9._-]+', args.site):
        sys.exit('--site must be a local mirror folder under /var/www (local-<name>).')
    out = args.out or '%s/%s' % (OUT_ROOT, args.site)
    os.makedirs(out, exist_ok=True)
    return out


def popen_php(site, php_file, args=(), **kw):
    """Start `wp eval-file <php_file> <args>` on the site as www-data inside WSL; paths are Windows paths (the args that are files are converted by the caller)."""
    inner = 'cd /var/www/%s && sudo -u www-data wp --path=/var/www/%s eval-file %s' % (site, site, ' '.join(shlex.quote(str(x)) for x in [to_wsl(php_file)] + list(args)))
    return subprocess.Popen(['wsl', '-d', 'Ubuntu', '-u', 'root', '--', 'bash', '-c', inner], **kw)


def run_php(site, php_file, args=()):
    """Run a PHP helper to completion and return (exit code, stdout, stderr)."""
    p = popen_php(site, php_file, args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace')
    out, err = p.communicate()
    return p.returncode, out, err
