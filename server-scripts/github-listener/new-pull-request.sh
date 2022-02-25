#!/bin/bash
TOKEN=GET_TOKEN_FROM_GITHUB

dir=~/PR-test-servers/$1
backup=~/PR-test-servers/backups/$1.tar.xz

libraries=~/libraries
modules=~/modules


mkdir -p $dir
touch "$dir-initializing"
touch ~/BETA-test-servers/update

port() {
  if [ $1 -lt 1087 ]; then
    echo $(($1 + 3000))
  else
    echo $1
  fi
}

url() {
  if grep -q router server.mjs; then
    echo https://test.virtualtabletop.io/PR-$1
  else
    echo http://212.47.248.129:$(port $1)
  fi
}

if runningPID=$(netstat -nap | grep -Po ":::$(port $1).*LISTEN.*?\K[0-9]+"); then
  kill -9 $runningPID
fi

git clone --depth 1 https://github.com/ArnoldSmith86/virtualtabletop.git "$dir"
cd "$dir"

mkdir save
if [ -e "$backup" ]; then
  pushd /
  tar xJf "$backup"
  popd
fi

[ -h save/assets ] || ln -s ~/virtualtabletop/save/assets save/assets

git fetch --depth 1 origin pull/$1/head:PR
git checkout PR

if ! [ $1 = 791 ]; then
  libraryCommit=$(git submodule status library | grep -Po '^.\K[0-9a-f]+')
  if ! [ -d "$libraries/$libraryCommit" ]; then
    mkdir "$libraries"
    git clone https://github.com/ArnoldSmith86/virtualtabletop-library.git "$libraries/$libraryCommit"
    pushd "$libraries/$libraryCommit"
      git checkout $libraryCommit
      rm -rf .git
    popd
    rdfind -removeidentinode false -makehardlinks true -makeresultsfile false "$libraries"
  fi
  rmdir library
  ln -s "$libraries/$libraryCommit" library
fi

git status > git-status
git log --oneline > git-log
git rev-parse --short HEAD > git-revision
sed -ri "s#<title>VirtualTabletop.io</title>#<title>PR$1 | $(<git-revision) | VTT</title>#" client/room.html
rm -rf .git

if [ -e config.template.json ]; then
  cat <<__EOF > config.json
    {
      "port": $(port $1),
      "externalURL": "$(url $1)",
      "urlPrefix": "/PR-$1",
      "minifyJavascript": false,

      "directories": {
        "library": "library",
        "save": "save",
        "assets": "save/assets"
      },

      "betaServers": {},
      "legacyServers": {}
    }
__EOF
fi

modulesHash=$(md5sum package-lock.json | awk '{ print $1 }')
if ! [ -d "$modules/$modulesHash" ]; then
  mkdir "$modules"
  npm install --prod
  mv node_modules "$modules/$modulesHash"
  rdfind -removeidentinode false -makehardlinks true -makeresultsfile false "$modules"
fi
cp -la "$modules/$modulesHash" node_modules

nohup env NOCOMPRESS=1 PORT=$(port $1) node server.mjs >server.log 2>&1 &
echo $! > run.pid

if ! [ -e $backup ]; then
  curl -H "Authorization: Bearer $TOKEN" \
    https://api.github.com/repos/ArnoldSmith86/virtualtabletop/issues/$1/comments \
    -d "{\"body\":\"PR-SERVER-BOT: You can play around with it here: $(url $1)/pr-test (or any other room on that server)\"}"
fi

rdfind -removeidentinode false -makehardlinks true -makeresultsfile false $dir/../*/assets
rm "$dir-initializing"
