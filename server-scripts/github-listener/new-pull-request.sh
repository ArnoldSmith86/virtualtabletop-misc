#!/bin/bash
TOKEN=GET_TOKEN_FROM_GITHUB

dir=~/PR-test-servers/$1
backup=~/PR-test-servers/backups/$1.tar.xz

libraries=~/libraries
modules=~/modules
assets=~/assets


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
  if [ $1 -ge 1087 ] && grep -q router server.mjs; then
    echo https://test.virtualtabletop.io/PR-$1
  else
    echo http://212.47.248.129:$(port $1)
  fi
}

urlPrefix() {
  if [ $1 -ge 1087 ] && grep -q router server.mjs; then
    echo /PR-$1
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

git fetch --depth 1 origin pull/$1/head:PR
git checkout PR

if ! [ -e library/games ]; then
  libraryCommit=$(git submodule status library | grep -Po '^.\K[0-9a-f]+')
  if ! [ -d "$libraries/$libraryCommit" ]; then
    mkdir "$libraries"
    git clone https://github.com/ArnoldSmith86/virtualtabletop-library.git "$libraries/$libraryCommit"
    pushd "$libraries/$libraryCommit"
      git checkout $libraryCommit
      rm -rf .git
    popd
    rdfind -removeidentinode false -makehardlinks true -makeresultsfile false "$libraries" &
  fi
  rmdir library
  ln -s "$libraries/$libraryCommit" library
else
  git log -n 5 library > _library.log
  libraryCommit=$(git log -n 1 --pretty=format:%H -- library)
  if ! [ -d "$libraries/$libraryCommit" ]; then
    mkdir "$libraries"
    mv library "$libraries/$libraryCommit"
    rdfind -removeidentinode false -makehardlinks true -makeresultsfile false "$libraries" &
  fi
  rm -rf library
  ln -s "$libraries/$libraryCommit" library
fi

git status > git-status
git log --oneline > git-log
git rev-parse --short HEAD > git-revision
sed -ri "s#<title>VirtualTabletop.io</title>#<title>PR$1 | $(<git-revision) | VTT</title>#" client/room.html
sed -ri '/document.title = /d' client/js/main.js
rm -rf .git

if [ -e config.template.json ]; then
  cat <<__EOF > config.json
    {
      "port": $(port $1),
      "externalURL": "$(url $1)",
      "urlPrefix": "$(urlPrefix $1)",
      "minifyJavascript": false,

      "directories": {
        "library": "library",
        "save": "save",
        "assets": "$assets"
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
  rdfind -removeidentinode false -makehardlinks true -makeresultsfile false "$modules" &
fi
cp -la "$modules/$modulesHash" node_modules

nohup env NOCOMPRESS=1 PORT=$(port $1) node server.mjs >server.log 2>&1 &
echo $! > run.pid

if ! [ -e $backup ]; then
  curl -H "Authorization: Bearer $TOKEN" \
    https://api.github.com/repos/ArnoldSmith86/virtualtabletop/issues/$1/comments \
    -d "{\"body\":\"PR-SERVER-BOT: You can play around with it here: $(url $1)/pr-test (or any other room on that server)\n\nAfter merging, a backup will be available at \`https://beta.virtualtabletop.io/editor/PR$1-pr-test\`.\"}"
fi

rm "$dir-initializing"
