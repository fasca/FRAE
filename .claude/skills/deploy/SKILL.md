---
name: deploy
description: Orchestre le déploiement de FRAE. Utiliser quand l'utilisateur dit "déploie", "mise en prod", "release", "deploy", ou invoque /deploy.
allowed-tools: Read, Bash, Grep
---

# Deploy Playbook — AE Flight Radar

## Pré-déploiement (toutes les étapes sont obligatoires)

- [ ] `npm run type-check` passe (zéro erreur TypeScript)
- [ ] `npm run lint` passe (zéro erreur ESLint)
- [ ] `npm run test` passe (zéro test en échec)
- [ ] `npm run build` réussit (build Next.js production sans erreur)
- [ ] Vérifier que l'API OpenSky est accessible : `curl -s https://opensky-network.org/api/states/all?lamin=48&lomin=2&lamax=49&lomax=3 | jq .time`
- [ ] Vérifier les variables d'environnement (si ajoutées ultérieurement)

## Étapes de déploiement

1. `npm run build` — génère le build de production dans `.next/`
2. Déployer selon la plateforme :
   - **Vercel** : `vercel deploy --prod` (ou push sur main avec intégration)
   - **Self-hosted** : `npm run start` (démarre le serveur Next.js)
   - **Docker** : `docker build -t frae . && docker push registry/frae`
3. Vérifier les logs post-déploiement (pas d'erreurs 500 au démarrage)
4. Smoke test : ouvrir l'application et vérifier que le canvas se charge

## Post-déploiement

- Vérifier que les vols s'affichent (OpenSky polling actif)
- Vérifier la projection azimutale (pas de distorsion anormale)
- Vérifier les performances dans le navigateur (DevTools > Performance > FPS)
- Tagger la version : `git tag v[X.Y.Z] && git push --tags`
- Mettre à jour `tasks/todo.md`

## Rollback

```bash
# Vercel : revenir à la dernière déployée stable
vercel rollback

# Self-hosted : revenir au commit précédent
git revert HEAD
npm run build && npm run start
```

## Notes FRAE

- L'API OpenSky est appelée côté browser (CORS supporté) — pas de proxy nécessaire
- Le build Next.js est purement statique/CSR pour la partie canvas (pas de SSR pour les données temps réel)
- Si OpenSky est down au démarrage, le fallback sur les vols simulés doit s'activer automatiquement
