#!/bin/bash

docker stop telegram-mono-report-bot || true
docker rm telegram-mono-report-bot || true

git pull origin master

docker build -t telegram-mono-report-bot .

docker run -d --name telegram-mono-report-bot -v $(pwd)/data:/usr/src/app/data telegram-mono-report-bot