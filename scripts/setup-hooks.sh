#!/bin/sh
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
echo "Hooks activados (.githooks)"
