#!/bin/bash
# Called when a PR receives new commits (synchronize event).
# If its server is currently running, update it in place and restart it (pr-start.sh
# detects the running server and skips the expensive teardown/rebuild). Otherwise just
# invalidate the existing directory so the next visitor gets a fresh build.
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PR=$2
SERVERDIR=$DIR/servers/PR-$PR

if pgrep -F "$SERVERDIR/server.pid" >/dev/null 2>&1; then
  exec "$DIR"/pr-start.sh "$@"
else
  exec "$DIR"/pr-stop.sh "$1" "$2"
fi
