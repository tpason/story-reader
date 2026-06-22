# Run from story_reader/ — delegates to repo root scripts where needed.
ROOT := ..

.PHONY: reader-vapid vapid reader-dev reader-verify reader-smoke test-unit

reader-vapid vapid:
	bash $(ROOT)/docker/scripts/generate-vapid-keys.sh

reader-dev:
	$(MAKE) -C $(ROOT) reader-dev

reader-verify:
	$(MAKE) -C $(ROOT) reader-verify

reader-smoke:
	$(MAKE) -C $(ROOT) reader-smoke

test-unit:
	npm run test:unit
