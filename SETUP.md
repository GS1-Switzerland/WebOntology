# Setup-Anleitung: `gs1-ontology-explorer`

Diese Anleitung bringt das SPA-Repo von "entpacktem ZIP" zu "läuft live auf
Azure Static Web Apps mit eigener Domain". Sie geht davon aus, dass das
Definitions-Repo (`GS1-Switzerland/WebOntology`, GitHub Pages) separat
existiert und gepflegt wird — dort landet nichts aus diesem Paket außer
den beiden Registry-Dateien in Schritt 2.

---

## 0. Voraussetzungen

- Ein GitHub-Account mit Rechten, ein neues Repo `gs1-ontology-explorer`
  anzulegen (privat oder öffentlich, beides funktioniert)
- Ein Azure-Account/-Subscription mit Rechten, Ressourcen anzulegen
- Node.js 20+ lokal installiert (`node -v` prüfen)
- Optional, aber empfohlen: [GitHub CLI](https://cli.github.com/) (`gh`)
  und [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`)

---

## 1. Repo lokal einrichten und auf GitHub pushen

```bash
# ZIP entpacken, dann hinein
cd gs1-ontology-explorer

git init
git add .
git commit -m "Initial import: GS1 Ontology & Vocabulary Explorer SPA"

# Repo auf GitHub anlegen (Beispiel mit gh CLI):
gh repo create <dein-github-org>/gs1-ontology-explorer --private --source=. --remote=origin

# ...oder manuell: auf github.com ein leeres Repo anlegen, dann:
git remote add origin https://github.com/<dein-github-org>/gs1-ontology-explorer.git
git branch -M main
git push -u origin main
```

**Prüfen, dass alles lokal funktioniert, bevor es weitergeht:**

```bash
npm install
npm run build     # muss ohne Fehler durchlaufen
npm run test      # 7 Tests, alle grün
npm run dev        # http://localhost:5173 — Registry lädt mit den
                    # sample-*.json-Dateien aus public/, sofern .env.local
                    # noch nicht auf das echte Definitions-Repo zeigt
```

---

## 2. Definitions-Repo vorbereiten (einmalig, im *anderen* Repo)

`registry/manifest.jsonld` wird jetzt automatisch bei jedem
`promote-to-prod`-Lauf erzeugt — siehe
[`scripts/PROMOTE_TO_PROD.md`](./scripts/PROMOTE_TO_PROD.md) für den
exakten Patch gegen euren echten Workflow. Manuell bleibt nur:

| Datei | Vorlage in diesem Paket | Zweck |
|---|---|---|
| `registry/sectors.jsonld` | `public/sample-sectors.json` + `sectors.schema.json` | GS1-Sektoren-Codeliste (ändert sich selten, daher weiterhin handgepflegt) |
| `registry/domains.jsonld` | `public/sample-domains.json` + `domains.schema.json` | GS1-Domain-Codeliste — Anzeigenamen pro Domain-Slug, analog zu `sectors.jsonld` |

Kopiere `public/sample-sectors.json` bzw. `public/sample-domains.json` als
Startpunkt in das Definitions-Repo unter `registry/sectors.jsonld` bzw.
`registry/domains.jsonld`, committen, pushen. Das genügt — kein
Code-Deploy nötig, die SPA liest das live beim nächsten Seitenaufruf.

Kopiere idealerweise auch `sectors.schema.json` und `domains.schema.json`
mit ins Definitions-Repo (jeweils neben die zugehörige `.jsonld`-Datei)
und referenziere sie per `"$schema"`.
Dann bekommen Redakteur:innen dort Validierung/Autocomplete beim
Bearbeiten — diese Dateien werden von der SPA selbst nicht ausgeliefert, sie
sind reine Vertragsdokumentation. `manifest.schema.json` gehört ebenso mit
ins Definitions-Repo, direkt neben das automatisch generierte
`registry/manifest.jsonld` — siehe `scripts/PROMOTE_TO_PROD.md`, Schritt 1.

**Hinweis zu `domains.jsonld`:** Die SPA akzeptiert sowohl ein nacktes
Array (wie `sectors.jsonld`) als auch ein Objekt mit dem Array unter
`"domains"` oder `"sectors"` — letzteres deckt eine bereits real
existierende, per Hand erstellte Datei ab, die aus `sectors.jsonld`
kopiert wurde und deshalb noch den Schlüssel `"sectors"` trägt, obwohl die
Einträge `Gs1Domain` sind. Beides funktioniert unverändert; für neue
Dateien ist `"domains"` als Schlüsselname empfehlenswert, aber nicht
erforderlich.

### 2a. `url` vs. `source` — welche URL kommt wohin?

Jedes Artefakt im Manifest hat zwei URL-Felder, die unterschiedliche
Dinge bedeuten:

| Feld | Beispiel | Zweck |
|---|---|---|
| `url` | `https://gs1-epcis-reg.org/rail/voc/data/gs1RailVoc.jsonld` | **Öffentlicher, stabiler Identifier.** Das ist die URL, die in `@context`/`@id` anderer Dateien referenziert wird, die in der UI angezeigt/verlinkt wird, und auf die Linked-Data-Clients per Content Negotiation umgeleitet werden. |
| `source` | `https://gs1-switzerland.github.io/WebOntology/current/sectors/tran/rail/vocabularies/gs1RailVoc.jsonld` | **Physischer Speicherort**, von dem die SPA und die Resolver-Function die tatsächlichen Bytes holen. |

Warum getrennt: `url` ist die "Cool URI" — die Identität der Ressource,
die sich nie ändern soll, egal wie ihr das Repo intern organisiert.
`source` ist ein Implementierungsdetail (aktuell GitHub Pages), das sich
ändern darf, ohne dass irgendeine externe Referenz bricht. Die
Resolver-Function (`api/src/functions/resolve.js`) matched eingehende
Requests gegen jedes `artifact.url` im Manifest und leitet per 303 auf
`artifact.source` um — das funktioniert für beliebige Pfade, nicht nur
für das `/domain/term`-Muster, und **ohne dass die Pfadstruktur auf
`gs1-epcis-reg.org` real irgendwo existieren muss.**

Kurz: **Für `url` immer die `gs1-epcis-reg.org`-Adresse eintragen** (so
wie im Brief mit `https://gs1-epcis-reg.org/rail/rail-context.jsonld`
vorgegeben), **für `source` die tatsächliche GitHub-Pages-Adresse.**

---

## 3. Azure Static Web App anlegen

**Option A — Azure Portal (empfohlen für den ersten Durchlauf):**

1. portal.azure.com → *Create a resource* → **Static Web App**
2. Plan: **Standard** (Functions-Backend für `api/` wird benötigt — im
   Free-Plan nicht verfügbar)
3. *Deployment details* → **GitHub** → beim `gs1-ontology-explorer`-Repo
   anmelden/auswählen, Branch `main`
4. *Build details*:
   - Build Preset: **Custom**
   - App location: `/`
   - Api location: `api`
   - Output location: `dist`
5. *Review + create* → **Create**

Azure legt dabei automatisch einen GitHub-Actions-Workflow im Repo an
und ein Secret `AZURE_STATIC_WEB_APPS_API_TOKEN_<random>`. Ersetze diesen
generierten Workflow durch `.github/workflows/azure-static-web-apps.yml`
aus diesem Paket (er ist bereits korrekt konfiguriert), oder gleiche die
Build-Parameter ab, falls du den generierten behalten willst — und
benenne das Secret in `AZURE_STATIC_WEB_APPS_API_TOKEN` um bzw. passe den
Secret-Namen im Workflow an.

**Option B — Azure CLI:**

```bash
az login

az group create --name rg-gs1-registry --location westeurope

az staticwebapp create \
  --name gs1-ontology-explorer \
  --resource-group rg-gs1-registry \
  --source https://github.com/<dein-github-org>/gs1-ontology-explorer \
  --location westeurope \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist" \
  --sku Standard \
  --login-with-github
```

`--login-with-github` öffnet einen Browser-Login und richtet den
Workflow/das Deploy-Token automatisch ein.

---

## 4. Konfiguration setzen

**a) Azure Static Web App → Configuration (Application settings)**
— das sind die Laufzeit-Variablen der `api`-Function:

| Name | Wert |
|---|---|
| `DEFINITIONS_BASE_URL` | `https://gs1-switzerland.github.io/WebOntology` |
| `MANIFEST_PATH` | `registry/manifest.jsonld` |

**b) GitHub Repo → Settings → Secrets and variables → Actions**

