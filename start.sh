#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
PROJECT_DIR="$(pwd -P)"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR is required for deployment metadata}"
PORT="${PORT:-${APP_PORT:-3000}}"

[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT > 0 && PORT < 65536 )) || { echo "Invalid PORT: $PORT" >&2; exit 1; }
[[ "$OPENCODE_WEB_DIR" = /* ]] || { echo 'OPENCODE_WEB_DIR must be absolute.' >&2; exit 1; }

/usr/bin/time -p mkdir -p -- "$OPENCODE_WEB_DIR"
DEPLOY_DIR="$PROJECT_DIR"

# This game is plain static HTML/CSS/ES modules and has no package dependencies
# or compilation step. Keep optional package-based build support for future edits.
if [[ -f package.json ]]; then
  /usr/bin/time -p npm install --no-audit --no-fund
  HAS_BUILD="$(/usr/bin/time -p node -e "const p=require('./package.json'); process.stdout.write(p.scripts?.build ? 'yes' : 'no')")"
  if [[ "$HAS_BUILD" == yes ]]; then
    /usr/bin/time -p npm run build
    if [[ -f dist/index.html ]]; then DEPLOY_DIR="$PROJECT_DIR/dist"; fi
  fi
fi

[[ -f "$DEPLOY_DIR/index.html" ]] || { echo "Static entry point missing: $DEPLOY_DIR/index.html" >&2; exit 1; }
/usr/bin/time -p node -e '
  const fs = require("node:fs");
  const path = require("node:path");
  const [project, directory, output] = process.argv.slice(1);
  const payload = JSON.stringify({ project, directory: path.resolve(directory) });
  const temporary = `${output}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, payload);
  fs.renameSync(temporary, output);
' "$PROJECT_DIR" "$DEPLOY_DIR" "$OPENCODE_WEB_DIR/deployment-output.json"

# Keep the server in the foreground so the controller can own its lifecycle.
/usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$DEPLOY_DIR"
