#!/bin/bash
TOKEN=GET_TOKEN_FROM_GITHUB

config_default() {
  cat <<__EOF > config.json
    {
      "port": $1,
      "externalURL": "${2:-http://212.47.248.129:$1}",
      "urlPrefix": "$3",
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
}

config_editor() {
  config_default 10002 https://beta.virtualtabletop.io/editor /editor
}

config_handpicked() {
  config_default 10004 https://beta.virtualtabletop.io/handpicked /handpicked
}

config_stable() {
  config_default 10001 https://beta.virtualtabletop.io
}

config_unstable() {
  config_default 10003 https://beta.virtualtabletop.io/unstable /unstable
}

create() {
  # create in new temp dir and then switch to minimize downtime?
  [ "$1" ] || return
  mv "$1"/save "$1_save"
  rm -rf "$1"/
  git clone --depth 1 https://github.com/ArnoldSmith86/virtualtabletop.git "$1"

  pushd "$1"
    git config user.email "you@example.com"
    git config user.name "Your Name"
    linkModules

    cat <<____EOF > /tmp/staging_$1.htm
      <style>
        .hasOverlay #aboutOverlay {
          padding: 10px 10px 100%;
        }
        #aboutOverlay ul {
          box-sizing: border-box;
          width: 100%;
          max-width: 60em;
        }
        #aboutOverlay li {
          position: relative;
        }
        #aboutOverlay .skipped a {
          text-decoration: line-through;
          opacity: 0.2;
        }
        #aboutOverlay .notmerged a {
          text-decoration: line-through;
          opacity: 0.5;
        }
        #aboutOverlay .details {
          display: inline;
        }
        #aboutOverlay .details > div {
          display: none;
          position: absolute;
          background: #222;
          top: 100%;
          right: 0;
          padding: 10px;
          width: 50%;
          z-index: 999;
        }
        #aboutOverlay li:hover .details > span+div {
          display: block;
        }
      </style>
____EOF
    echo "<ul>" >> /tmp/staging_$1.htm

    baseCommit=$(git rev-parse --short HEAD)
    listPullRequestsCached | while read line; do
      output=$(eval "filterPR_$1 $line")
      pr=$(grep -Po '^[0-9]+' <<<"$line")
      name=$(eval "getName $line")
      if [ "$output" ]; then
        echo "SKIPED $pr $name"
        echo "<li class=skipped>" >> /tmp/staging_$1.htm
      elif ! [ "$pr" = 984 ] && output=$(eval "mergePR $line" 2>&1); then
        echo "MERGED $pr $name"
        echo "<li>" >> /tmp/staging_$1.htm
      else
        echo "FAILED $pr $name"
        echo "<li class=notmerged>" >> /tmp/staging_$1.htm
      fi
      echo "<a href=\"https://github.com/ArnoldSmith86/virtualtabletop/pull/$pr\">#$pr - $name</a><div class='details'> <span>ℹ️</span><div>$(echo "$output" | tr '\n' '~' | sed 's/~/<br>/g')</div></div>" >> /tmp/staging_$1.htm
      echo "</li>" >> /tmp/staging_$1.htm
    done

    echo "</ul>" >> /tmp/staging_$1.htm

    sed -n '0,/id="aboutOverlay/p' client/room.html > /tmp/newRoom_$1.html
    echo "<h1>About this VirtualTabletop.io beta server</h1>" >> /tmp/newRoom_$1.html
    echo "<p>Please see the about screen on <a href=\"https://virtualtabletop.io\">virtualtabletop.io</a> for general infos.</p>" >> /tmp/newRoom_$1.html
    echo "<p>This beta server was created at $(date -u +"%F %T") UTC. It is based on <a href=\"https://github.com/ArnoldSmith86/virtualtabletop/commits/$baseCommit\">main commit $baseCommit</a> and contains these <a href=\"https://github.com/ArnoldSmith86/virtualtabletop/pulls\">unmerged pull requests</a>:</p>" >> /tmp/newRoom_$1.html
    cat /tmp/staging_$1.htm >> /tmp/newRoom_$1.html
    echo "<p>If you find any problems, please <a href=\"https://github.com/ArnoldSmith86/virtualtabletop/issues/new\">open an issue</a> or - if you know which pull request causes it - add a comment to that pull request. Thank you.</p>" >> /tmp/newRoom_$1.html
    echo "<div id=\"betaText\"></div></div>" >> /tmp/newRoom_$1.html
    sed -n '/id="internalErrorOverlay/,$p' client/room.html >> /tmp/newRoom_$1.html
    mv /tmp/newRoom_$1.html client/room.html

    linkLibrary
    rm -rf node_modules/
    linkModules
    rm -rf .[egt]* [CLRS]* tests/ package-lock.json jest.config.mjs config.template.json
    config_$1
  popd
  mv "$1_save" "$1"/save
}

cron() {
  (
    date
    pushd ~/BETA-test-servers
      if [ -e update ]; then
        update stable
        update handpicked
        update editor
        update unstable
        rm update
      fi
    popd
  ) >> ~/BETA-test-servers/log 2>&1
}

filterPR_editor() {
  [ "$1" = 1087 ] && return # needed for URL to work
  [ "$1" =  791 ] && echo PR791 has radical changes. Not supported.
  [ "$6" =    0 ] && echo PR branch is in another repository. Not supported yet.
  shift
  [[ "$9" = *editor* ]] || echo 'PR does not contain label "JSON editor".'
}

