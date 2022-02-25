#!/bin/bash
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

bash "$DIR/close-pull-request.sh" $1 update
bash "$DIR/new-pull-request.sh" $1
