# Paleidimas per Netlify + Supabase

Šita versija yra skirta realiam naudojimui:

- vartotojai registruojasi ir prisijungia;
- spėjimai saugomi Supabase duomenų bazėje;
- vienas vartotojas gali turėti tik vieną spėjimą vienoms rungtynėms;
- spėjimai užsirakina serveryje 5 minutes prieš rungtynes;
- adminas `admin67`;
- Sportmonks importuoja tikrus World Cup 2026 laikus ir rezultatus;
- Netlify Scheduled Function kas 5 minutes tikrina live atnaujinimus.

## Svarbu apie Netlify

Jei naudotume tik paprastą HTML puslapį, užtektų drag-and-drop į Netlify.

Bet šitai sistemai reikia Netlify Functions, nes be jų neveiktų prisijungimas, slaptažodžiai, Supabase, Sportmonks ir serverinis užrakinimas.

Todėl rekomenduojamas būdas:

```text
GitHub repo -> Netlify deploy
```

Netlify dokumentacijoje funkcijos diegiamos kartu su projektu per build/deploy procesą, o Scheduled Functions turi cron grafiką.

## 1. Supabase lentelės

1. Atsidaryk savo Supabase projektą.
2. Kairėje pasirink `SQL Editor`.
3. Spausk `New query`.
4. Atidaryk failą:

```text
supabase-schema.sql
```

5. Nukopijuok visą turinį.
6. Įklijuok į Supabase SQL langą.
7. Spausk `Run`.

Po šito Supabase sukurs lenteles ir admin vartotoją.

Admin prisijungimas:

```text
username: admin67
password: admin123
```

## 2. Supabase raktai

Supabase projekte:

1. Kairėje apačioje spausk `Project Settings`.
2. Eik į `API`.
3. Nukopijuok:

```text
Project URL
service_role key
```

`service_role key` yra slaptas. Jo niekam nerodyk ir nedėk į frontend failus.

## 3. Sportmonks token

Tu jau turi Sportmonks token.

Jo nedėk į kodą. Jį įrašysi Netlify Environment variables.

Jeigu neramu, kad token buvo įklijuotas į pokalbį, Sportmonks paskyroje gali susigeneruoti naują token ir naudoti naują.

## 4. Failų įkėlimas į GitHub

Paprasčiausias kelias be programavimo:

1. Susikurk GitHub paskyrą, jei jos neturi.
2. Spausk `New repository`.
3. Pavadink, pvz.:

```text
world-cup-prediction-league
```

4. Į repo įkelk visus failus iš šio aplanko:

```text
C:\Users\User\Documents\Codex\2026-06-05\sukurk-moderni-fifa-world-cup-prediction\outputs
```

Svarbu: kelk `outputs` aplanko VIDŲ, ne patį `outputs` aplanką.

Repo viršuje turi matytis:

```text
index.html
app.js
styles.css
netlify.toml
supabase-schema.sql
netlify/
```

## 5. Netlify prijungimas

1. Atsidaryk Netlify.
2. Spausk `Add new site`.
3. Rinkis `Import an existing project`.
4. Pasirink GitHub.
5. Pasirink repo `world-cup-prediction-league`.
6. Build settings palik paprastai:

```text
Build command: palik tuščią
Publish directory: .
Functions directory: netlify/functions
```

Jei Netlify pats perskaito `netlify.toml`, šių laukų gali net nereikėti keisti.

## 6. Netlify Environment variables

Netlify projekte:

1. Eik į `Site configuration`.
2. Eik į `Environment variables`.
3. Pridėk šiuos kintamuosius:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SPORTMONKS_TOKEN
SPORTMONKS_WORLD_CUP_LEAGUE_ID
```

Reikšmės:

```text
SUPABASE_URL = tavo Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY = tavo Supabase service_role key
SPORTMONKS_TOKEN = tavo Sportmonks token
SPORTMONKS_WORLD_CUP_LEAGUE_ID = 732
```

## 7. Deploy

1. Netlify spausk `Deploy`.
2. Po deploy atsidaryk Netlify duotą adresą.
3. Prisijunk:

```text
admin67
admin123
```

4. Eik į `Admin panelė`.
5. Spausk:

```text
Importuoti / atnaujinti iš Sportmonks
```

Jei token ir Supabase raktai teisingi, rungtynės bus importuotos.

## 8. Kaip naudosis draugai

1. Atidaro tavo Netlify svetainės adresą.
2. Spaudžia `Registruotis`.
3. Susikuria username ir password.
4. Eina į `Mano spėjimai`.
5. Įrašo rezultatus.
6. Sistema pati užrakina spėjimus 5 minutes prieš rungtynes.
7. Sistema pati skaičiuoja taškus, kai yra rezultatai.

## 9. Ką daryti, jei kažkas neveikia

Jei prisijungiant rodo klaidą apie `SUPABASE_URL` arba `SUPABASE_SERVICE_ROLE_KEY`, reiškia Netlify environment variables įvestos neteisingai arba po jų įvedimo nepadarytas naujas deploy.

Jei Sportmonks importas neveikia, dažniausios priežastys:

- neteisingas `SPORTMONKS_TOKEN`;
- Sportmonks plane nėra World Cup 2026 duomenų;
- Sportmonks dar negrąžina pilno tvarkaraščio per pasirinktą endpointą.

Tokiu atveju admin panelėje vis tiek gali sukurti rungtynes rankiniu būdu.
