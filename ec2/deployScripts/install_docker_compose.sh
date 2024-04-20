#!/bin/bash

if ! command -v docker-compose &> /dev/null; then
    echo "docker-compose is not installed. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "docker-compose installed at $(which docker-compose)"
else
    echo "docker-compose is already installed at $(which docker-compose)"
fi