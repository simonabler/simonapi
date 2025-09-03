#!/bin/sh

ENV_FILE=".env.$NODE_ENV"

set -o allexport
. ./$ENV_FILE
set +o allexport

## check for pending migrations
#node_modules/.bin/ts-node -P ./tsconfig.typeorm.json node_modules/.bin/typeorm -d app/module/database/config/datasource.ts migration:run

node main.js
