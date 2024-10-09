#!/bin/bash
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TEMPLATE=$1
PR=$2
ADMIN_URL=$3
NTFY_URL=$4
SERVERDIR=$DIR/servers/PR-$PR
BACKUP=$DIR/backups/PR-$PR.tar.xz


libraries=$DIR/common/libraries
modules=$DIR/common/modules
engineAssets=$DIR/common/engineAssets
assets=$DIR/common/assets

"$DIR"/pr-stop.sh "$1" "$2" keep-commons

echo "$(date) - pr-start.sh - $PR" >&2

pgrep -F "$SERVERDIR/script.pid" 2>/dev/null && exit 1
grep ERROR "$SERVERDIR/state.json" 2>/dev/null && exit 1
[ -d "$SERVERDIR" ] && echo $$ > "$SERVERDIR/script.pid"


echo "$(date) - pr-start.sh - $PR - GO" >&2


mkdir -p "$SERVERDIR"
cd "$SERVERDIR"

echo $$ > script.pid

echo '{"state": "1/4 copying template files"}' > state.json

# abort if less than 3 GB of free space is available
if [ $(df --output=avail -BG . | tail -n 1 | tr -d 'G') -lt 3 ]; then
  echo '{"state": "ERROR: less than 3 GB of free space available"}' | tee -a server.log > state.json
  rm script.pid
  exit 1
fi

cp -a "$TEMPLATE"/.git .
shopt -s extglob
cp -a "$TEMPLATE"/!(save|node_modules|server.log) .
shopt -u extglob

if [ $PR -gt 10000 ]; then
  commit=$(git log --oneline | tac | head -$((PR-10000)) | awk 'END { print $1 }')
  echo '{"state": "2/4 checking out commit '$commit'"}' > state.json

  git checkout .
  git checkout $commit
  name="$(git rev-parse --short HEAD) | VTT"
else
  echo '{"state": "2/4 checking out pull request"}' > state.json

  git checkout .
  git fetch origin pull/$PR/head:PR
  git checkout PR
  name="PR$PR | $(git rev-parse --short HEAD) | VTT"
fi

if ! grep urlPrefix config.template.json; then
  PORTOFFSET=20000
else
  PORTOFFSET=0
fi

if grep localhost client/js/main.js; then
  sed -i "s/localhost/'+location.hostname+'/" client/js/main.js
fi

if grep 8273 server.mjs; then
  sed -i "s/8273/$((PR+PORTOFFSET+30000))/" server.mjs server/websocket.mjs client/js/main.js
fi

if [ "$PR" -lt 1000 ]; then
  PORTOFFSET=20000
fi

find > _filesAfterCheckout

if [ -e library/games ]; then
  git log -n 5 library > _library.log
  libraryCommit=$(git log -n 1 --pretty=format:%H -- library)
  if ! [ -d "$libraries/$libraryCommit" ]; then
    mkdir -p "$libraries"
    mv library "$libraries/$libraryCommit"
    (
      if [ ! -e "$libraries"-compressing ]; then
        echo $1 > "$libraries"-compressing
        rdfind -removeidentinode false -makehardlinks true -makeresultsfile false "$libraries"
        rm "$libraries"-compressing
      fi
    ) &
  fi
  rm -rf library
  ln -s "$libraries/$libraryCommit" library
else
  echo '{"state": "2/4 checking out public library git submodule"}' > state.json
  git submodule update --init
fi

git log -n 5 assets > _assets.log
assetsCommit=$(git log -n 1 --pretty=format:%H -- assets)
if ! [ -d "$engineAssets/$assetsCommit" ]; then
  mkdir -p "$engineAssets"
  mv assets "$engineAssets/$assetsCommit"
  (
    if [ ! -e "$engineAssets"-compressing ]; then
      echo $1 > "$engineAssets"-compressing
      rdfind -removeidentinode false -makehardlinks true -makeresultsfile false "$engineAssets"
      rm "$engineAssets"-compressing
    fi
  ) &
fi
rm -rf assets
ln -s "$engineAssets/$assetsCommit" assets

