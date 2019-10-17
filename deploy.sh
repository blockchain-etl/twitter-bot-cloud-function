#!/usr/bin/env bash

config_file=${1}
if [ -z "${config_file}" ]; then
    config_file=config.sh
fi

# Read config
echo "Configuration file:"
cat $config_file
. $config_file

gcp_project=$(gcloud config get-value project)

gcloud beta functions deploy ${FUNCTION_NAME} \
--project ${gcp_project} \
--entry-point subscribe \
--runtime ${FUNCTION_RUNTIME} \
--trigger-topic ${FUNCTION_TRIGGER_TOPIC} \
--set-env-vars APP_KEY=${APP_KEY},\
APP_SECRET=${APP_SECRET},\
TOKEN=${TOKEN},\
TOKEN_SECRET=${TOKEN_SECRET}
