#!/bin/bash
# Lint automatique après écriture d'un fichier TypeScript/TSX
FILE=$(jq -r '.tool_input.file_path // .tool_input.path // empty' < /dev/stdin)

if [[ -z "$FILE" ]]; then
  exit 0
fi

if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
  cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
  # Lint uniquement si ESLint est installé (après npm install)
  if [ -f "node_modules/.bin/eslint" ]; then
    npx eslint --fix "$FILE" 2>&1 || true
  fi
fi
