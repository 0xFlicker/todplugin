#!/bin/bash

sops -d resources/rootCA.key.enc > rootCA.key
sops -d resources/rootCA.pem.enc > rootCA.pem
sops -d v3.sops.ext > v3.ext

openssl req -new -sha256 -nodes -out server.csr -newkey rsa:2048 -keyout server.key -config <( sops --decrypt server.csr.sops.cnf )
openssl x509 -req -in server.csr -CA rootCA.pem -CAkey rootCA.key -CAcreateserial -out server.crt -days 500 -sha256 -extfile v3.ext

sops -e server.key > resources/server.enc.key
sops -e server.crt > resources/server.enc.crt

rm server.key
rm server.crt
rm server.csr
rm rootCA.key
rm rootCA.pem
rm v3.ext
