#!/bin/bash
# Vérifie type-check et lint quand Claude finit sa réponse
# S'exécute uniquement si le projet Next.js est initialisé (node_modules présent)
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

if [ ! -d "node_modules" ]; then
  exit 0
fi

ERRORS=""

# Vérification TypeScript
TYPE_OUT=$(npm run type-check 2>&1)
if [ $? -ne 0 ]; then
  ERRORS="$ERRORS\n⚠️ TypeScript: des erreurs de type existent. Corriger avant de déclarer terminé.\n$TYPE_OUT"
fi

# Vérification ESLint
LINT_OUT=$(npm run lint 2>&1)
if [ $? -ne 0 ]; then
  ERRORS="$ERRORS\n⚠️ ESLint: des erreurs de lint existent. Corriger avant de déclarer terminé.\n$LINT_OUT"
fi

if [ -n "$ERRORS" ]; then
  echo "{\"hookSpecificOutput\": {\"additionalContext\": \"$ERRORS\"}}"
fi
