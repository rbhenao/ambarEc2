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
    image_uri="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ambarec2-$service:latest"
    docker tag ambarec2-$service:latest $image_uri
    docker push $image_uri
    echo "ambarEc2_$service=$image_uri" >> .env
done

echo "AWS_REGION=$AWS_REGION" >> .env
echo "AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID" >> .env

echo "Build complete"