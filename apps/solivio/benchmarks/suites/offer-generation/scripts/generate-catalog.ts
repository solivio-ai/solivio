// Deterministic generator for benchmarks/cases/catalog.json.
//
//   yarn tsx benchmarks/scripts/generate-catalog.ts
//
// Emits parametric product families so the catalog is full of near-variants
// (same product, one differing parameter: amperage, cross-section, diameter,
// color temperature, pole count...). That is what makes matching hard and the
// benchmark meaningful. Output is fully deterministic — same input, same file.
//
// IMPORTANT: never add coax cable (RG6/RG59) — case 03 expects it unmatched.

import { writeFileSync } from "node:fs";
import path from "node:path";

type Product = { sku: string; name: string; description: string };

const products: Product[] = [];
const add = (sku: string, name: string, description: string) => {
  products.push({ sku, name, description });
};

// Encode decimal params into SKU fragments: 1.5 → "15", 0.75 → "075".
const enc = (n: number) => String(n).replace(".", "");

// ── Aparatura modułowa ─────────────────────────────────────────────────────────

for (const char of ["B", "C", "D"] as const) {
  for (const amps of [6, 10, 13, 16, 20, 25, 32, 40]) {
    for (const poles of [1, 3]) {
      add(
        `WYL-${char}${amps}-${poles}P`,
        `Wyłącznik nadprądowy ${char}${amps} ${poles}P`,
        `Wyłącznik nadmiarowo-prądowy, charakterystyka ${char}, prąd znamionowy ${amps}A, ${poles}-biegunowy, zdolność zwarciowa 6kA, montaż na szynie DIN TH35.`,
      );
    }
  }
}

for (const amps of [25, 40, 63]) {
  for (const ma of [30, 100, 300]) {
    for (const poles of [2, 4]) {
      add(
        `RCD-${amps}-${ma}-${poles}P`,
        `Wyłącznik różnicowoprądowy ${amps}A ${ma}mA ${poles}P`,
        `Wyłącznik różnicowoprądowy (RCD) typ AC, prąd znamionowy ${amps}A, prąd różnicowy ${ma}mA, ${poles}-biegunowy, montaż na szynie DIN.`,
      );
    }
  }
}

for (const char of ["B", "C"] as const) {
  for (const amps of [10, 16, 20, 25]) {
    add(
      `RCBO-${char}${amps}-30`,
      `Wyłącznik różnicowo-nadprądowy ${char}${amps} 30mA 1P+N`,
      `Wyłącznik różnicowo-nadprądowy (RCBO) łączący funkcję nadprądową (charakterystyka ${char}, ${amps}A) i różnicową (30mA, typ AC), 1P+N, szerokość 1 modułu.`,
    );
  }
}

for (const amps of [32, 40, 63, 100]) {
  for (const poles of [1, 2, 3, 4]) {
    add(
      `ROZL-FR-${amps}-${poles}P`,
      `Rozłącznik izolacyjny FR ${amps}A ${poles}P`,
      `Rozłącznik izolacyjny modułowy, prąd znamionowy ${amps}A, ${poles}-biegunowy, jako wyłącznik główny w rozdzielnicy, montaż na szynie DIN.`,
    );
  }
}

for (const amps of [20, 25, 40, 63]) {
  add(
    `STY-${amps}-4NO`,
    `Stycznik modułowy ${amps}A 4NO`,
    `Stycznik modułowy, prąd znamionowy ${amps}A, 4 styki normalnie otwarte (NO), cewka 230V AC, do sterowania obwodami w rozdzielnicy.`,
  );
}

for (const [color, code] of [
  ["zielona", "GN"],
  ["czerwona", "RD"],
  ["żółta", "YE"],
] as const) {
  add(
    `LAMP-MOD-${code}`,
    `Lampka modułowa LED ${color}`,
    `Lampka sygnalizacyjna LED na szynę DIN, kolor ${color}, 230V AC, sygnalizacja obecności napięcia w rozdzielnicy.`,
  );
}

