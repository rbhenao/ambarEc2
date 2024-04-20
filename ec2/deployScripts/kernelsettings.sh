#!/bin/bash

# set the kernel settings recommended by the Ambar documentation:
# https://web.archive.org/web/20211123093146/https://ambar.cloud/docs/installation


set -x # Activate trace mode to print each command ran

sudo sysctl -w vm.max_map_count=262144
sudo sysctl -w net.ipv4.ip_local_port_range="15000 61000"
sudo sysctl -w net.ipv4.tcp_fin_timeout=30
sudo sysctl -w net.core.somaxconn=1024
sudo sysctl -w net.core.netdev_max_backlog=2000
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=2048
sudo sysctl -w vm.overcommit_memory=1

set +x # Turn off trace mode

echo "All kernel settings set!"
