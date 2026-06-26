# 🛡️ Documentation RGPD — Module "Partage de Position GPS Live"

**Date de création** : 2026-06-26
**Module** : Bus Go — Partage de Position GPS Live
**Responsable** : Équipe Dev Bus Go
**Statut** : ✅ Conforme (Privacy by Design)

---

## 1. Résumé Exécutif

Le module "Partage de Position GPS Live" permet aux passagers en retard de partager temporairement leur position GPS avec l'agent du bus. **Aucune donnée de localisation n'est persistée** dans la base de données principale (SQL/NoSQL) ni sur le système de fichiers. Toutes les coordonnées GPS vivent exclusivement en mémoire vive (RAM) du serveur WebSocket, avec destruction automatique après 45 minutes maximum.

Ce document constitue la **preuve d'audit RGPD** exigée par la spécification fonctionnelle.

---

## 2. Architecture de Traitement

### 2.1 Flux de Données

```
┌─────────────┐    gps_update     ┌──────────────────┐    passenger_location    ┌─────────────┐
│  PWA Client │ ─────────────────►│  Socket.io Server │ ────────────────────────►│  PWA Agent  │
│  (passager) │                   │  (RAM only)       │                          │             │
└─────────────┘                   └──────────────────┘                          └─────────────┘
       │                                  │
       │ navigator.geolocation            │ Map<bookingId, TrackingRecord>
       │ watchPosition()                  │ (in-memory, jamais écrit sur disque)
       │                                  │
       └──────────────────────────────────┘
                  TTL: 45 min max
```

### 2.2 Composants Impliqués

| Composant | Fichier | Rôle |
|-----------|---------|------|
| **Client Hook** | `src/hooks/tracking/use-passenger-tracking.ts` | Gère `navigator.geolocation.watchPosition`, envoie `gps_update` |
| **Server Store** | `mini-services/bus-go-socket/tracking-store.ts` | Stocke les coords en `Map<>` en RAM, gère TTL 45min |
| **Server ETA** | `mini-services/bus-go-socket/eta-service.ts` | Calcule ETA via OSRM (cache 25s en RAM) |
| **Server Socket** | `mini-services/bus-go-socket/index.ts` | Orchestre les events `start_tracking`, `gps_update`, `stop_tracking` |
| **Agent Hook** | `src/hooks/tracking/use-agent-tracking.ts` | Reçoit `passenger_location`, maintient un `Map<>` en RAM côté client |
| **Leaflet Map** | `src/components/tracking/leaflet-map.tsx` | Affiche la carte OpenStreetMap (tiles publiques) |

---

## 3. Preuves de Non-Persistance

### 3.1 Côté Serveur (Socket.io)

**Fichier** : `mini-services/bus-go-socket/tracking-store.ts`

```typescript
// Lignes 96-100 — Stockage exclusivement en RAM
const store = new Map<string, TrackingRecord>();              // key: bookingId
const tripIndex = new Map<string, Set<string>>();             // tripId → Set<bookingId>
const auditLog: TrackingAuditEntry[] = [];                   // RGPD audit (meta only)
```

**Aucun appel à** :
- ❌ `prisma.billet.update()` avec coords GPS
- ❌ `fs.writeFile()` ou `fs.appendFile()` avec coords
- ❌ `console.log()` avec coords (uniquement metadata : `bookingId`, `tripId`)
- ❌ `localStorage` server-side
- ❌ Redis / Memcached / autre cache persistant

**Appels Prisma autorisés** :
- ✅ `db.billet.findUnique()` — lecture seule pour valider `bookingId ↔ tripId`
- ✅ Aucun `create` / `update` / `upsert` impliquant des coords

### 3.2 Côté Client (PWA Passager)

**Fichier** : `src/hooks/tracking/use-passenger-tracking.ts`

```typescript
// Lignes 62-67 — State React en RAM uniquement
const [state, setState] = useState<PassengerTrackingState>({
  status: "idle",
  isHighAccuracy: false,
  // ...
});
```

**Aucun appel à** :
- ❌ `localStorage.setItem()` avec coords
- ❌ `sessionStorage.setItem()` avec coords
- ❌ `IndexedDB` put/insert avec coords
- ❌ `document.cookie` avec coords
- ❌ `navigator.sendBeacon()` vers endpoint d'analyse

### 3.3 Côté Agent (PWA Agent)

**Fichier** : `src/hooks/tracking/use-agent-tracking.ts`

```typescript
// Lignes 50-55 — Map en RAM, jamais persistée
const [state, setState] = useState<AgentTrackingState>({
  locations: new Map(),       // ← RAM only
  staticWarnings: [],
  activeCount: 0,
  isConnected: false,
});
```

---

## 4. Mécanismes de Destruction Automatique

### 4.1 TTL Hard Limit (45 min)

**Fichier** : `mini-services/bus-go-socket/tracking-store.ts`, lignes 33-37

