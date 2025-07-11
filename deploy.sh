#!/bin/bash

docker stop telegram-mono-report-bot || true

git pull origin master

docker build -t telegram-mono-report-bot .

docker run -d -v $(pwd)/data:/usr/src/app/data telegram-mono-report-bot