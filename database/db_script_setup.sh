#!/usr/bin/env bash

# load .env
export $(grep -v '^\s*#' ../.env | xargs)

# export db password to avoid password prompt
export PGPASSWORD=$POSTGRES_PASSWORD
