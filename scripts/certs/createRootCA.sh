#!/bin/bash


openssl genrsa -des3 -out rootCA.key 2048
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1024 -out rootCA.pem

mkdir -p resources

sops -e rootCA.key > resources/rootCA.key.enc
rm rootCA.key
sops -e rootCA.pem > resources/rootCA.pem.enc
rm rootCA.pem
