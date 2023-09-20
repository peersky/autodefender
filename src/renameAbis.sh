#!/bin/bash
# Rename all *.txt to *.text
for file in ./abis/*.abi; do
    mv -- "$file" "${file%.txt}.json"
done