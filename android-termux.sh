# This script is meant to be executed on Android using Termux:
# - Install and open https://termux.dev/ on your Android device.
# - Execute "curl -L is.gd/vttandroid | sh" (without the quotes).

# It should install and start VTT and launch a browser with a room.

# You can use this and your phone wifi hotspot to play games
# with multiple local phones without any Internet connection.

echo
echo "INSTALLING NEEDED PACKAGES"
echo

command -v git  || pkg install -y nodejs-lts iproute2 git
command -v node || pkg install -y nodejs-lts iproute2
command -v ip   || pkg install -y nodejs-lts

echo
echo "DOWNLOADING VTT"
echo

cd
[ -e virtualtabletop/server.mjs ] || git clone --depth 1 https://github.com/ArnoldSmith86/virtualtabletop
cd virtualtabletop

[ -e server.pid ] && kill $(<server.pid)

echo
echo "INSTALLING DEPENDENCIES"
echo

npm install --omit=dev

echo
echo "IF YOU WANT TO USE YOUR WIFI HOTSPOT, ENABLE IT NOW! PRESS ENTER TO CONTINUE."
echo
read a < /dev/tty

ip=$(ip address show dev wlan1 | grep -Po "inet \K[0-9.]+" || ip address show dev wlan0 | grep -Po "inet \K[0-9.]+")

echo "WILL USE IP $ip"
echo "ACCESS VIA http://$ip:8272"

sed "s/localhost/$ip/" config.template.json > config.json
node server.mjs 2>&1 | tee server.log &
echo $! > server.pid

while ! grep Listening server.log; do sleep 2; done
am start http://$ip:8272
