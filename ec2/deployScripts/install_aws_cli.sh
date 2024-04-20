#!/bin/bash

sudo yum update -y

sudo yum install -y python3-pip

sudo pip3 install awscli

aws --version