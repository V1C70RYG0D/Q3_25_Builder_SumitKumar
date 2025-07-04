#!/bin/bash

# Script to push to both repositories
echo "Pushing to V1C70RYG0D/Q3_25_Builder_SumitKumar..."
git push origin main

echo -e "\nPushing to solana-turbin3/Q3_25_Builder_SumitKumar..."
git push solana-turbin3 main

echo -e "\nPush to both repositories completed!"
