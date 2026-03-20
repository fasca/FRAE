# ADR 002 — Next.js 16.2.0 au lieu de 14

## Statut
Accepté

## Contexte
Le plan initial ciblait "Next.js 14+". Lors du scaffolding, `npx create-next-app@latest` a installé la version 16.2.0 (dernière stable).

## Décision
Conserver Next.js 16.2.0. La spec "14+" signifie "au minimum 14", et 16.2.0 satisfait cette contrainte. Utiliser la dernière version stable évite une migration future et bénéficie des dernières optimisations du compilateur et du Turbopack.

## Conséquences
- Les APIs App Router restent compatibles (pas de breaking change entre 14 et 16 pour nos patterns).
- L'import `@` alias, Tailwind CSS 4, TypeScript strict : tous fonctionnels.
- Surveiller les Release Notes entre 14 et 16 si un comportement inattendu apparaît.
