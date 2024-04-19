#!/bin/bash

mkdir -p /home/ec2-user/deploy
cd /home/ec2-user/deploy
source .env

# Create directories needed by app
mkdir -p ${dataPath}

# Authenticate Docker with ECR
echo "Logging in to ECR"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Pull ECR images and run containers using production compose file
echo "Pulling ECR images and deploying containers"
docker-compose -f docker-compose-production.yml pull
docker-compose -f docker-compose-production.yml up -d

echo "Deployment complete"