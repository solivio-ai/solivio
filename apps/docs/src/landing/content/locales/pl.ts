import { deraveReferralUrl, githubUrl } from "../links";
import type { LandingContent } from "../types";

export const plLandingContent = {
  locale: "pl",
  lang: "pl",
  path: "/pl/",
  alternateLocale: "en",
  alternatePath: "/",
  alternateLabel: "EN",
  title: "Solivio - open-source system do ofertowania B2B z AI",
  description:
    "Solivio to open-source system do samodzielnego hostingu, który zamienia nieuporządkowane zapytania B2B, katalogi i dane klientów w szkice ofert.",
  ogTitle: "Solivio - od zapytania ofertowego do szkicu oferty w open source",
  ogDescription:
    "Uruchom Solivio lokalnie albo on-prem. Połącz CRM, ERP, e-commerce, katalogi i dokumenty w jednym procesie przygotowania i weryfikacji ofert.",
  seo: {
    ogLocale: "pl_PL",
    alternateOgLocale: "en_US",
    ogImageAlt: "Podgląd procesu Solivio od zapytania klienta do szkicu oferty",
  },
  labels: {
    skipToContent: "Przejdź do treści",
    home: "Strona główna Solivio",
    primaryNavigation: "Główna nawigacja",
    primaryActions: "Główne akcje",
    projectFacts: "Fakty o projekcie",
    productPreview: "Podgląd produktu Solivio",
    nextSteps: "Następne kroki",
    announcement:
      "Uruchom lokalnie, zobacz architekturę i przejdź przez proces od zapytania do szkicu oferty",
    quickStart: "Szybki start",
    copy: "Kopiuj",
    copied: "Skopiowano",
    rawInquiry: "Surowe zapytanie",
    extractedSummary: "Ekstrakcja",
    productMatches: "Dopasowania katalogu",
    confidence: "Pewność",
    generated: "Wygenerowany",
    inReview: "W weryfikacji",
    accepted: "PDF",
    sourceTrail: "Ślad źródeł",
    architectureCaption: "Istniejące systemy → Solivio → zespół sprzedaży",
    moduleStatus: "Obszar",
    operatorLink: "Otwórz przewodnik wdrożenia",
    footerTop: "Do góry",
    footerBy: "od",
    githubRepository: "Repozytorium GitHub",
    apiReference: "API",
  },
  sectionLabels: {
    workflow: "Proces",
    foundation: "Fundament",
    process: "Proces",
    architecture: "Architektura",
    modules: "Moduły",
    operator: "Operator",
    why: "Dlaczego",
  },
  nav: {
    product: "Produkt",
    architecture: "Architektura",
    docs: "Dokumentacja",
  },
  hero: {
    h1: "Od zapytania w dowolnej formie do",
    h1Highlight: "szkicu oferty",
    body: "Solivio to open-source system ofertowania B2B do samodzielnego hostingu. Przyjmuje zapytanie tak, jak przychodzi: mail, załącznik, zdjęcie, notatka albo wiadomość głosowa. Łączy je z katalogiem i kontekstem z CRM/ERP, porządkuje i przygotowuje szkic oferty do weryfikacji przez handlowca.",
    facts: [
      "Licencja MIT - sklonuj, uruchom, sprawdź kod",
      "Modele AI w chmurze albo lokalnie",
      "Moduły do integracji z istniejącymi systemami",
    ],
    primary: { href: "/guides/getting-started/", label: "Uruchom lokalnie" },
    secondary: { href: githubUrl, label: "Zobacz GitHub", external: true },
    quickStart: "git clone https://github.com/solivio-ai/solivio.git && cd solivio && yarn setup",
    offerNav: ["Zapytania", "Katalog", "Oferty", "Klienci", "Asystent"],
    offerTitle: "Szkic oferty 2026-0607-001",
    offerMeta: "ACME Automation - 18 pozycji - Weryfikacja",
    offerStatus: "Szkic",
    offerTableHeaders: ["Pozycja", "Ilość", "Suma"],
    offerRows: [
      ["Silnik serwo 750 W", "4", "5 000,00"],
      ["Przekładnia planetarna 10:1", "4", "2 480,00"],
      ["Sterownik napędu 3 kW", "4", "4 320,00"],
      ["Rezystor hamujący 200 W", "4", "440,00"],
    ],
    offerActions: ["Edytuj", "Zatwierdź i wygeneruj PDF"],
  },
  heroPreview: {
    productSignals: [
      { label: "Pozycje", value: "4" },
      { label: "Etap", value: "Szkic" },
      { label: "Wynik", value: "PDF" },
    ],
    rail: [
      {
        title: "Kod open source",
        body: "MIT, lokalne uruchomienie i kod do wglądu.",
      },
      {
        title: "Samodzielny hosting",
        body: "Docker, Postgres i brak uzależnienia od dostawcy.",
      },
      {
        title: "Na złożone zapytania",
        body: "Wielopozycyjne zapytania i duże katalogi.",
      },
      {
        title: "Dla zespołów technicznych",
        body: "TypeScript, Next.js, Drizzle i moduły.",
      },
    ],
    inquiryTitle: "Zapytanie",
    inquiryStatus: "Nowe",
    rawInquiryBody:
      "Potrzebujemy oferty na 3 linie produkcyjne. Każda linia: silnik, przekładnia, sterownik i akcesoria. Dostawa w Q3.",
    extractedSummaryItems: [
      "3 linie produkcyjne",
      "Silnik + przekładnia + sterownik",
      "Termin dostawy: Q3",
    ],
  },
  stack: {
    title: "Zbudowane na znanym stacku",
    items: ["Next.js", "TypeScript", "Postgres", "Drizzle ORM", "Tailwind v4", "shadcn/ui"],
  },
  metrics: {
    items: [
      { value: "MIT", label: "Licencja open source" },
      { value: "7", label: "Wbudowanych modułów" },
      { value: "On-prem", label: "Możliwe wdrożenie" },
      { value: "Chmura/lokalnie", label: "Modele AI" },
    ],
  },
  what: {
    title: "Od zapytania ofertowego do szkicu oferty",
    body: "Solivio pomaga zespołom sprzedaży zamieniać złożone, wielopozycyjne zapytania i rozproszony kontekst w uporządkowane szkice ofert. Rdzeń procesu jest celowo wąski, przejrzysty i łatwy do rozszerzenia.",
    items: [
      {
        title: "Przyjęcie zapytania",
        body: "Przyjmuj zapytania z e-maili, wklejonego tekstu, plików CSV albo importerów dopasowanych do wdrożenia.",
      },
      {
        title: "Ekstrakcja",
        body: "System rozpoznaje pozycje, ilości, parametry, niejasności i ślad źródeł.",
      },
      {
        title: "Dopasowanie produktów",
        body: "Przeszukuj katalog po SKU, opisie, regułach i podobieństwie semantycznym, jeśli wdrożenie korzysta z embeddingów.",
      },
      {
        title: "Szkic oferty",
        body: "Powstaje szkic z pozycjami, notatkami, fragmentami wymagającymi decyzji i możliwością wygenerowania PDF.",
      },
      {
        title: "Weryfikacja przez handlowca",
        body: "Handlowiec poprawia produkty, ilości, rabaty i status akceptacji, zanim cokolwiek trafi do klienta.",
      },
    ],
  },
  capabilities: {
    title: "Warstwa sprzedażowa dla systemów, które już masz",
    body: "Solivio nie zastępuje CRM, ERP, e-commerce, katalogów, dokumentów ani narzędzi raportowych. Zbiera z nich kontekst sprzedażowy, przygotowuje szkic oferty i po akceptacji przekazuje wynik tam, gdzie zespół już pracuje.",
    items: [
      {
        title: "Wejście z wielu źródeł",
        body: "Zacznij od e-maili, wklejonego tekstu, plików CSV, dokumentów albo importerów dopasowanych do wdrożenia.",
      },
      {
        title: "Kontekst z obecnych narzędzi",
        body: "Włącz do ofertowania katalog, dane klienta, ceny, stany magazynowe, umowy, historię zamówień, CRM, ERP, e-commerce i zasady sprzedaży.",
      },
      {
        title: "Wybór dostawcy AI",
        body: "Wybierz dostawców AI w chmurze pasujących do wdrożenia albo podłącz lokalne modele do ekstrakcji, dopasowania i funkcji asystenta.",
      },
      {
        title: "Pełne on-prem, gdy trzeba",
        body: "Gdy polityka firmy tego wymaga, uruchom Solivio z lokalnymi modelami AI i własną infrastrukturą.",
      },
      {
        title: "Kontrola po stronie handlowca",
        body: "Handlowiec zachowuje kontrolę nad produktami, ilościami, rabatami, marżą i akceptacją.",
      },
      {
        title: "Elastyczne przekazanie wyniku",
        body: "Dodawaj moduły dla importerów, narzędzi agentów, stron, API, zadań, zdarzeń, slotów UI i dalszych integracji.",
      },
    ],
    link: { href: "/guides/features/", label: "Zobacz przewodnik po funkcjach" },
  },
  workflow: {
    title: "Jak to działa",
    body: "Rdzeń procesu jest celowo wąski: przejście od danych od klienta do ustrukturyzowanego szkicu oferty z handlowcem po drodze.",
    steps: [
      {
        title: "Zapytanie klienta",
        body: "Mail, arkusz albo dokument opisuje, czego potrzebuje klient.",
      },
      {
        title: "Ekstrakcja",
        body: "Solivio rozpoznaje produkty, ilości, wymagania i ograniczenia.",
      },
      {
        title: "Dopasowanie katalogu",
        body: "System znajduje produkty-kandydatów i oznacza wybory wymagające decyzji.",
      },
      {
        title: "Szkic oferty",
        body: "Powstaje szkic z cenami i notatkami tam, gdzie konfiguracja to umożliwia.",
      },
      {
        title: "Weryfikacja i akceptacja",
        body: "Handlowiec edytuje, waliduje, akceptuje albo odsyła szkic do kolejnego przebiegu.",
      },
      {
        title: "Zaakceptowany wynik",
        body: "Zaakceptowana oferta może stać się PDF-em albo trafić do CRM, ERP, e-commerce i innych miejsc specyficznych dla wdrożenia.",
      },
    ],
  },
  workflowPreview: {
    title: "Zapytanie przechodzi przez jawne etapy",
    items: [
      { title: "Surowe zapytanie", body: "mail, CSV, dokument" },
      { title: "Dopasowania katalogu", body: "SKU, tekst, semantyka" },
      { title: "Szkic", body: "edycja i akceptacja" },
    ],
    stepsCountLabel: "kroków",
  },
  architecture: {
    title: "Architektura pod rozszerzenia, bez przywiązania do dostawcy",
    body: "Solivio to modułowy monolit dla pojedynczego wdrożenia. Rdzeń prowadzi proces od zapytania do szkicu oferty, a moduły dodają źródła danych, reguły, modele AI i miejsca docelowe konkretnej firmy.",
    link: { href: "/guides/modules/", label: "Poznaj moduły" },
    blocks: [
      {
        title: "Istniejące systemy",
        body: "CRM, ERP, e-commerce, skrzynki e-mail, arkusze, PDF-y, katalogi produktowe i wewnętrzne API dostarczają Solivio kontekstu.",
      },
      {
        title: "Aplikacja Solivio",
        body: "Przyjęcie zapytania, ekstrakcja, dopasowanie katalogu, szkic oferty, weryfikacja, akceptacja i PDF działają w jednym przepływie.",
      },
      {
        title: "Moduły rozszerzeń",
        body: "Typowane strony, API, usługi, zdarzenia, importery, zadania, narzędzia agentów i sloty UI dopasowują Solivio do procesu firmy.",
      },
      {
        title: "Wybór wdrożenia",
        body: "Dobierz dostawców AI w chmurze, lokalne modele albo pełne on-prem tak, aby wdrożenie pasowało do polityki firmy.",
      },
    ],
    note: "Jedno wdrożenie dla jednego klienta - wybór dostawcy lub lokalnych modeli AI - moduły kompilowane przy buildzie - brak importów między modułami w runtime",
  },
  architectureDiagram: {
    sourceSystems: ["CRM", "ERP", "E-commerce", "E-mail", "Excel", "PDF", "Wewnętrzne API"],
    solivioPipeline: ["Przyjęcie", "Ekstrakcja", "Dopasowanie", "Szkic", "Weryfikacja"],
    salesTeam: {
      title: "Zespół sprzedaży",
      body: "Handlowcy sprawdzają, edytują i akceptują ofertę przed wygenerowaniem PDF-a albo przekazaniem wyniku do istniejących narzędzi.",
      actions: ["Sprawdzenie", "Edycja", "Akceptacja", "PDF", "CRM", "ERP"],
    },
  },
  modules: {
    title: "Co dodają moduły",
    body: "Moduły to pakiety źródłowe, które rozszerzają aplikację o typowane strony, API, usługi, zadania i integracje bez importów między modułami w runtime.",
    link: { href: "/guides/extending/", label: "Przeczytaj przewodnik po rozszerzaniu" },
    items: [
      { title: "Strony", body: "UI osadzone w wygenerowanym shellu aplikacji." },
      { title: "Trasy API", body: "Endpointy HTTP pod wygenerowanym drzewem app-routera." },
      {
        title: "Usługi i zdarzenia",
        body: "Logika biznesowa i typowane zdarzenia obserwacyjne.",
      },
      { title: "Zadania", body: "Zadania w tle i opcjonalne harmonogramy cron." },
      {
        title: "Importery",
        body: "Normalizacja surowych danych przed zapisem przez moduł właściciela.",
      },
      {
        title: "Narzędzia agentów",
        body: "Narzędzia używane przez agentów generowania oferty i asystenta.",
      },
      {
        title: "i18n, nawigacja i sloty",
        body: "Tłumaczenia, elementy nawigacji i punkty wstrzyknięcia UI.",
      },
    ],
  },
  moduleTable: {
    moduleHeader: "Moduł",
    contributionHeader: "Co wnosi",
    coreStatus: "Rdzeń",
    extensionStatus: "Rozszerzenie",
  },
  operator: {
    title: "Ścieżka wdrożenia",
    body: "Zacznij lokalnie, a potem dobierz sposób uruchomienia, integracje oraz modele AI - chmurowe lub lokalne - dla poszczególnych ról w systemie.",
    items: [
      {
        title: "Uruchom lokalnie",
        body: "`yarn setup` uruchamia Postgres, generuje połączenia modułów i wykonuje migracje.",
      },
      {
        title: "Konfiguracja z kodu źródłowego",
        body: "Sklonuj repozytorium, zainstaluj zależności przez Yarn, skopiuj `.env.example` i uruchom aplikację Next.js.",
      },
      {
        title: "Ścieżka integracji",
        body: "Domyślna ewaluacja działa lokalnie; integracje z CRM, ERP, e-commerce i innymi narzędziami dodajesz jako moduły wdrożeniowe.",
      },
      {
        title: "Opcje modeli AI",
        body: "Używaj dostawców AI w chmurze albo lokalnych modeli i przypisuj ekstrakcję, dopasowanie oraz asystenta do właściwych ról.",
      },
      {
        title: "Budowanie i wdrożenie",
        body: "Obraz produkcyjny i przewodnik wdrożeniowy prowadzą przez instalację na VPS-ie.",
      },
      {
        title: "Dokumentacja i API",
        body: "Konfiguracja, moduły, rozszerzanie, wdrożenie i wygenerowana referencja OpenAPI są opisane w dokumentacji.",
      },
    ],
  },
  why: {
    title: "Wąskie gardło jest przed ofertą",
    body: "Zapytania klientów przychodzą w nieuporządkowanej formie, a wiedza potrzebna do odpowiedzi jest rozproszona między katalogiem, CRM/ERP, cennikami, dokumentami, historią ofert i ludźmi. Solivio zbiera ten kontekst w szkic oferty do weryfikacji przez handlowca.",
    flow: {
      inbound: "Dziś zbierane ręcznie",
      engine: "Solivio to składa",
      outbound: "Gotowe do weryfikacji",
    },
    inquiry: {
      title: "Chaotyczne zapytanie",
      body: "Zapytanie przychodzi jak normalna komunikacja biznesowa, a nie jako gotowe pozycje produktowe.",
      items: ["Mail", "Załączniki", "Zdjęcia", "Notatki"],
    },
    knowledge: {
      title: "Rozproszona wiedza",
      body: "Solivio łączy kontekst sprzedażowy, którego zwykle trzeba szukać ręcznie.",
      items: ["Katalog", "CRM/ERP", "Cenniki", "Historia ofert", "Wiedza zespołu"],
    },
    outcome: {
      title: "Sprawdzony szkic",
      body: "Handlowiec nadal edytuje, waliduje, akceptuje i decyduje, co wychodzi poza firmę.",
      items: ["Edytowalne pozycje", "Ślad źródeł", "PDF albo przekazanie"],
    },
  },
  finalCta: {
    developerTitle: "Dla zespołu technicznego",
    developerBody:
      "Uruchom Solivio lokalnie w kilka minut, przejrzyj przewodniki po modułach i sprawdź kod zanim zdecydujesz, czy pasuje do Twojego zespołu.",
    developerPrimary: { href: "/guides/getting-started/", label: "Uruchom Solivio lokalnie" },
    developerSecondary: { href: githubUrl, label: "Zobacz GitHub", external: true },
    businessTitle: "Dla biznesu i wdrożeń",
    businessBody:
      "Weź jedno prawdziwe zapytanie klienta i sprawdź, czy Solivio pasuje do obecnego procesu ofertowania.",
    businessPrimary: {
      href: deraveReferralUrl("pl", "final_business_cta"),
      label: "Porozmawiaj o wdrożeniu",
      external: true,
    },
  },
  footer: {
    tagline: "Open-source system do przygotowywania szkiców ofert dla technicznych zespołów B2B.",
    product: "Produkt",
    resources: "Zasoby",
    community: "Społeczność",
  },
} satisfies LandingContent;
