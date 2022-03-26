#!/bin/bash

rm -rf out
mkdir -p out

sops -d resources/rootCA.pem.enc > out/rootCA.crt
sops -d resources/server.enc.key > out/server.key
sops -d resources/server.enc.crt > out/server.crt

cat out/rootCA.crt out/server.crt out/server.key > out/server.pem
openssl pkcs12 -export -in out/server.pem -out out/oddie.pkcs12 -name oddie -noiter -nomaciter

mv out/oddie.pkcs12 ../../todplugin/keystore.pkcs12
mv out/rootCA.crt ../../todweb3/certs/rootCA.crt

rm -rf out
