#!/bin/bash
dir=~/PR-test-servers/$1
backup=~/PR-test-servers/backups/$1.tar.xz

touch ~/BETA-test-servers/update
cd

if [ -d $dir ]; then
  while [ -e "$dir-initializing" ]; do
    sleep 5
  done
  kill -9 $(<$dir/run.pid)
  mkdir -p $(dirname $backup)
  tar cJf $backup $dir/save

  for room in $dir/save/rooms/*json; do
    cp $room ~/virtualtabletop/save/rooms/PR$1-$(basename $room)
  done
  for state in $dir/save/states/*json; do
    cp $state ~/virtualtabletop/save/states/PR$1-$(basename $state)
  done

  rm -rf $dir/
  if ! [ "$2" = update ]; then
    # unused modules directory:
    ls -l ~/modules/*/.bin/ugl* | grep -Po '^[^0-9]+1 .*\K[0-9a-f]{32}' | while read modules; do
      rm -rf ~/modules/$modules
    done
    # unused libraries directory:
    comm -23 <(cd ~/libraries/; ls -1) <(ls -dl ~/PR-test-servers/*/library | grep -Po '[0-9a-f]{40}$' | sort -u) | while read library; do
      rm -rf ~/libraries/$library
    done
  fi
fi
