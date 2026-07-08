#!/bin/bash
# Updates (or creates) a beta server from a git branch and (re)starts it.
# Triggered by the AI agent through POST /puppeteer/beta-update in main.js.
#
# beta-update.sh <name> <branch> <port> <externalURL> <urlPrefix> <adminURL> <ntfyURL>
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
NAME=$1
BRANCH=$2
PORT=$3
EXTERNAL_URL=$4
URL_PREFIX=$5
ADMIN_URL=$6
NTFY_URL=$7
SERVER=$DIR/servers/BETA-$NAME

if ! [ -d "$SERVER/.git" ]; then
    mkdir -p "$(dirname "$SERVER")"
    git clone https://github.com/ArnoldSmith86/virtualtabletop.git "$SERVER"
fi

pgrep -F "$SERVER/script.pid" 2>/dev/null && exit 1
echo $$ > "$SERVER/script.pid"

mkdir -p "$DIR/save/BETA-$NAME" "$DIR/common/assets"

pushd "$SERVER"
    echo '{"state": "0/3 stopping server"}' > state.json
    if pgrep -F server.pid 2>/dev/null; then
        pkill -F server.pid
        while pgrep -F server.pid; do
            sleep 1
        done
        rm server.pid
    fi

    cat <<____EOF > config.json
        {
            "serverName": "$NAME | VTT",
            "port": $PORT,
            "externalURL": "$EXTERNAL_URL",
            "urlPrefix": "$URL_PREFIX",
            "minifyJavascript": true,
            "adminURL": "$ADMIN_URL",

            "directories": {
                "library": "library",
                "save": "$DIR/save/BETA-$NAME",
                "assets": "$DIR/common/assets"
            },

            "betaServers": {},
            "legacyServers": {}
        }
____EOF

    echo '{"state": "1/3 updating git"}' > state.json
    git checkout .
    git fetch origin "$BRANCH"
    # the branch is force-pushed by the AI agent, so hard-reset instead of pull
    git checkout -B "$BRANCH"
    git reset --hard "origin/$BRANCH"

    echo '{"state": "2/3 updating dependencies"}' > state.json
    npm install --omit=dev

    echo '{"state": "3/3 starting"}' > state.json
    echo "BETA SERVER STARTING - $(date) - $(git rev-parse --short HEAD)" >> server.log
    curl -G "$NTFY_URL/trigger" \
         --data-urlencode "title=VTT Beta Restart ($NAME)" \
         --data-urlencode "message=$(git rev-parse --short HEAD) $(git log -1 --pretty=%B) --- $(df -h . | awk 'NR==2{print $4}')" &
    nohup node server.mjs >> server.log 2>&1 &
    echo $! > server.pid

    echo '{"state": "3/3 waiting for server"}' > state.json
    awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep  1
    awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep  2
    awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep  5
    awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep 10
    sleep 2

    if awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log; then
        echo "{\"state\": \"running\", \"revision\": \"$(git rev-parse --short HEAD)\"}" > state.json
    else
        echo "{\"state\": \"ERROR: server did not start - see server.log\", \"revision\": \"$(git rev-parse --short HEAD)\"}" > state.json
    fi
    rm script.pid
popd
