#!/bin/bash

# Authenticate Docker with ECR
echo "Logging in to ECR"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "Building and pushing"

# Tag and push images for each service in docker-compose.yml
services=(db es rabbit redis serviceapi webapi frontend pipeline0 crawler0)
for service in "${services[@]}"
do
    docker-compose build $service
    docker tag ambarec2-$service:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ambarec2-$service:latest
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ambarec2-$service:latest
done