// ── Przewody i kable ───────────────────────────────────────────────────────────

const ydyConfigs = [
  [2, 1],
  [2, 1.5],
  [3, 1.5],
  [3, 2.5],
  [3, 4],
  [3, 6],
  [4, 1.5],
  [4, 2.5],
  [5, 1.5],
  [5, 2.5],
  [5, 4],
  [5, 6],
] as const;
for (const [type, label, form] of [
  ["YDYP", "YDYp", "płaski"],
  ["YDY", "YDY", "okrągły"],
] as const) {
  for (const [wires, section] of ydyConfigs) {
    add(
      `KAB-${type}-${wires}X${enc(section)}`,
      `Przewód ${label} ${wires}x${String(section).replace(".", ",")} mm² 450/750V krążek 100m`,
      `Przewód instalacyjny ${form} ${label} ${wires}x${String(section).replace(".", ",")} mm², izolacja PVC, 450/750V, do układania podtynkowo i natynkowo. Krążek 100 metrów.`,
    );
  }
}

for (const section of [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16]) {
  for (const [color, code] of [
    ["czarny", "BK"],
    ["niebieski", "BU"],
    ["żółto-zielony", "YG"],
    ["brązowy", "BN"],
    ["czerwony", "RD"],
  ] as const) {
    add(
      `KAB-LGY-${enc(section)}-${code}`,
      `Przewód LgY ${String(section).replace(".", ",")}mm² ${color} 100m`,
      `Przewód jednożyłowy giętki LgY (linka) ${String(section).replace(".", ",")} mm², izolacja PVC, kolor ${color}, 450/750V. Szpula 100 metrów.`,
    );
  }
}

for (const [type, cat] of [
  ["UTP", "5e"],
  ["UTP", "6"],
  ["UTP", "6a"],
  ["FTP", "5e"],
  ["FTP", "6"],
  ["FTP", "6a"],
] as const) {
  add(
    `KAB-${type}-C${cat.toUpperCase()}`,
    `Kabel ${type} kat.${cat} 305m`,
    `Kabel sieciowy skrętka ${type === "FTP" ? "ekranowana FTP" : "nieekranowana UTP"} kategorii ${cat}, drut miedziany 23AWG, do sieci LAN, karton 305 m.`,
  );
}
for (const wires of [4, 6, 8]) {
  add(
    `KAB-YTDY-${wires}X05`,
    `Przewód YTDY ${wires}x0,5 domofonowy 100m`,
    `Przewód telekomunikacyjny YTDY ${wires}x0,5 mm do instalacji domofonowych i alarmowych, krążek 100 m.`,
  );
}

// ── Rury, peszle, korytka, dławiki ────────────────────────────────────────────

for (const dia of [13, 16, 18, 20, 22, 25, 28, 32, 37, 47]) {
  add(
    `RUR-RL${dia}-3M`,
    `Rura elektroinstalacyjna RL${dia} 3m`,
    `Rura gładka sztywna RL o średnicy ${dia} mm, PVC, samogasnąca, sztanga 3 m, do prowadzenia przewodów natynkowo.`,
  );
}
for (const dia of [13, 16, 18, 20, 22, 25, 32]) {
  add(
    `PESZ-${dia}-25M`,
    `Peszel karbowany fi${dia} 25m`,
    `Rura karbowana giętka (peszel) o średnicy ${dia} mm, PVC, samogasnąca, krążek 25 m, do prowadzenia przewodów podtynkowo i w stropach.`,
  );
}
for (const [w, h] of [
  [15, 10],
  [18, 13],
  [25, 18],
  [25, 25],
  [40, 25],
  [40, 40],
  [60, 40],
  [60, 60],
  [90, 60],
  [110, 60],
] as const) {
  add(
    `KOR-${w}-${h}`,
    `Korytko kablowe ${w}x${h} z pokrywą 2m`,
    `Kanał kablowy PVC ${w}x${h} mm z pokrywą, biały, odcinek 2 m, do prowadzenia przewodów po ścianie.`,
  );
}
for (const m of [12, 16, 20, 25, 32, 40, 50, 63]) {
  add(
    `DLA-M${m}`,
    `Dławik kablowy M${m}`,
    `Dławnica kablowa poliamidowa M${m} z nakrętką, IP68, do szczelnego wprowadzania kabli do obudów i puszek.`,
  );
}

