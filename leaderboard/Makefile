.PHONY: build-RuntimeDependenciesLayer build-lambda-common
.PHONY: build-PotatoIngestion
.PHONY: build-LeaderboardFunction
.PHONY: build-IngestFunction

build-PotatoIngestion:
	$(MAKE) build-lambda-common

build-LeaderboardFunction:
	$(MAKE) build-lambda-common

build-IngestFunction:
	$(MAKE) build-lambda-common

build-lambda-common:
	rm -rf lib
	yarn build
	cp -r lib "$(ARTIFACTS_DIR)/"

build-RuntimeDependenciesLayer:
	mkdir -p "$(ARTIFACTS_DIR)/nodejs"
	cp package.json yarn.lock "$(ARTIFACTS_DIR)/nodejs/"
	yarn --production --cwd "$(ARTIFACTS_DIR)/nodejs/"
	rm "$(ARTIFACTS_DIR)/nodejs/package.json" # to avoid rebuilding when changes doesn't relate to dependencies
