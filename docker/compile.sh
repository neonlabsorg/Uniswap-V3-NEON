#!/bin/sh

COUNT=10
DIR="artifacts"

cd /usr/src/app

for i in $(seq $COUNT)
do
  echo "Attempt number" $i
  npm run compile

  if [ -d "$DIR" ]; then
    echo "Artifacts compiled"
    break
  fi
done

if [ ! -d "$DIR" ]; then
   echo "Can't compile artifacts"
   exit 1
fi