// ── Puszki i rozdzielnice ─────────────────────────────────────────────────────

for (const dia of [60, 70, 80]) {
  add(
    `PSZ-${dia}-PT`,
    `Puszka podtynkowa fi${dia} z pokrywą`,
    `Puszka instalacyjna podtynkowa okrągła, średnica ${dia} mm, głębokość 60 mm, z pokrywą, do łączenia przewodów w ścianach murowanych.`,
  );
  add(
    `PSZ-${dia}-PT-GL`,
    `Puszka podtynkowa głęboka fi${dia}`,
    `Puszka instalacyjna podtynkowa pogłębiana, średnica ${dia} mm, głębokość 80 mm, do osprzętu i zapasu przewodów w ścianach murowanych.`,
  );
}
for (const [w, h] of [
  [75, 75],
  [100, 100],
  [150, 110],
  [190, 140],
  [240, 190],
] as const) {
  add(
    `PSZ-HERM-${w}X${h}`,
    `Puszka natynkowa hermetyczna IP65 ${w}x${h}`,
    `Puszka instalacyjna natynkowa hermetyczna ${w}x${h} mm, IP65, z dławikami, do instalacji w pomieszczeniach wilgotnych i na zewnątrz.`,
  );
}
for (const modules of [4, 8, 12, 18, 24, 36, 48, 72]) {
  for (const [mount, code, mountDesc] of [
    ["natynkowa", "NT", "natynkowa"],
    ["podtynkowa", "PT", "podtynkowa"],
  ] as const) {
    add(
      `ROZ-${modules}-${code}`,
      `Rozdzielnica ${mount} ${modules} modułów IP40`,
      `Rozdzielnica elektryczna ${mountDesc} ${modules} modułów, IP40, drzwi białe, z szyną TH35 i listwami N+PE, do mieszkań i biur.`,
    );
  }
}

// ── Oświetlenie ───────────────────────────────────────────────────────────────