*Secrets* (falls nicht automatisch von Azure angelegt):
- `AZURE_STATIC_WEB_APPS_API_TOKEN` — aus der Static Web App im Portal
  (*Overview* → *Manage deployment token*)

*Variables* (für den Build, siehe `VITE_*` in `vite.config.ts`/`env.ts`):
- `DEFINITIONS_BASE_URL` = `https://gs1-switzerland.github.io/WebOntology`
- `MANIFEST_PATH` = `registry/manifest.jsonld`

Danach: irgendeinen Commit pushen (oder den letzten Workflow-Run manuell
erneut auslösen) → GitHub Actions baut und deployt automatisch.

---

## 5. Eigene Domain (optional, aber im Brief vorausgesetzt)

Damit die Resolver-URLs wie `https://gs1-epcis-reg.org/rail/my_term`
funktionieren, muss diese Domain auf die Static Web App zeigen:

1. Azure Portal → Static Web App → **Custom domains** → **Add**
2. Domain eingeben (`gs1-epcis-reg.org`), Azure zeigt dir die nötigen
   DNS-Einträge (i.d.R. ein `CNAME` bzw. `TXT` zur Validierung, bei
   Apex-Domains ein `ALIAS`/`ANAME` je nach DNS-Provider)
3. Diese Einträge beim DNS-Provider der Domain setzen
4. Warten, bis Azure die Validierung + das automatische TLS-Zertifikat
   abgeschlossen hat (kann bis zu ~24h dauern, meist deutlich schneller)

