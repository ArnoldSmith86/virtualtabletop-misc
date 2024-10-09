#!/bin/bash
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$DIR"

todo=$(rsync -nai --exclude servers --exclude common --exclude save --exclude backups --exclude puppeteer.log ./ vtt:puppeteer/ 2>&1)

if grep -qP 'created directory puppeteer' <<<"$todo"; then
    # for now copy letsencrypt keys manually
    # /etc/default/sslh - needed to update IP address and --ssl to --tls
    echo "First time setup detected. Press ENTER to install prerequisites."
    read
    ssh vtt 'sudo apt update && sudo apt install -y nodejs npm nginx git sslh certbot python3-certbot-nginx rdfind'
    if grep -q vtt-prev ~/.ssh/config && ! ssh vtt grep -q vtt-prev .ssh/config; then
        echo "Generating SSH key pair to access previous server. Press ENTER to continue."
        read
        ssh vtt 'ssh-keygen -t rsa -b 4096 -f .ssh/id_rsa -N ""'
        ssh vtt 'cat .ssh/id_rsa.pub' | ssh vtt-prev 'cat >> .ssh/authorized_keys'
        sed -n '/Host vtt-prev/,/^$/p' ~/.ssh/config | ssh vtt 'cat >> .ssh/config'
        echo "Now do ssh vtt and from there ssh vtt-prev to add the key to the authorized_keys file. Then press ENTER."
        read
    fi
    echo "Copying old puppeteer. Press ENTER to continue."
    read
    ssh vtt <<____EOF
        sed 's/^            //' <<________EOF | rsync -rlptDi --delete --progress --filter=". -" vtt-prev:puppeteer/ puppeteer/
            - /common/engineAssets/*
            - /common/libraries/*
            - /common/modules/*
            - /puppeteer.log
            - /save/PR*
            + /servers/PR*.log
            - /servers/PR*
________EOF
____EOF
fi

grep -qP 'config|\.js'     <<<"$todo" && ssh vtt kill $(ssh vtt ps axf | grep puppeteer/main.js | awk '{ print $1 }') 

rsync -ai --delete --progress --exclude servers --exclude common --exclude save --exclude backups --exclude puppeteer.log ./ vtt:puppeteer/

grep -q  nginx-server.conf <<<"$todo" && ssh vtt "sudo cp puppeteer/nginx-server.conf /etc/nginx/nginx.conf && sudo systemctl restart nginx"
grep -qP 'config|\.js'     <<<"$todo" && ssh vtt 'date >> puppeteer/puppeteer.log ; nohup node puppeteer/main.js >> puppeteer/puppeteer.log 2>&1 &'