for (const [size, sizeLabel] of [
  ["6060", "60x60"],
  ["30120", "30x120"],
] as const) {
  for (const watts of [30, 40, 50]) {
    for (const kelvin of [3000, 4000, 6500]) {
      add(
        `LED-PAN-${size}-${watts}-${kelvin / 1000}K`,
        `Panel LED ${sizeLabel} ${watts}W ${kelvin}K`,
        `Panel sufitowy LED ${sizeLabel} cm, moc ${watts}W, barwa ${kelvin === 3000 ? "ciepła" : kelvin === 4000 ? "neutralna" : "zimna"} ${kelvin}K, strumień ${watts * 100}lm, UGR<19, do sufitów modułowych kasetonowych.`,
      );
    }
  }
}
for (const [len, watts] of [
  [60, 18],
  [120, 36],
  [150, 48],
] as const) {
  add(
    `LED-HERM-${len}-${watts}`,
    `Oprawa hermetyczna LED ${len}cm ${watts}W IP65`,
    `Oprawa liniowa hermetyczna LED ${len * 10} mm, ${watts}W, 4000K, IP65, do garaży, piwnic i pomieszczeń wilgotnych. Klosz PC, montaż natynkowy.`,
  );
}
for (const [socket, wattsList] of [
  ["E27", [6, 9, 10, 13, 18]],
  ["E14", [4, 6, 8]],
  ["GU10", [3.5, 5.5, 7]],
] as const) {
  for (const watts of wattsList) {
    for (const kelvin of [3000, 4000, 6500]) {
      add(
        `LED-${socket}-${enc(watts)}-${kelvin / 1000}K`,
        `Żarówka LED ${socket} ${String(watts).replace(".", ",")}W ${kelvin}K`,
        `Żarówka LED, trzonek ${socket}, moc ${String(watts).replace(".", ",")}W, barwa ${kelvin === 3000 ? "ciepła" : kelvin === 4000 ? "neutralna" : "zimna"} ${kelvin}K, strumień ok. ${Math.round(watts * 105)}lm.`,
      );
    }
  }
}
for (const watts of [10, 20, 30, 50, 100, 150, 200]) {
  for (const kelvin of [4000, 6500]) {
    add(
      `NAS-LED-${watts}-${kelvin / 1000}K`,
      `Naświetlacz LED ${watts}W ${kelvin}K IP65`,
      `Naświetlacz (halogen) LED ${watts}W, barwa ${kelvin}K, IP65, obudowa aluminiowa, do oświetlenia placów, elewacji i terenu.`,
    );
  }
}
for (const volts of [12, 24, 48]) {
  for (const watts of [20, 40, 60, 100, 150, 200]) {
    add(
      `ZAS-LED-${volts}-${watts}`,
      `Zasilacz LED ${volts}V ${watts}W`,
      `Zasilacz napięciowy do taśm i opraw LED, napięcie wyjściowe ${volts}V DC, moc ${watts}W, IP20, zabezpieczenie zwarciowe i przeciążeniowe.`,
    );
  }
}
for (const volts of [12, 24]) {
  for (const wpm of [4.8, 9.6, 14.4]) {
    for (const [colorLabel, code] of [
      ["3000K", "3K"],
      ["4000K", "4K"],
      ["6500K", "6.5K"],
      ["RGB", "RGB"],
    ] as const) {
      add(
        `TLED-${volts}-${enc(wpm)}-${code}`,
        `Taśma LED ${volts}V ${String(wpm).replace(".", ",")}W/m ${colorLabel} 5m`,
        `Taśma LED ${volts}V DC, moc ${String(wpm).replace(".", ",")} W/m, barwa ${colorLabel}, rolka 5 m, IP20, samoprzylepna.`,
      );
    }
  }
}

// ── Osprzęt: gniazda i łączniki ───────────────────────────────────────────────

const accessoryColors = [
  ["białe", "biały", "BI"],
  ["czarne", "czarny", "CZ"],
  ["srebrne", "srebrny", "SR"],
] as const;
for (const [colorN, , code] of accessoryColors) {
  add(
    `GNI-PT-1-${code}`,
    `Gniazdo podtynkowe pojedyncze z uziemieniem ${colorN}`,
    `Gniazdo wtyczkowe podtynkowe 2P+Z, 16A/250V, pojedyncze, kolor ${colorN}, zaciski śrubowe, ramka w komplecie.`,
  );
  add(
    `GNI-PT-2-${code}`,
    `Gniazdo podtynkowe podwójne z uziemieniem ${colorN}`,
    `Gniazdo wtyczkowe podtynkowe podwójne 2x(2P+Z), 16A/250V, kolor ${colorN}, zaciski śrubowe, ramka w komplecie.`,
  );
  add(
    `GNI-PT-USB-${code}`,
    `Gniazdo podtynkowe z ładowarką USB ${colorN}`,
    `Gniazdo wtyczkowe podtynkowe 2P+Z 16A/250V z podwójną ładowarką USB-A+C 2,4A, kolor ${colorN}, ramka w komplecie.`,
  );
  add(
    `GNI-HERM-IP44-${code}`,
    `Gniazdo natynkowe hermetyczne IP44 z klapką ${colorN}`,
    `Gniazdo wtyczkowe natynkowe bryzgoszczelne 2P+Z, 16A/250V, IP44, z klapką, kolor ${colorN}, do pomieszczeń wilgotnych i na zewnątrz.`,
  );
}
for (const [typeCode, typeLabel, typeDesc] of [
  ["1", "jednobiegunowy", "jednobiegunowy (wyłącznik światła)"],
  ["SW", "świecznikowy", "świecznikowy (podwójny, dwa obwody oświetlenia)"],
  ["SCH", "schodowy", "schodowy do sterowania oświetleniem z dwóch miejsc"],
  ["KRZ", "krzyżowy", "krzyżowy do sterowania oświetleniem z trzech i więcej miejsc"],
  ["DZW", "dzwonkowy", "dzwonkowy (przycisk monostabilny)"],
  ["ZAL", "żaluzjowy", "żaluzjowy do sterowania roletami"],
] as const) {
  for (const [colorN, colorM, code] of accessoryColors) {
    add(
      `LACZ-${typeCode}-${code}`,
      `Łącznik ${typeLabel} ${colorM} podtynkowy`,
      `Łącznik instalacyjny ${typeDesc}, podtynkowy, 10AX/250V, kolor ${colorN.replace("e", "y")}, ramka w komplecie.`,
    );
  }
}

