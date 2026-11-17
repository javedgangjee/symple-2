# Each target calls the npm script of the same name. See package.json.

.PHONY: install start stop build test e2e lint format-check check

# Installs the packages and the Chromium browser that the end to end tests use.
install:
	npm install
	npm exec -- playwright install chromium

start:
	npm start

# Ends the dev server that `make start` left running on port 4200.
stop:
	@pids=$$(lsof -ti tcp:4200 -sTCP:LISTEN); \
	if [ -n "$$pids" ]; then kill $$pids && echo "Stopped the server on port 4200."; \
	else echo "Nothing is running on port 4200."; fi

build:
	npm run build

test:
	npm test

e2e:
	npm run e2e

lint:
	npm run lint

format-check:
	npm run format:check

# Runs every check in turn and stops at the first one that fails.
check:
	$(MAKE) lint
	$(MAKE) format-check
	$(MAKE) test
	$(MAKE) e2e
	$(MAKE) build
