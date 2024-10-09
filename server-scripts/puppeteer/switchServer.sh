#!/bin/bash


if [ "$1" == SET ]; then
    # UPDATE BACKUPS (at least host key identity)
    # REMEMBER TO UPDATE playingcards.letz.dev on https://freedns.afraid.org/ (arnoldsmith86)

    ssh vtt 'kill $(<puppeteer/servers/MAIN/server.pid)'
    ssh vtt-prev <<____EOF
        systemctl stop virtualtabletop
        sed -i 's/127.0.0.1/62.72.36.31/' /etc/nginx/nginx.conf        
____EOF
    sleep 1
fi

ssh vtt <<EOF
    rsync -rlptDi --delete --progress --exclude '/*.trace' --exclude '/assets' --exclude '/errors' virtualtabletop.io:virtualtabletop/save/ puppeteer/save/MAIN/
    rsync -rlptDi --progress virtualtabletop.io:virtualtabletop/save/assets/ puppeteer/common/assets/

    #rsync -rlptDi --delete --progress vtt-prev:puppeteer/backups/ puppeteer/backups/
    #rsync -rlptDi --progress vtt-prev:puppeteer/common/assets/ puppeteer/common/assets/
EOF

if [ "$1" == SET ]; then
    ssh vtt-prev systemctl restart nginx
fi