// ── Złączki i drobny montaż ───────────────────────────────────────────────────

for (const [prefix, maxSection] of [
  ["41", 4],
  ["61", 6],
] as const) {
  for (const wires of [2, 3, 5]) {
    add(
      `ZL-221-${prefix}${wires === 5 ? 5 : wires}`,
      `Szybkozłączka instalacyjna ${wires}-przewodowa ${maxSection}mm²`,
      `Złączka typu WAGO 221 z dźwigniami, ${wires} przewod${wires === 2 ? "y" : wires === 3 ? "y" : "ów"} drutow${wires === 5 ? "ych" : "e"} lub linkow${wires === 5 ? "ych" : "e"} 0,2–${maxSection} mm², 32A/450V. Wielokrotnego użytku, przezroczysta obudowa.`,
    );
  }
}
for (const wires of [2, 3, 5, 8]) {
  add(
    `ZL-2273-10${wires}`,
    `Złączka do puszek ${wires}-przewodowa 2,5mm²`,
    `Złączka wciskana typu WAGO 2273 do puszek instalacyjnych, ${wires} przewodów drutowych 0,5–2,5 mm², 24A/450V, kompaktowa.`,
  );
}
for (const section of [2.5, 4, 6, 10, 16]) {
  add(
    `LIS-ZAC-12-${enc(section)}`,
    `Listwa zaciskowa 12-torowa ${String(section).replace(".", ",")}mm²`,
    `Listwa zaciskowa gwintowa (kostka elektryczna) 12 torów, przekrój do ${String(section).replace(".", ",")} mm², poliamid, 450V, do łączenia przewodów.`,
  );
}
for (const [color, code] of [
  ["czarna", "BK"],
  ["niebieska", "BU"],
  ["czerwona", "RD"],
  ["żółto-zielona", "YG"],
  ["biała", "WH"],
] as const) {
  add(
    `TAS-IZO-19-${code}`,
    `Taśma izolacyjna PVC 19mm ${color}`,
    `Taśma elektroizolacyjna PVC 19 mm x 20 m, kolor ${color}, samogasnąca, odporna na UV, do izolowania połączeń do 400V.`,
  );
}
for (const len of [100, 140, 200, 300, 370, 540]) {
  for (const [color, code] of [
    ["czarne", "BK"],
    ["naturalne (białe)", "NT"],
  ] as const) {
    add(
      `OPK-KAB-${len}-${code}`,
      `Opaski kablowe ${len}mm ${color} 100szt`,
      `Opaski zaciskowe (trytytki) ${len} mm, kolor ${color}, odporne na UV, poliamid 6.6. Opakowanie 100 sztuk.`,
    );
  }
}
for (const dia of [6, 8, 10, 12, 16, 20, 25]) {
  add(
    `UCH-KAB-${dia}`,
    `Uchwyt kablowy typu flop fi${dia} 100szt`,
    `Uchwyt kablowy z tworzywa (flop) z kołkiem szybkiego montażu, do przewodów o średnicy ${dia} mm. Opakowanie 100 sztuk.`,
  );
}
for (const m of [6, 8, 10, 12]) {
  add(
    `SRU-M${m}-A2`,
    `Śruba M${m} nierdzewna A2 z nakrętką 50szt`,
    `Śruba sześciokątna M${m}x60 ze stali nierdzewnej A2 z nakrętką i podkładką, opakowanie 50 kompletów.`,
  );
}

