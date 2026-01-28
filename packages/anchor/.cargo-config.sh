#!/bin/bash
# * Temporary cargo config to bypass cursor proxy
export PATH="/home/digitaldrreamer/.cargo/bin:$PATH"
exec "$@"
