#!/bin/bash

while inotifywait -e modify,create,delete,move *; do
    ./deploy.sh
done