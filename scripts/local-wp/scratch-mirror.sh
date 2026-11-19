#!/usr/bin/env bash
# Served scratch copies of the local mirrors, for work that must not touch the four real mirrors (other sessions use
# them on main's code). A scratch copy has its own database, files, uploads and Apache port, so a branch build can be
# synced to it (sync-build.sh accepts its name) and its saved content migrated and opened in a browser.
#
# Usage (from Windows):
#   wsl -d Ubuntu -u root -- bash /mnt/e/<worktree>/scripts/local-wp/scratch-mirror.sh create local-sandybrown local-mediatest-sandybrown 8092
#   wsl -d Ubuntu -u root -- bash /mnt/e/<worktree>/scripts/local-wp/scratch-mirror.sh drop local-mediatest-sandybrown
#   wsl -d Ubuntu -u root -- bash /mnt/e/<worktree>/scripts/local-wp/scratch-mirror.sh list
#
# The name must start local-mediatest; the source must be one of the four mirrors; the port must be free and 8090-8199.
# The copy records its source in <docroot>/.scratch-source, which sync-build.sh reads to pick the theme.json. create also makes the
# copy its own application password (in its login file) and registers it as a route site target; drop removes the registration.
set -euo pipefail

MIRRORS="local-eye-care local-sandybrown local-indus local-mamas"
NAME_RE='^local-mediatest[a-z0-9-]*$'

die() { echo "scratch-mirror: $*" >&2; exit 1; }

