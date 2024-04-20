#/bin/bash

# Install Docker
sudo yum install -y yum-utils

sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configure Docker
sudo systemctl start docker

# create docker group if not already created
if ! getent group "docker" >/dev/null; then
    echo "creating docker group"
    sudo groupadd docker
fi

# add user to docker group if not already
if ! groups "$USER" | grep -q "\bdocker\b"; then
    echo "Adding $USER to docker group"
    sudo usermod -aG docker $USER
fi

# Enable docker on boot
sudo systemctl enable docker.service
sudo systemctl enable containerd.service
