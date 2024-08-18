echo "MAKE SURE YOUR HOTSPOT IS ON"

which git  || pkg install nodejs-lts iproute2 git
which node || pkg install nodejs-lts iproute2
which ip   || pkg install nodejs-lts

[ -e virtualtabletop/server.mjs ] || git clone --depth 1 https://github.com/ArnoldSmith86/virtualtabletop

cd virtualtabletop
npm install --omit=dev

ip=$(ip address show dev wlan1 || ip address show dev wlan0 | grep -Po "inet \K[0-9.]+")

echo "WILL USE IP $ip"
echo "ACCESS VIA http://$ip:8272"

sed "s/localhost/$ip/" config.template.json > config.json
node server.mjs
am start http://$ip:8272
