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
# The copy records its source in <docroot>/.scratch-source, which sync-build.sh reads to pick the theme.json.
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
  sed "s#$from#$to#g" "$secrets/$src.env" > "$secrets/$name.env"
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
  [[ " $MIRRORS " == *" $src "* ]] || die "source must be one of: $MIRRORS"
  [[ "$name" =~ $NAME_RE ]] || die "name must match $NAME_RE"
  [[ "$port" =~ ^[0-9]+$ ]] && (( port >= 8090 && port <= 8199 )) || die "port must be 8090-8199"
  local sdir="/var/www/$src" dir="/var/www/$name" db
  db="$(db_of "$name")"
  [ -f "$sdir/wp-config.php" ] || die "missing $sdir"
  [ ! -e "$dir" ] || die "$dir exists: drop it first"
  ! grep -q "^Listen $port\$" /etc/apache2/ports.conf || die "port $port is already listened on"
  ! ss -ltn | grep -q ":$port " || die "port $port is in use"

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
  echo "$src" > "$dir/.scratch-source"
  chown -R www-data:www-data "$dir"

  cat > "/etc/apache2/sites-available/$name.conf" <<EOF
<VirtualHost *:$port>
  DocumentRoot $dir
  <Directory $dir>
    AllowOverride All
    Require all granted
  </Directory>
</VirtualHost>
EOF
  echo "Listen $port" >> /etc/apache2/ports.conf
  a2ensite -q "$name" >/dev/null
  apache2ctl configtest 2>/dev/null || die "apache config test failed"
  service apache2 reload >/dev/null
  sudo -u www-data wp --path="$dir" cache flush >/dev/null
  write_secrets "$name" "$src" "$src_url" "http://localhost:$port"
  echo "created $name from $src: http://localhost:$port (database $db)"
}

drop() {
  local name="$1" dir="/var/www/$1" db port
  [[ "$name" =~ $NAME_RE ]] || die "name must match $NAME_RE"
  db="$(db_of "$name")"
  if [ -f "/etc/apache2/sites-available/$name.conf" ]; then
    port="$(grep -oE '\*:[0-9]+' "/etc/apache2/sites-available/$name.conf" | cut -d: -f2)"
    a2dissite -q "$name" >/dev/null || true
    rm -f "/etc/apache2/sites-available/$name.conf"
    [ -n "$port" ] && sed -i "/^Listen $port\$/d" /etc/apache2/ports.conf
    service apache2 reload >/dev/null
  fi
  mysql -e "DROP DATABASE IF EXISTS \`$db\`"
  rm -rf "$dir" "$dir-backups"
  local secrets
  if secrets="$(secrets_dir)"; then rm -f "$secrets/$name.env"; fi
  echo "dropped $name"
}

list() {
  for f in /etc/apache2/sites-available/local-mediatest*.conf; do
    [ -e "$f" ] || continue
    local n; n="$(basename "$f" .conf)"
    echo "$n $(grep -oE '\*:[0-9]+' "$f" | cut -d: -f2) $(cat "/var/www/$n/.scratch-source" 2>/dev/null)"
  done
}

case "${1:-}" in
  create) [ $# -eq 4 ] || die "usage: create <source mirror> <local-mediatest-name> <port>"; create "$2" "$3" "$4" ;;
  drop) [ $# -eq 2 ] || die "usage: drop <local-mediatest-name>"; drop "$2" ;;
  secrets)
    [ $# -eq 2 ] && [[ "$2" =~ $NAME_RE ]] || die "usage: secrets <local-mediatest-name>"
    s_src="$(cat "/var/www/$2/.scratch-source")"
    write_secrets "$2" "$s_src" "$(wp --path="/var/www/$s_src" --allow-root option get siteurl)" "$(wp --path="/var/www/$2" --allow-root option get siteurl)"
    echo "wrote the login file for $2 from $s_src" ;;
  list) list ;;
  *) die "usage: create <source> <name> <port> | drop <name> | secrets <name> | list" ;;
esac