// ── Czujniki i automatyka ─────────────────────────────────────────────────────

add(
  "CZJ-RUCH-120-IP44",
  "Czujnik ruchu 120° ścienny IP44",
  "Czujnik ruchu PIR montowany na ścianie, kąt detekcji 120 stopni, zasięg do 12m, IP44, obciążenie do 1200W, regulacja czasu i czułości.",
);
add(
  "CZJ-RUCH-180-IP44",
  "Czujnik ruchu 180° ścienny IP44",
  "Czujnik ruchu PIR montowany na ścianie, kąt detekcji 180 stopni, zasięg do 12m, IP44, obciążenie do 1200W, regulacja czasu i czułości.",
);
add(
  "CZJ-RUCH-360",
  "Czujnik ruchu 360° sufitowy",
  "Czujnik ruchu PIR montowany na suficie, kąt detekcji 360 stopni, zasięg do 6m, IP20, obciążenie do 1200W, regulacja czasu i czułości.",
);
add(
  "CZJ-RUCH-360-IP65",
  "Czujnik ruchu 360° sufitowy hermetyczny IP65",
  "Czujnik ruchu PIR montowany na suficie, kąt detekcji 360 stopni, zasięg do 8m, IP65, do pomieszczeń wilgotnych, obciążenie do 1200W.",
);
add(
  "CZJ-RUCH-MW",
  "Czujnik ruchu mikrofalowy 360°",
  "Czujnik ruchu mikrofalowy 5,8GHz, detekcja 360 stopni przez cienkie przegrody, zasięg do 16m, IP20, montaż sufitowy.",
);
add(
  "CZJ-ZMIE-IP44",
  "Czujnik zmierzchowy IP44",
  "Wyłącznik zmierzchowy natynkowy, próg zadziałania 2–100 lx, obciążenie 2300W, IP44, do sterowania oświetleniem zewnętrznym.",
);
add(
  "CZJ-ZAL-01",
  "Czujnik zalania",
  "Detektor wycieku wody do kotłowni, łazienek i kuchni. Sygnalizacja akustyczna 85dB po wykryciu cieczy, zasilanie bateryjne, montaż podłogowy.",
);
add(
  "CZJ-CZAD-01",
  "Czujnik czadu",
  "Detektor tlenku węgla (czadu) z sygnalizacją akustyczną i optyczną, wyświetlacz LCD, zasilanie bateryjne, żywotność sensora 10 lat.",
);
add(
  "CZJ-DYM-01",
  "Czujnik dymu",
  "Optyczny detektor dymu z sygnalizacją akustyczną 85dB, zasilanie bateryjne, przycisk testu, montaż sufitowy.",
);

// ── Przedłużacze, dzwonki, mierniki, narzędzia ────────────────────────────────