# apply a patch that removes server-only config from client
if grep adminURL config.template.json && ! grep adminURL server/config.mjs; then
  base64 -di <<__EOF | unxz | git apply
    /Td6WFoAAATm1rRGAgAhARYAAAB0L+Wj4AZHAqhdADIaSQnC/BF9UN4KT0fZIv8EZZw0xLXYHuLz
    d5UueJO/WkbzNV7i5TxeN3Uez32j6/CYaqPqPcSkRH6GyUM1oFo91KmiWwJIgcBX5adOb8lGBpYy
    siqyLx9xdg2+TGFM1RdcHgKxYlMM9neqUnJuYKt5+ajCdLOx2s8Mydxq1DfRJ2XaQ39R75Vi+2MO
    R0YQmXuxwQNFwa3TC6GiUfYkZmpbpTTscC9Ay7aCqRuOJlXKcnGmYzg88fbwqA+k1JSfAf3fLiBH
    5cc9ZgThLqHOeoy9yVqOqXzkxXDRPIRSJ92PaKuVFTCFhupEg5sf4R1q5DlqSCEu/a6ioxj5tOdS
    OiiGSnnCncOjWBrRNYJD86WreMddwcn9rz730S21xG4isW+pJ9iBU556/1YtbVA9IENG1b2/UDf+
    DaDqauKLOgvlW1AiEvU/dljCYEAFdnp8t4D1KNMb5Gay/6MuDjBhcnm6uIV6+yWzS1jSimPb7OjG
    aQMgpm1G8qFcYR8TtNq3VtAJCL7y2RzIjEbXHdbzivw99+WhmegOAZb3e2qyDXoveWUJAa7yGo2S
    BjCyrrOoZgGUObioYW3tlt6o53rTp24coOkwNbXLp3acMiVWRMc2q7hVRueaQoD2nCOUosdNSOih
    2M8Jg478FYYUjql8GJPl7b398KLI9p8GoKUNsocAS1k8In9lECyXHK8NKrsalaQTuazDKMlpwyhS
    gNv8gMjVOWy2Ku+B3lQ8Gnexf389GptM0vFHliNT3Lj8747izCu6yYprb76JwfIV/yHSCEHI3ha7
    8JEtVEZFRU9F2M1WzVJkd56KXqrIdB4YYKCknJ/lUpC8/+CBmBaeZSN9Qf1TznDkST0hQ/b9sBxW
    0WRQ0bQfN6sZlaE7rwnuQaL5CA35Ob89VKIAAMpW9m0KQl/mAAHEBcgMAACCOC87scRn+wIAAAAA
    BFla
__EOF
fi

git status > git-status
git log --oneline > git-log
git rev-parse --short HEAD > git-revision


cat <<EOF > config.json
    {
        "serverName": "$name",
        "port": $((PR+PORTOFFSET)),
        "externalURL": "https://test.virtualtabletop.io/PR-$PR",
        "urlPrefix": "/PR-$PR",
        "minifyJavascript": false,
        "forceTracing": false,
        "customTab": null,

        "allowPublicLibraryEdits": true,
        "adminURL": "$ADMIN_URL",

        "directories": {
            "library": "library",
            "save": "save",
            "assets": "$assets"
        },

        "betaServers": {},
        "legacyServers": {}
    }
EOF

echo '{"state": "3/4 installing dependencies"}' > state.json

modulesHash=$(md5sum package-lock.json | awk '{ print $1 }')
if ! [ -d "$modules/$modulesHash" ]; then
  mkdir -p "$modules"
  if ! npm install --omit=dev; then
    npm uninstall jest*
    npm install --omit=dev
  fi
  mv node_modules "$modules/$modulesHash"
  cp -la "$modules/$modulesHash" node_modules

  if [ ! -e "$modules"-compressing ]; then
    echo '{"state": "3/4 updating dependencies (compressing by hard-linking)"}' > state.json
    echo $1 > "$modules"-compressing
    rdfind -removeidentinode false -makehardlinks true -makeresultsfile false "$modules"
    rm "$modules"-compressing
    cp -la "$modules/$modulesHash" node_modules_temp
    rm -rf node_modules
    mv node_modules_temp node_modules
  else
    sleep 60
  fi
else
  cp -la "$modules/$modulesHash" node_modules
fi


if [ -e "$BACKUP" ]; then
    echo '{"state": "4/4 restoring backup"}' > state.json
    tar xJf "$BACKUP"
fi

echo '{"state": "4/4 starting"}' > state.json

echo "PR SERVER STARTING - $(date) - $(git rev-parse --short HEAD)" >> server.log
curl -G "$NTFY_URL/trigger" \
      --data-urlencode "title=VTT PR Server Start" \
      --data-urlencode "message=PR$PR --- $(git rev-parse --short HEAD) $(git log -1 --pretty=%B) --- $(df -h . | awk 'NR==2{print $4}')" &
PORT=$((PR+PORTOFFSET)) nohup node server.mjs >> server.log 2>&1 &
echo $! > server.pid

echo '{"state": "4/4 waiting for server"}' > state.json

awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep  1
awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep  2
awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep  5
awk '/SERVER STARTING/{invalid=1} /Listening on/{invalid=0} END{exit invalid}' server.log || sleep 10
sleep 2

if [ $PORTOFFSET = 0 ]; then
  echo '{"state": "running"}' > state.json
else
  url="http://$(hostname -I | awk '{print $1}'):$((PR+PORTOFFSET))"
  echo "{\"state\": \"The server is running. But the version is very old and does not support urlPrefix yet. Please access it using <a href='$url'>$url</a>.\", \"redirect\": \"$url\"}" > state.json
fi

rm -rf .* tests/ coverage/ CODEOWNERS LICENSE README.md SECURITY.md jest.config.mjs package-lock.json package.json config.template.json
xz _* git-*
rm script.pid


echo "$(date) - pr-start.sh - $PR - DONE" >&2
