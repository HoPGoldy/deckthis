#!/bin/sh
set -e

mkdir -p ../deckthis-cli/vendor
cp dist/ppt-wrapper.iife.js ../deckthis-cli/vendor/ppt-wrapper.iife.js
cp favicon.svg ../deckthis-cli/vendor/favicon.svg