```typescript
export const TRACKING_TTL_MS = 45 * 60 * 1000;             // 45 minutes
```

**Sweeper** (lignes 268-285) :

```typescript
export function startTtlSweeper(onExpire: (rec: TrackingRecord) => void): void {
  if (sweeperHandle) return;
  sweeperHandle = setInterval(() => {
    const now = Date.now();
    for (const [bookingId, rec] of store.entries()) {
      if (now >= rec.expiresAt) {
        stopTracking(bookingId, "timeout_45min");
        onExpire(rec);
      }
    }
  }, 60 * 1000); // toutes les minutes
}
```

Le sweeper tourne **toutes les 60 secondes** et détruit tout record expiré. Même en cas de crash client ou de déconnexion réseau, les données disparaissent au plus tard 45 minutes après le début du partage.

### 4.2 Destruction sur Changement de Statut

**Fichier** : `mini-services/bus-go-socket/index.ts`, handler `stop_tracking`

Le tracking est automatiquement arrêté quand :
- ✅ Le passager clique sur "Arrêter le partage" → `reason: "manual"`
- ✅ Le statut du billet passe à `BOARDING` → `reason: "boarding"`
- ✅ Le statut du billet passe à `COMPLETED` → `reason: "completed"`
- ✅ L'agent clique sur "Le bus part" → `reason: "no_show"`
- ✅ Le TTL de 45 min est atteint → `reason: "timeout_45min"`
- ✅ Le passager ferme l'app (cleanup `useEffect`) → `reason: "manual"`

### 4.3 Rejet Silencieux (Trip Déjà Parti)

**Fichier** : `mini-services/bus-go-socket/tracking-store.ts`, fonction `validateBookingTrip`

Si le passager tente de partager sa position alors que `trajet.status === "departed"` ou `"arrived"`, le serveur rejette silencieusement l'update et notifie le passager :

```
"Le bus est déjà parti. Partage arrêté."
```

Aucune coord n'est stockée.

---

## 5. Journal d'Audit (Métadonnées Uniquement)

Le module maintient un audit log **en RAM** contenant uniquement des métadonnées :

```typescript
interface TrackingAuditEntry {
  bookingId: string;
  tripId: string;
  startedAt: number;          // epoch ms
  stoppedAt: number;          // epoch ms
  reason: "manual" | "boarding" | "completed" | "no_show" | "timeout_45min" | "disconnected" | "departed_reject";
  updatesCount: number;
}
```

**Aucune coordonnée GPS** n'est présente dans l'audit log. Le test `audit log stores NO coordinates (RGPD compliance)` dans `mini-services/bus-go-socket/__tests__/tracking.test.ts` le vérifie automatiquement.

L'audit log est plafonné à 1000 entrées (FIFO) pour éviter l'explosion mémoire.

---

## 6. Droits des Personnes (RGPD)

### 6.1 Droit à l'Information

Le passager est informé du partage via :
- Le bouton "📍 Partager ma position live" (label explicite)
- La mention sous le bouton d'arrêt : *"🔒 Aucune donnée de localisation n'est stockée. Partage éphémère, destruction auto à 45 min."*

### 6.2 Droit à l'Effacement

Le passager peut arrêter le partage à tout moment via le bouton "Arrêter le partage". Les données sont immédiatement supprimées de la RAM du serveur (et du client).

### 6.3 Minimisation des Données

- Seules les coords `lat`, `lng`, `accuracy`, `timestamp` sont transmises
- Aucune donnée d'identité (nom, email, téléphone) n'est incluse dans les events GPS
- L'association `bookingId → clientName` se fait uniquement côté agent via la base existante

### 6.4 Limitation de Finalité

Les coords ne servent qu'à :
- Calculer l'ETA du passager vers le quai
- Afficher la position sur la carte Leaflet (côté agent)
- Détecter l'immobilité > 10 min (warning agent)

