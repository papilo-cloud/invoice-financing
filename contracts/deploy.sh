#!/bin/bash

echo "Starting Deployment to Sepolia..."
echo ""

# Load environment variables
source .env

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env"
    exit 1
fi

# Check if RPC URL is set
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "Error: SEPOLIA_RPC_URL not set in .env"
    exit 1
fi

# Compile contracts
echo "Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "Compilation failed"
    exit 1
fi

echo "Compilation successful"
echo ""

# Deploy contracts
echo "Deploying contracts to Sepolia..."
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv

if [ $? -ne 0 ]; then
    echo "Deployment failed"
    exit 1
fi

echo ""
echo "Deployment successful!"
echo ""
