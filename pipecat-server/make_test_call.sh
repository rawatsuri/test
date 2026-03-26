#!/bin/bash
cd /Users/jayyy/Desktop/Project/test/pipecat-server
echo "Enter your phone number (e.g. +919053916964):"
read phone
echo "Which agent? (1 for Doctor, 2 for Hotel):"
read agent

if [ "$agent" = "1" ]; then
    ./.venv/bin/python3 make_doctor_call.py $phone
else
    ./.venv/bin/python3 make_hotel_call.py $phone
fi