**Aucun autre usage** (pas d'analytics, pas de heatmaps, pas de revente).

### 6.5 Pas de Profilage

Le module ne participe pas au scoring de fiabilité du passager. Le `reliabilityScore` existant dans `User` n'est jamais modifié par ce module.

---

## 7. Sécurité du Canal WebSocket

### 7.1 Validation Middleware

**Fichier** : `mini-services/bus-go-socket/tracking-store.ts`, fonction `validateBookingTrip`

Avant d'accepter une coord GPS, le serveur vérifie :
1. ✅ Le `bookingId` existe dans la base
2. ✅ Le `bookingId` appartient bien au `tripId` fourni
3. ✅ Le trip n'est pas déjà `departed` ou `arrived`
4. ✅ Le `clientId` de la session correspond au propriétaire du billet

Si une vérification échoue, l'event est rejeté silencieusement.

### 7.2 Canal Nommé

Chaque session de tracking utilise un canal dédié :

```
track_{booking_id}_{trip_id}
```

Le client rejoint ce canal via `socket.join(channel)`. Seuls le passager et les agents du tenant écoutent ce canal.

### 7.3 Isolation Multi-Tenant

Les agents ne reçoivent que les events de leur propre tenant (via `socket.join('tenant:${tenantId}')`). Un agent de la compagnie A ne peut pas voir les positions des passagers de la compagnie B.

---

## 8. Tests Unitaires RGPD

Le fichier `mini-services/bus-go-socket/__tests__/tracking.test.ts` contient des tests explicites :

```typescript
it("audit log stores NO coordinates (RGPD compliance)", () => {
  startTracking("b-rgpd", "t-rgpd", "tenant-rgpd", "u-rgpd");
  updateCoord("b-rgpd", { lat: 48.8566, lng: 2.3522, accuracy: 50, timestamp: Date.now() });
  stopTracking("b-rgpd", "manual");

  const log = getAuditLog();
  const entry = log.find((e) => e.bookingId === "b-rgpd");
  expect(entry).toBeDefined();

  // The audit entry must NOT contain any lat/lng/coord field
  const entryStr = JSON.stringify(entry);
  expect(entryStr).not.toMatch(/"lat"/);
  expect(entryStr).not.toMatch(/"lng"/);
  expect(entryStr).not.toMatch(/"coord"/);
  expect(entryStr).not.toMatch(/"accuracy"/);
});
```

```typescript
it("TTL is exactly 45 minutes", () => {
  expect(TRACKING_TTL_MS).toBe(45 * 60 * 1000);
});
```

---

## 9. Audit de Code — Checklist Pre-Prod

Avant mise en production, vérifier :

- [ ] **Pas de `console.log` avec coords** — vérifier `mini-services/bus-go-socket/index.ts`
- [ ] **Pas de service d'analytics** (Sentry, Datadog, etc.) configuré pour capturer les payloads `gps_update`
- [ ] **Reverse proxy (Caddy/Nginx)** ne logue pas les bodies WebSocket
- [ ] **OSRM** auto-hébergé en prod (Docker) pour éviter de fuiter les coords vers `router.project-osrm.org` (demo publique). En attendant, le fallback Haversine est acceptable.
- [ ] **HTTPS obligatoire** sur le domaine de production (wss://)
- [ ] **CSP** autorise `tile.openstreetmap.org` et `unpkg.com/leaflet` mais pas de domaines tiers
- [ ] **Service Worker** PWA ne cache pas les payloads GPS
- [ ] **Crash reporter** (ex: Sentry) filtré pour ne pas inclure `lat`/`lng` dans les breadcrumbs

---

## 10. Plan de Continuité

En cas de crash du serveur Socket.io :
- ✅ Toutes les coords en RAM sont perdues (c'est le comportement attendu — privacy win)
- ✅ Les passagers devront cliquer à nouveau "Partager ma position" pour reprendre
- ✅ Aucune données n'est à "récupérer" — il n'y a rien à récupérer

En cas de redéploiement :
- ✅ Le nouveau serveur démarre avec un `Map<>` vide
- ✅ Aucun risque de fuite de coords d'une session précédente

---

## 11. Responsabilités

| Rôle | Responsable | Tâche |
|------|-------------|-------|
| Dev Backend | Équipe Bus Go | Maintenir `tracking-store.ts`, `eta-service.ts`, `index.ts` |
| Dev Frontend | Équipe Bus Go | Maintenir hooks + composants Leaflet |
| DevOps | Équipe Bus Go | Auto-héberger OSRM, configurer Caddy/Nginx sans logging bodies |
| DPO | À nommer | Auditer ce module annuellement, vérifier les tests RGPD passent |

---

## 12. Signalement d'Incident

Si une fuite de coords GPS est suspectée :
1. Couper immédiatement le serveur Socket.io (`pm2 stop bus-go-socket`)
2. Vérifier les logs du reverse proxy (Caddy/Nginx) — les bodies WebSocket ne devraient pas être logués
3. Vérifier les crash reporters (Sentry, etc.)
4. Notifier le DPO
5. Mener un audit post-mortem avec revue des tests unitaires

---

## 13. Conclusion

Le module "Partage de Position GPS Live" est conçu **Privacy by Design** :
- ✅ Aucune persistance SQL/NoSQL
- ✅ Aucune persistance filesystem
- ✅ TTL hard limit de 45 minutes
- ✅ Destruction sur changement de statut
- ✅ Audit log sans coords
- ✅ Tests unitaires RGPD
- ✅ Validation middleware (bookingId ↔ tripId)
- ✅ Isolation multi-tenant

**Recommandation** : Auto-héberger OSRM avant la mise en prod pour éviter la fuite vers le service demo publique.

---

*Document à maintenir à jour à chaque évolution du module. Toute modification des fichiers listés en §2.2 doit déclencher une revue de ce document.*