Content Negotiation und 303-Redirects funktionieren auf der eigenen
Domain identisch — die Resolver-Function liest den `Host`-Header aus dem
Request und nimmt nichts über den `*.azurestaticapps.net`-Hostnamen an.

---

## 6. Verifizieren

```bash
# HTML-Ansicht (Browser-Fall):
curl -sI -H "Accept: text/html" https://gs1-epcis-reg.org/rail/geo
# -> 200, Content-Type: text/html

# Linked-Data-Fall (Term-Auflösung):
curl -sI -H "Accept: application/ld+json" https://gs1-epcis-reg.org/rail/geo
# -> 303, Location: https://…/gs1RailVoc.jsonld#geo

# Direkter Artefakt-Pfad (die "url" aus dem Manifest):
curl -sI https://gs1-epcis-reg.org/rail/voc/data/gs1RailVoc.jsonld
# -> 303, Location: https://gs1-switzerland.github.io/WebOntology/rail/voc/data/gs1RailVoc.jsonld
```

Und im Browser: Startseite lädt die Sektoren-Kacheln (aus
`registry/sectors.jsonld`), Klick auf einen Sektor mit Domains zeigt die
Domain(s), Klick auf eine Domain zeigt Artefakte + Terme aus dem
zugehörigen Vokabular.

---

## 7. Laufender Betrieb

- **Neue Domain/Vokabular hinzufügen:** nur `registry/manifest.jsonld` im
  Definitions-Repo erweitern — kein SPA-Deploy nötig.
- **Neuer/geänderter Sektor:** nur `registry/sectors.jsonld` im
  Definitions-Repo ändern — kein SPA-Deploy nötig.
- **Neuer/geänderter Domain-Anzeigename:** nur `registry/domains.jsonld` im
  Definitions-Repo ändern — kein SPA-Deploy nötig.
- **SPA-Feature-Änderung:** normaler `git push` auf `main` im
  `gs1-ontology-explorer`-Repo → GitHub Actions baut & deployt automatisch.
- **Staging-Vorschau:** jeder Pull Request gegen `main` bekommt via des
  mitgelieferten Workflows automatisch eine eigene Preview-Umgebung von
  Azure Static Web Apps (Kommentar mit der URL erscheint im PR).
