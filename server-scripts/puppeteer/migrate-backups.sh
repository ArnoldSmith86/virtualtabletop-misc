#!/bin/bash
set -e
ls -1 ~/PR-test-servers/backups/*xz | grep -Po '[0-9]+' | while read PR; do
    if ! [ -e ~/puppeteer/backups/PR-$PR.tar.xz ]; then
        mkdir -p /tmp/backupTemp
        pushd /tmp/backupTemp
            tar xJf ~/PR-test-servers/backups/$PR.tar.xz
            if [ -e home/*/PR-test-servers/* ]; then
                pushd home/*/PR-test-servers/*
                    tar cJf ~/puppeteer/backups/PR-$PR.tar.xz save/
                popd
            fi
        popd
        rm -rf /tmp/backupTemp
    fi
done

ls -1 ~/PR-test-servers/backups/old/*xz | grep -Po '[0-9]+' | while read PR; do
    if ! [ -e ~/puppeteer/backups/PR-$PR.tar.xz ]; then
        mkdir -p /tmp/backupTemp
        pushd /tmp/backupTemp
            tar xJf ~/PR-test-servers/backups/old/staging-PR-$PR.tar.xz
            if [ -e staging-PR-$PR ]; then
                pushd staging-PR-$PR
                    tar cJf ~/puppeteer/backups/PR-$PR.tar.xz save/
                popd
            fi
        popd
        rm -rf /tmp/backupTemp
    fi
done