filterPR_handpicked() {
  echo "$1" | grep -qP '1114|1112|1087|1081|1033|893|892' || echo Not included in handpicked PRs.
}

filterPR_stable() {
  [ "$1" = 791 ] && echo PR791 has radical changes. Not supported.
  [ "$3" =   0 ] && echo Latest commit does not pass automated tests.
  [ "$4" =   0 ] && echo Latest commit can not be merged to main without manually resolving conflicts according to GitHub.
  [ "$5" =   1 ] && echo PR is marked as a draft.
  [ "$6" =   0 ] && echo PR branch is in another repository. Not supported yet.
}

filterPR_unstable() {
  [ "$1" = 791 ] && echo PR791 has radical changes. Not supported.
  [ "$6" =   0 ] && echo PR branch is in another repository. Not supported yet.
}

getName() {
  echo "$9"
}

linkLibrary() {
  # copied from update-pull-request.sh (and added "cat library-commit ||")
  libraries=~/libraries
  libraryCommit=$(cat library-commit || git submodule status library | grep -Po '^.\K[0-9a-f]+')
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
}

linkModules() {
  # copied from update-pull-request.sh
  modules=~/modules
  modulesHash=$(md5sum package-lock.json | awk '{ print $1 }')
  if ! [ -d "$modules/$modulesHash" ]; then
    mkdir "$modules"
    npm install --prod
    mv node_modules "$modules/$modulesHash"
    rdfind -removeidentinode false -makehardlinks true -makeresultsfile false "$modules"
  fi
  cp -la "$modules/$modulesHash" node_modules
}

listPullRequests() {
  node <<__EOF
    require('node-fetch')('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'bearer $TOKEN'
      },
      body: JSON.stringify({query: \`query MyQuery {
        repository(name: "virtualtabletop", owner: "ArnoldSmith86") {
          pullRequests(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}, states: OPEN) {
            nodes {
              number
              title
              baseRefName
              headRefName
              headRepositoryOwner {
                login
              }
              labels(first: 100) {
                nodes {
                  name
                }
              }
              updatedAt
              url
              mergeable
              isDraft
              reviewDecision
              commits(last: 1) {
                nodes {
                  commit {
                    statusCheckRollup {
                      state
                    }
                  }
                }
              }
            }
          }
        }
      }\`})
    }).then(r=>r.json()).then(j=>{
      require('fs').writeFileSync('../prList.json', JSON.stringify(j, null, '  '));
      for(const pr of j.data.repository.pullRequests.nodes) {
        pr.statusCheck = pr.commits.nodes[0].commit.statusCheckRollup && pr.commits.nodes[0].commit.statusCheckRollup.state;
        console.log(\`\${pr.number} \${pr.updatedAt} \${pr.statusCheck == 'SUCCESS' ? 1 : 0} \${pr.mergeable == 'MERGEABLE' ? 1 : 0} \${pr.isDraft ? 1 : 0} \${pr.headRepositoryOwner.login == 'ArnoldSmith86' ? 1 : 0} '\${pr.baseRefName}' '\${pr.headRefName}' '\${pr.title.replace(/'/g, "'\"'\"'")}' '\${pr.labels.nodes.map(l=>l.name).join('|')}'\`);
      }
    });
__EOF
}

listPullRequestsCached() {
  [ "$(find ../prCache -mmin -10)" ] && cat ../prCache && return
  while true; do
    listPullRequests > ../prCache
    [ $(grep '"mergeable": "UNKNOWN"' ../prCache | wc -l) -gt 10 ] || break
    sleep 5m
  done
  cat ../prCache
}

mergePR() {
  pr=$1
  name=$9

  curl -s https://patch-diff.githubusercontent.com/raw/ArnoldSmith86/virtualtabletop/pull/$pr.diff | patch -fp1
  untracked=$(git status | sed -n '/Untracked/,$p' | grep -Po '^\t\K.*')

  grep -Pv '\.(orig|rej)$' <<<"$untracked" | grep . | while read new; do
    echo "Adding new file $new."
    git add "$new"
  done

  grep -P '\.orig$' <<<"$untracked" | grep . | while read original; do
    rm "$original"
  done

  grep -P '\.rej$' <<<"$untracked" | grep . | while read rej; do
    if [ "$rej" = library.rej ]; then
      grep -Po '^\+Subproject commit \K.*' library.rej > library-commit
      echo "Setting library to commit $(<library-commit)."
      git add library-commit
      rm library.rej
    fi
  done

  untracked=$(git status | sed -n '/Untracked/,$p' | grep -Po '^\t\K.*')

  if grep -Pv '\.orig' <<<"$untracked" | grep .; then
    echo "MERGE FAILED: found untracked files:" >&2
    echo "$untracked"
    git reset --hard HEAD && git clean -fd
    return 1
  fi

  git commit -am "STAGING: $name (#$pr)"
}

start() {
  pushd "$1"
    stop
    nohup node server.mjs >server.log 2>&1 &
    echo $! > run.pid
  popd
}

stop() {
  pushd "$1"
    [ -e run.pid ] && kill $(<run.pid)
    rm run.pid
    sleep 2
    port=$(grep -Po 'port": \K[0-9]+' config.json)
    if [ "$port" -gt 10000 ] && runningPID=$(netstat -nap | grep -Po ":::$port.*LISTEN.*?\K[0-9]+"); then
      sleep 3
      kill -9 $runningPID
      sleep 2
    fi
  popd
}

update() {
  [ -d "$1" ] && stop "$1"
  create "$1"
  start "$1"
}

"$@"