db_of() { echo "wp_$(echo "${1#local-}" | tr '-' '_')"; }

# The mirrors' login files live in the shared checkout's .claude/secrets (gitignored), found through git's common dir so a
# worktree's copy of this script reaches them too. A scratch copy has its source's users, so its file is the source's
# with the address changed; the editor check and the computed-route tools read <name>.env.
write_secrets() {
  local name="$1" src="$2" from="$3" to="$4" secrets
  secrets="$(secrets_dir)" || { echo "scratch-mirror: no .claude/secrets folder found; $name has no login file" >&2; return 1; }
  [ -f "$secrets/$src.env" ] || { echo "scratch-mirror: $secrets/$src.env is missing; $name has no login file" >&2; return 1; }
  # Keys carry the site name in capitals, hyphens dropped or turned to underscores depending on the reader
  # (WP_URL_LOCALINDUS, WP_URL_LOCAL_INDUS): each key is written in both forms of the copy's name.
  local key_a key_b
  key_a="$(echo "$name" | tr -d '-' | tr 'a-z' 'A-Z')"
  key_b="$(echo "$name" | tr 'a-z-' 'A-Z_')"
  sed "s#$from#$to#g" "$secrets/$src.env" | awk -v a="$key_a" -v b="$key_b" -v s1="$(echo "$src" | tr -d '-' | tr 'a-z' 'A-Z')" -v s2="$(echo "$src" | tr 'a-z-' 'A-Z_')" '
    match($0, /^[A-Za-z_][A-Za-z0-9_]*=/) {
      k = substr($0, 1, RLENGTH - 1); v = substr($0, RLENGTH + 1)
      base = ""
      if (length(k) > length(s1) + 1 && substr(k, length(k) - length(s1)) == "_" s1) base = substr(k, 1, length(k) - length(s1) - 1)
      else if (length(k) > length(s2) + 1 && substr(k, length(k) - length(s2)) == "_" s2) base = substr(k, 1, length(k) - length(s2) - 1)
      if (base != "") { print base "_" a "=" v; if (b != a) print base "_" b "=" v; next }
    }
    { print }' > "$secrets/$name.env"
}

# A copy carries its source's application-password hashes, and the source's login file may hold a password that matches none
# of them (local-eye-care's did on 2026-11-19: every REST upload to a copy answered 401 incorrect_password). So each copy gets
# a fresh application password for the user its login file names, written into the copy's own login file under both key
# spellings (quoted, since WordPress groups the password with spaces) and never printed. A password this script made before
# is revoked first, so a rerun leaves one.
fresh_app_password() {
  local name="$1" secrets file key_a key_b user label uuid app tmp
  secrets="$(secrets_dir)" || return 1
  file="$secrets/$name.env"
  [ -f "$file" ] || { echo "scratch-mirror: $file is missing; no application password made" >&2; return 1; }
  key_a="$(echo "$name" | tr -d '-' | tr 'a-z' 'A-Z')"
  key_b="$(echo "$name" | tr 'a-z-' 'A-Z_')"
  user="$(grep -E "^WP_USER_${key_a}=" "$file" | head -1 | cut -d= -f2- | tr -d "\"'\r")" || true
  [ -n "$user" ] || { echo "scratch-mirror: $file has no WP_USER_${key_a}; no application password made" >&2; return 1; }
  label="route-$name"
  for uuid in $(wp --path="/var/www/$name" --allow-root user application-password list "$user" --fields=uuid,name --format=csv 2>/dev/null | awk -F, -v n="$label" 'NR > 1 && $2 == n { print $1 }'); do
    wp --path="/var/www/$name" --allow-root user application-password delete "$user" "$uuid" >/dev/null
  done
  app="$(wp --path="/var/www/$name" --allow-root user application-password create "$user" "$label" --porcelain)" || return 1
  [ -n "$app" ] || { echo "scratch-mirror: WordPress made no application password for $user on $name" >&2; return 1; }
  tmp="$(mktemp)"
  grep -vE "^WP_APP_PWD_(${key_a}|${key_b})=" "$file" > "$tmp" || true
  { printf 'WP_APP_PWD_%s="%s"\n' "$key_a" "$app"; [ "$key_b" = "$key_a" ] || printf 'WP_APP_PWD_%s="%s"\n' "$key_b" "$app"; } >> "$tmp"
  cat "$tmp" > "$file"
  rm -f "$tmp"
}

# The route's tools reach a scratch copy by name through scripts/computed-route/calibration-targets.local.json, which
# tools/scratch-target.mjs writes (add on create, remove on drop). Node runs from WSL itself, else Windows' node.exe through
# interop. A copy that cannot be registered is reported with the command that does it, and the script exits 1.
scratch_target() {
  local action="$1" name="$2" source="${3:-}" url="${4:-}" repo tool
  repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  tool="$repo/scripts/computed-route/tools/scratch-target.mjs"
  local args=("$action" "$name")
  [ "$action" = add ] && args+=(--source "$source" --url "$url")
  if command -v node >/dev/null 2>&1; then
    node "$tool" "${args[@]}"
  elif command -v node.exe >/dev/null 2>&1; then
    node.exe "$(wslpath -w "$tool")" "${args[@]}"
  else
    echo "scratch-mirror: no node found, so $name is not registered as a site target; run: node scripts/computed-route/tools/scratch-target.mjs ${args[*]}" >&2
    return 1
  fi
}

secrets_dir() {
  local root dotgit gitdir
  root="$(cd "$(dirname "$(readlink -f "$0")")/../.." && pwd)"
  dotgit="$root/.git"
  if [ -f "$dotgit" ]; then
    # A worktree: .git names its folder under the main repository's .git/worktrees, often as a Windows path.
    gitdir="$(sed -n 's/^gitdir: //p' "$dotgit" | tr -d '')"
    [[ "$gitdir" =~ ^[A-Za-z]: ]] && gitdir="$(wslpath -u "$gitdir")"
    root="$(dirname "$(dirname "$(dirname "$gitdir")")")"
  fi
  [ -d "$root/.claude/secrets" ] || return 1
  echo "$root/.claude/secrets"
}

create() {
  local src="$1" name="$2" port="$3"
  [[ " $MIRRORS " == *" $src "* || "$src" =~ $NAME_RE ]] || die "source must be one of: $MIRRORS, or a scratch copy"
  [[ "$name" =~ $NAME_RE ]] || die "name must match $NAME_RE"
  [[ "$port" =~ ^[0-9]+$ ]] && (( port >= 8090 && port <= 8199 )) || die "port must be 8090-8199"
  local sdir="/var/www/$src" dir="/var/www/$name" db
  db="$(db_of "$name")"
  [ -f "$sdir/wp-config.php" ] || die "missing $sdir"
  [ ! -e "$dir" ] || die "$dir exists: drop it first"
  # The port is claimed at once, under a lock every create and drop takes for Apache's files: the copy's site file is
  # written now (not enabled until the copy is ready), so a create started meanwhile sees the port as taken. Without
  # it two creates minutes apart both passed the check and served two copies on one port.
  exec 9>/var/lock/scratch-mirror.lock
  flock 9
  ! grep -q "^Listen $port\$" /etc/apache2/ports.conf || die "port $port is already listened on"
  ! ss -ltn | grep -q ":$port " || die "port $port is in use"
  ! grep -qs "\*:$port>" /etc/apache2/sites-available/*.conf || die "port $port is claimed by another copy"
  cat > "/etc/apache2/sites-available/$name.conf" <<EOF
<VirtualHost *:$port>
  DocumentRoot $dir
  <Directory $dir>
    AllowOverride All
    Require all granted
  </Directory>
</VirtualHost>
EOF
  flock -u 9

  local user src_url
  user="$(wp --path="$sdir" --allow-root config get DB_USER)"
  src_url="$(wp --path="$sdir" --allow-root option get siteurl)"
  mysql -e "CREATE DATABASE \`$db\`; GRANT ALL ON \`$db\`.* TO '$user'@'localhost'; FLUSH PRIVILEGES;"
  wp --path="$sdir" --allow-root db export - | mysql "$db"
  mkdir -p "$dir"
  rsync -a --exclude=/wp-content/cache --exclude=/wp-content/litespeed "$sdir/" "$dir/"
  wp --path="$dir" --allow-root config set DB_NAME "$db" >/dev/null
  [ "$(wp --path="$dir" --allow-root db query 'SELECT DATABASE()' --skip-column-names)" = "$db" ] || die "database switch failed"
  wp --path="$dir" --allow-root search-replace "$src_url" "http://localhost:$port" --all-tables-with-prefix --skip-columns=guid --quiet
  # A copy of a scratch copy keeps the mirror it came from (rsync brought its .scratch-source and any .scratch-target).
  [[ " $MIRRORS " == *" $src "* ]] && echo "$src" > "$dir/.scratch-source"
  chown -R www-data:www-data "$dir"

  flock 9
  echo "Listen $port" >> /etc/apache2/ports.conf
  a2ensite -q "$name" >/dev/null
  apache2ctl configtest 2>/dev/null || die "apache config test failed"
  service apache2 reload >/dev/null
  flock -u 9
  sudo -u www-data wp --path="$dir" cache flush >/dev/null
  write_secrets "$name" "$src" "$src_url" "http://localhost:$port"
  echo "created $name from $src: http://localhost:$port (database $db)"
  fresh_app_password "$name" || die "$name exists but has no working application password: run '$0 secrets $name' once its login file names a user"
  echo "application password made for $name (WP_APP_PWD in its login file)"
  scratch_target add "$name" "$(cat "$dir/.scratch-source")" "http://localhost:$port" || die "$name exists but is not registered as a site target"
}

drop() {
  local name="$1" dir="/var/www/$1" db port
  [[ "$name" =~ $NAME_RE ]] || die "name must match $NAME_RE"
  db="$(db_of "$name")"
  exec 9>/var/lock/scratch-mirror.lock
  flock 9
  if [ -f "/etc/apache2/sites-available/$name.conf" ]; then
    port="$(grep -oE '\*:[0-9]+' "/etc/apache2/sites-available/$name.conf" | cut -d: -f2)"
    a2dissite -q "$name" >/dev/null || true
    rm -f "/etc/apache2/sites-available/$name.conf"
    [ -n "$port" ] && sed -i "/^Listen $port\$/d" /etc/apache2/ports.conf
    service apache2 reload >/dev/null
  fi
  flock -u 9
  mysql -e "DROP DATABASE IF EXISTS \`$db\`"
  rm -rf "$dir" "$dir-backups"
  local secrets
  if secrets="$(secrets_dir)"; then rm -f "$secrets/$name.env"; fi
  scratch_target remove "$name" || echo "scratch-mirror: $name was not registered (or the registration could not be removed)" >&2
  echo "dropped $name"
}

list() {
  for f in /etc/apache2/sites-available/local-mediatest*.conf; do
    [ -e "$f" ] || continue
    local n; n="$(basename "$f" .conf)"
    echo "$n $(grep -oE '\*:[0-9]+' "$f" | cut -d: -f2) $(cat "/var/www/$n/.scratch-source" 2>/dev/null)"
  done
}

# Sourced (by the tests), the script defines its functions and runs nothing.
[[ "${BASH_SOURCE[0]}" == "$0" ]] || return 0

case "${1:-}" in
  create) [ $# -eq 4 ] || die "usage: create <source mirror> <local-mediatest-name> <port>"; create "$2" "$3" "$4" ;;
  drop) [ $# -eq 2 ] || die "usage: drop <local-mediatest-name>"; drop "$2" ;;
  secrets)
    [ $# -eq 2 ] && [[ "$2" =~ $NAME_RE ]] || die "usage: secrets <local-mediatest-name>"
    s_src="$(cat "/var/www/$2/.scratch-source")"
    write_secrets "$2" "$s_src" "$(wp --path="/var/www/$s_src" --allow-root option get siteurl)" "$(wp --path="/var/www/$2" --allow-root option get siteurl)"
    fresh_app_password "$2" || die "$2 has no working application password"
    echo "wrote the login file for $2 from $s_src, with a fresh application password" ;;
  target)
    # The deploy target whose own database this copy holds (refreshed with refresh-from-remote.sh): sync-build.sh then
    # gives it that target's theme.json instead of its source mirror's.
    [ $# -eq 3 ] && [[ "$2" =~ $NAME_RE ]] && [ -f "/var/www/$2/.scratch-source" ] || die "usage: target <local-mediatest-name> <deploy target>"
    # Refuse a name that is not a deploy target with a theme.json now, not at the next sync-build.sh.
    t_check="$(mktemp)"
    python3 "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mirror_theme_json.py" --target "$3" "$t_check" >/dev/null || { rm -f "$t_check"; die "$3 has no theme.json to give $2 (not a deploy target?)"; }
    rm -f "$t_check"
    echo "$3" > "/var/www/$2/.scratch-target"
    echo "$2 now runs the theme.json deployed to $3" ;;
  list) list ;;
  *) die "usage: create <source> <name> <port> | drop <name> | secrets <name> | target <name> <deploy target> | list" ;;
esac