for (const len of [25, 40, 50]) {
  add(
    `PRZ-BEB-${len}`,
    `Przedłużacz bębnowy ${len}m 4 gniazda`,
    `Przedłużacz na bębnie, przewód 3x1,5 mm² długości ${len} m, 4 gniazda z uziemieniem, zabezpieczenie termiczne, IP20.`,
  );
}
for (const len of [1.5, 3, 5, 10]) {
  for (const sockets of [3, 5]) {
    add(
      `PRZ-LIS-${enc(len)}-${sockets}`,
      `Przedłużacz listwowy ${String(len).replace(".", ",")}m ${sockets} gniazd`,
      `Przedłużacz listwowy ${sockets} gniazd z uziemieniem, przewód 3x1,5 mm² długości ${String(len).replace(".", ",")} m, z wyłącznikiem podświetlanym.`,
    );
  }
}
add(
  "DZW-BEZP-100",
  "Dzwonek bezprzewodowy zasięg 100m",
  "Dzwonek do drzwi bezprzewodowy, zasięg do 100 m w terenie otwartym, 36 melodii, przycisk IP44, gniazdkowy 230V.",
);
add(
  "DZW-PRZEW-230",
  "Dzwonek przewodowy dwutonowy 230V",
  "Dzwonek do drzwi przewodowy dwutonowy gong, zasilanie 230V AC, montaż natynkowy.",
);
add(
  "TRA-DZW-8V",
  "Transformator dzwonkowy 8V",
  "Transformator dzwonkowy modułowy na szynę DIN, wejście 230V, wyjście 8V AC 1A, do zasilania dzwonków przewodowych.",
);
add(
  "MIER-MULTI-CY",
  "Multimetr cyfrowy",
  "Miernik uniwersalny cyfrowy: pomiar napięcia AC/DC do 600V, prądu, rezystancji, test ciągłości i diód, wyświetlacz LCD z podświetleniem.",
);
add(
  "MIER-CEG-AC",
  "Miernik cęgowy AC",
  "Miernik cęgowy do pomiaru prądu AC do 400A bez rozłączania obwodu, dodatkowo napięcie i rezystancja, wyświetlacz LCD.",
);
add(
  "PROB-NAP-NEO",
  "Próbnik napięcia neonowy",
  "Wskaźnik napięcia neonowy w formie wkrętaka płaskiego, zakres 100–500V AC, do szybkiego sprawdzania obecności fazy.",
);
add(
  "PROB-NAP-2P",
  "Próbnik napięcia dwubiegunowy",
  "Dwubiegunowy wskaźnik napięcia 12–690V AC/DC z sygnalizacją LED i testem ciągłości, IP64, kategorii CAT III.",
);
for (const [lumens, label] of [
  [350, "czołowa"],
  [500, "czołowa"],
] as const) {
  add(
    `LAT-CZO-${lumens}`,
    `Latarka czołowa LED ${lumens}lm`,
    `Latarka warsztatowa na głowę (czołówka), dioda LED ${lumens} lumenów, 3 tryby świecenia, regulowany kąt, zasilanie akumulatorowe USB. Wariant ${label}.`,
  );
}
for (const lumens of [300, 600]) {
  add(
    `LAT-RECZ-${lumens}`,
    `Latarka ręczna LED ${lumens}lm`,
    `Latarka ręczna warsztatowa LED ${lumens} lumenów, obudowa aluminiowa, zasilanie akumulatorowe USB-C, klips i magnes.`,
  );
}
for (const [type, sizes] of [
  ["PH", ["0", "1", "2", "3"]],
  ["PZ", ["1", "2"]],
  ["PL", ["3.5", "4", "5.5", "6.5"]],
] as const) {
  for (const size of sizes) {
    const label = type === "PL" ? `płaski ${size.replace(".", ",")}mm` : `${type}${size}`;
    add(
      `WKR-${type}${enc(Number(size))}-VDE`,
      `Wkrętak izolowany ${label} VDE 1000V`,
      `Wkrętak elektryka z izolacją VDE do 1000V, końcówka ${label}, ergonomiczna rękojeść dwukomponentowa.`,
    );
  }
}
add(
  "SZCZ-BOCZ-160",
  "Szczypce boczne 160mm VDE",
  "Szczypce tnące boczne 160 mm z izolacją VDE 1000V, do cięcia przewodów miedzianych i aluminiowych.",
);
add(
  "SZCZ-UNIW-180",
  "Szczypce uniwersalne 180mm VDE",
  "Szczypce uniwersalne (kombinerki) 180 mm z izolacją VDE 1000V, szczęki tnące i chwytne.",
);
add(
  "SCIAG-IZO-AUTO",
  "Ściągacz izolacji automatyczny",
  "Automatyczny ściągacz izolacji do przewodów 0,2–6 mm² z obcinarką, samoregulujący.",
);
add(
  "NOZ-MONT-ELE",
  "Nóż monterski z ostrzem hakowym",
  "Nóż elektryka z ostrzem hakowym do ściągania izolacji kabli okrągłych, rękojeść z tworzywa.",
);

