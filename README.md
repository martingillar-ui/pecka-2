# Výprava na Pecku

Rytířská hra na cestu z Borovničky na hrad Pecka (7,5 km, 12 výzev).
Každé dítě má vlastního rytíře s PINem. Výzvy se otevírají podle GPS,
sbírají se body a odznaky a všichni vidí živou Síň slávy.

## Nasazení na Railway (asi 15 minut)

1. **GitHub:** založte nový repozitář a nahrajte do něj obsah této složky.
   Na webu GitHubu jde soubory jen přetáhnout.
2. **Railway:** New Project → Deploy from GitHub repo → vyberte repozitář.
   Railway pozná Node.js a samo spustí `npm start`.
3. **Úložiště:** v projektu přidejte Volume a připojte ho na cestu `/data`.
   Bez něj se body při každém novém nasazení smažou.
4. **Proměnné (Variables):**
   - `DATA_DIR` = `/data`
   - `ADMIN_PIN` = váš kód správce (4–6 číslic). Ve hře se pak objeví
     „Správa rytířů“ se zapomenutými PINy a mazáním testovacích hráčů.
   - `MAPY_API_KEY` (nepovinné) = klíč z developer.mapy.com. S ním hra
     ukazuje turistickou mapu Mapy.com se značenými trasami, bez něj
     OpenStreetMap. Klíč v jeho nastavení omezte na doménu hry.
5. **Doména:** Settings → Networking → Generate Domain. Tenhle odkaz
   (https://…railway.app) pošlete dospělým nebo z něj udělejte QR kód.

GPS funguje jen přes https, což doména z Railway splňuje.

## Před výletem

- Založte testovacího rytíře, vyzkoušejte přihlášení a jednu výzvu
  otevřete ručně („GPS zlobí? Otevřít ručně“). Pak ho ve Správě smažte.
- Při prvním otevření musí každý telefon povolit polohu.
- Mapa potřebuje signál. Když vypadne, hra body podrží v telefonu
  a odešle je, jakmile se spojení vrátí.

## Úpravy

- Výzvy, souřadnice a poloměry odemčení jsou na začátku skriptu
  v `index.html` (pole `STATIONS`). Souřadnice jsou z plánu trasy
  na Mapy.com. Zastávky dopočítané mezi body trasy mají větší poloměr (120 m).
- Lokální spuštění: `npm install`, `npm start`, pak http://localhost:3000
