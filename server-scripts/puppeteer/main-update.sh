#!/bin/bash
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SERVER=$DIR/servers/MAIN
ADMIN_URL=$1
NTFY_URL=$2

if ! [ -d "$SERVER/.git" ]; then
    mkdir -p "$(dirname "$SERVER")"
    git clone https://github.com/ArnoldSmith86/virtualtabletop.git "$SERVER"
fi

pgrep -F "$SERVER/script.pid" 2>/dev/null && exit 1
grep ERROR "$SERVER/state.json" 2>/dev/null && exit 1
[ -d "$SERVER" ] && echo $$ > "$SERVER/script.pid"

mkdir -p "$DIR/save/MAIN" "$DIR/common/assets"

# build the betaServers block for the client from the beta servers this
# puppeteer manages (see betaServers in config.json / beta-update.sh)
BETA_SERVERS=$(node -e '
    const c = require(process.argv[1]);
    const out = {};
    for (const [name, beta] of Object.entries(c.betaServers || {}))
        out[name] = { url: beta.url, return: !!beta.return, description: beta.description || "" };
    console.log(JSON.stringify(out));
' "$DIR/config.json" 2>/dev/null || echo '{}')
[ -z "$BETA_SERVERS" ] && BETA_SERVERS='{}'

pushd "$SERVER"
    echo '{"state": "0/3 stopping server"}' > state.json
    if pgrep -F server.pid; then
        pkill -F server.pid
        while pgrep -F server.pid; do
            sleep 1
        done
        rm server.pid
    fi

    cat <<____EOF > config.json
        {
            "port": 8272,
            "externalURL": "https://virtualtabletop.io",
            "urlPrefix": "",
            "minifyJavascript": true,
            "adminURL": "$ADMIN_URL",

            "directories": {
                "library": "library",
                "save": "$DIR/save/MAIN",
                "assets": "$DIR/common/assets"
            },

            "betaServers": $BETA_SERVERS,
            "legacyServers": {}
        }
____EOF

    echo '{"state": "1/3 updating git"}' > state.json
    git checkout .
    git checkout main
    git pull


    echo '{"state": "2/3 updating dependencies"}' > state.json
    npm install --omit=dev

    if [ -f "$DIR/donate_insert.htm" ]; then
        awk 'NR==FNR{a[i++]=$0}
            NR>FNR{
                if($0~"<h2>Copyright Attribution</h2>"){
                    for(j=0;j<i;j++){
                        print a[j]
                    }
                }
                print $0
            }
        ' "$DIR/donate_insert.htm" client/room.html > /tmp/room.html && mv /tmp/room.html client/room.html
    fi

    echo '{"state": "3/3 starting"}' > state.json
    echo "SERVER STARTING - $(date) - $(git rev-parse --short HEAD)" >> server.log
    curl -G "$NTFY_URL/trigger" \
         --data-urlencode "title=VTT Restart" \
         --data-urlencode "message=$(git rev-parse --short HEAD) $(git log -1 --pretty=%B) --- $(df -h . | awk 'NR==2{print $4}')" &
    nohup node server.mjs >> server.log 2>&1 &
    echo $! > server.pid

    echo '{"state": "3/3 waiting for server"}' > state.json
    awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep  1
    awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep  2
    awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep  5
    awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep 10
    sleep 2

    echo '{"state": "running"}' > state.json
    rm script.pid
popd