// ── Uzupełnienia: ramki, downlighty, przewody warsztatowe, gniazda siłowe ────

for (const slots of [1, 2, 3, 4, 5]) {
  for (const [colorN, , code] of accessoryColors) {
    add(
      `RAM-${slots}-${code}`,
      `Ramka ${slots}-krotna ${colorN.replace("e", "a")}`,
      `Ramka instalacyjna ${slots}-krotna do osprzętu podtynkowego, montaż poziomy i pionowy, kolor ${colorN.replace("e", "a")}.`,
    );
  }
}
for (const dia of [9, 12, 17]) {
  for (const kelvin of [3000, 4000]) {
    add(
      `LED-DWN-${dia}-${kelvin / 1000}K`,
      `Oprawa downlight LED fi${dia}cm ${kelvin}K`,
      `Oprawa sufitowa wpuszczana downlight LED, średnica ${dia} cm, barwa ${kelvin === 3000 ? "ciepła" : "neutralna"} ${kelvin}K, do zabudowy w sufitach podwieszanych.`,
    );
  }
}
for (const [type, form] of [
  ["OMY", "okrągły"],
  ["OWY", "warsztatowy okrągły"],
] as const) {
  for (const [wires, section] of [
    [2, 0.75],
    [2, 1],
    [3, 0.75],
    [3, 1],
    [3, 1.5],
    [3, 2.5],
  ] as const) {
    add(
      `KAB-${type}-${wires}X${enc(section)}`,
      `Przewód ${type} ${wires}x${String(section).replace(".", ",")} mm² 100m`,
      `Przewód mieszkaniowy ${form} ${type} ${wires}x${String(section).replace(".", ",")} mm², linka, izolacja PVC, 300/300V, do zasilania urządzeń ruchomych. Krążek 100 metrów.`,
    );
  }
}
for (const amps of [16, 32]) {
  for (const poles of [4, 5]) {
    add(
      `GNI-CEE-${amps}-${poles}P`,
      `Gniazdo siłowe CEE ${amps}A ${poles}P natynkowe`,
      `Gniazdo siłowe trójfazowe CEE ${amps}A, ${poles}-biegunowe (${poles === 4 ? "3P+PE" : "3P+N+PE"}), 400V, IP44, montaż natynkowy.`,
    );
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

const skus = new Set<string>();
for (const p of products) {
  if (skus.has(p.sku)) throw new Error(`Duplicate SKU: ${p.sku}`);
  skus.add(p.sku);
}

const catalog = {
  description:
    "Benchmark catalog: Polish electrical wholesale, generated by benchmarks/scripts/generate-catalog.ts (do not edit products by hand). Parametric families create near-variants differing by one parameter (amperage, cross-section, diameter, color temperature, pole count, color). No coax cable on purpose — case 03 expects RG6 unmatched.",
  products,
};

const outPath = path.resolve(import.meta.dirname, "../cases/catalog.json");
writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${products.length} products to ${outPath}`);
