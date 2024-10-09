#!/bin/bash
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
#TEMPLATE=$1
PR=$2
KEEP_COMMONS=$3
SERVERSDIR=$DIR/servers
SERVERDIR=$SERVERSDIR/PR-$PR
BACKUP=$DIR/backups/PR-$PR.tar.xz


libraries=$DIR/common/libraries
modules=$DIR/common/modules
engineAssets=$DIR/common/engineAssets
assets=$DIR/common/assets


echo "$(date) - pr-stop.sh - $PR" >&2


pgrep -F "$SERVERDIR/script.pid" 2>/dev/null && exit 1
[ -d "$SERVERDIR" ] && echo $$ > "$SERVERDIR/script.pid"


echo "$(date) - pr-stop.sh - $PR - GO" >&2


if pgrep -F "$SERVERDIR/server.pid" 2>/dev/null; then
    echo '{"state": "0/4 stopping server"}' > "$SERVERDIR/state.json"
    pkill -F "$SERVERDIR/server.pid"
    while pgrep -F "$SERVERDIR/server.pid"; do
        sleep 1
    done
fi


if [ -d "$SERVERDIR" ]; then
    echo '{"state": "0/4 backing up save"}' > "$SERVERDIR/state.json"
    pushd "$SERVERDIR"
        mkdir -p $(dirname $BACKUP)
        tar cJf "$BACKUP" save server.log
    popd
    rm -rf "$SERVERDIR"
fi


if ! [ "$KEEP_COMMONS" ]; then
    # unused modules directory:
    ls -l "$modules"/*/.bin/ugl* | grep -Po '^[^0-9]+1 .*\K[0-9a-f]{32}' | while read module; do
      rm -rf "$modules"/$module
    done
    # unused libraries directory:
    comm -23 <(cd "$libraries"/; ls -1) <(ls -dl "$SERVERSDIR"/*/library | grep -Po '[0-9a-f]{40}$' | sort -u) | while read library; do
      rm -rf "$libraries"/$library
    done
    # unused assets directory:
    comm -23 <(cd "$engineAssets"/; ls -1) <(ls -dl "$SERVERSDIR"/*/assets | grep -Po '[0-9a-f]{40}$' | sort -u) | while read assets; do
      rm -rf "$engineAssets"/$assets
    done
fi
