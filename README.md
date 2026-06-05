# World Cup Prediction League

Lokali realios sistemos versija su serveriniu spėjimų užrakinimu, vartotojais, admin panele, taškų perskaičiavimu ir Sportmonks API adapteriu.

## Paleidimas

1. Atsidaryk PowerShell šiame aplanke:

```powershell
cd C:\Users\User\Documents\Codex\2026-06-05\sukurk-moderni-fifa-world-cup-prediction\outputs
```

2. Paleisk serverį:

```powershell
node server.cjs
```

3. Naršyklėje atidaryk:

```text
http://127.0.0.1:4173
```

## Prisijungimai

Admin:

```text
username: admin67
password: admin123
```

Demo vartotojas:

```text
username: marius
password: marius123
```

## Tikri rungtynių laikai ir rezultatai

Tam reikia Sportmonks API rakto.

1. Susikurk Sportmonks paskyrą.
2. Gauk Football API token.
3. Sukurk `.env` arba nustatyk aplinkos kintamąjį `SPORTMONKS_TOKEN`.

Paprastas paleidimas su token:

```powershell
$env:SPORTMONKS_TOKEN="tavo_token"
node server.cjs
```

Tada admin panelėje spausk `Importuoti / atnaujinti iš Sportmonks`.

Serveris taip pat kas 60 sekundžių tikrina `livescores/latest`, jei token yra nustatytas.

## Kaip veikia užrakinimas

Spėjimas užrakinamas serveryje:

```text
rungtynių pradžia UTC - 5 minutės
```

Tai reiškia, kad vartotojas negali apeiti taisyklės pakeisdamas naršyklės laiką.

## Kur saugomi duomenys

Duomenys saugomi:

```text
outputs\data\db.json
```

Čia yra vartotojai, rungtynės, spėjimai, bonusai ir sesijos.

## Vartotojo instrukcija

1. Prisijunk arba prisiregistruok.
2. Eik į `Mano spėjimai`.
3. Įrašyk tikslų rezultatą prie rungtynių.
4. Spėjimą gali keisti tik iki 5 minučių prieš pradžią.
5. Po rungtynių rezultato sistema pati perskaičiuoja taškus.
6. Savo vietą matai `Lyderių lentelė`.

## Admin instrukcija

1. Prisijunk kaip `admin67`.
2. Eik į `Admin panelė`.
3. Gali sukurti arba redaguoti rungtynes.
4. Gali įvesti galutinį rezultatą rankiniu būdu.
5. Gali paleisti Sportmonks importą.
6. Gali perskaičiuoti taškus.
7. Gali eksportuoti CSV.
