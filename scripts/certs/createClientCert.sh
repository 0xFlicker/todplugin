#!/bin/bash
sops -d resources/server.enc.key > server.key
sops -d resources/server.enc.crt > server.crt
sops -d resources/rootCA.pem.enc > rootCA.pem

openssl pkcs12 -export -out client.p12 -inkey server.key -in server.crt -certfile rootCA.pem

rm server.key
rm server.crt
rm rootCA.pem
