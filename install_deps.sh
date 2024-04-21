#!/bin/bash

cd /home/ec2-user

tar -xzvf docker-compose-files.tar.gz

echo "RUNNING install_docker.sh"
source install_docker.sh

echo "RUNNING install_docker_compose.sh"
source install_docker_compose.sh

echo "RUNNING install_aws_cli.sh"
source install_aws_cli.sh

echo "RUNNING kernelsettings.sh"
source kernelsettings.sh

echo "RUNNING mkdirs.sh"
source mkdirs.sh

echo "All dependencies installed."