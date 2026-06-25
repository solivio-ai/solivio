import { deraveReferralUrl, githubUrl } from "../links";
import type { LandingContent } from "../types";

export const plLandingContent = {
  locale: "pl",
  lang: "pl",
  path: "/pl/",
  alternateLocale: "en",
  alternatePath: "/",
  alternateLabel: "EN",
  title: "Solivio - open-source system AI do ofert B2B",
  description:
    "Solivio to open-source'owy, samodzielnie hostowany system AI, który zamienia surowe zapytania B2B, katalogi i dane klientów w szkice ofert.",
  ogTitle: "Solivio - open-source system od zapytania do szkicu oferty",
  ogDescription:
    "Uruchom Solivio lokalnie albo w pełni on-prem. Połącz CRM, ERP, e-commerce, katalogi i dokumenty w jednym procesie przeglądu ofert.",
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
    projectFacts: "Informacje o projekcie",
    productPreview: "Podgląd produktu Solivio",
    nextSteps: "Następne kroki",
    announcement:
      "Uruchom lokalnie, przejrzyj architekturę i sprawdź proces od zapytania do oferty",
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
    sourceTrail: "Ścieżka decyzyjna",
    architectureCaption: "Istniejące systemy → Solivio → zespół sprzedaży",
    moduleStatus: "Typ",
    operatorLink: "Przejdź do przewodnika wdrożenia",
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
    h1: "Od surowego zapytania B2B do",
    h1Highlight: "szkicu oferty",
    body: "Solivio to open-source'owy, samodzielnie hostowany system ofertowania B2B. Zamienia zapytania, katalogi, kontekst z CRM/ERP i dokumenty w szkice ofert gotowe do weryfikacji.",
    facts: [
      "Licencja MIT - sklonuj i uruchom",
      "AI w chmurze albo lokalne modele on-prem",
      "Moduły dla istniejących systemów",
    ],
    primary: { href: "/guides/getting-started/", label: "Rozpocznij konfigurację" },
    secondary: { href: githubUrl, label: "Zobacz GitHub", external: true },
    quickStart: "git clone https://github.com/solivio-ai/solivio.git && cd solivio && yarn setup",
    offerNav: ["Zapytania", "Katalog", "Oferty", "Klienci", "Asystent"],
    offerTitle: "Szkic oferty 2026-0607-001",
    offerMeta: "ACME Automation - 18 pozycji - Do sprawdzenia",
    offerStatus: "Szkic",
    offerTableHeaders: ["Pozycja", "Ilość", "Suma"],
    offerRows: [
      ["Silnik serwo 750 W", "4", "5 000,00"],
      ["Przekładnia planetarna 10:1", "4", "2 480,00"],
      ["Sterownik napędu 3 kW", "4", "4 320,00"],
      ["Rezystor hamujący 200 W", "4", "440,00"],
    ],
    offerActions: ["Edytuj", "Zaakceptuj i wygeneruj PDF"],
  },
  heroPreview: {
    productSignals: [
      { label: "Pozycji w szkicu", value: "4" },
      { label: "Etap", value: "Szkic" },
      { label: "Wynik", value: "PDF" },
    ],
    rail: [
      {
        title: "Kod open source",
        body: "MIT, lokalne uruchomienie i kod do przejrzenia.",
      },
      {
        title: "Samodzielny hosting",
        body: "Docker, Postgres i brak vendor lock-in.",
      },
      {
        title: "Dla złożonych procesów",
        body: "Wielopozycyjne zapytania i duże katalogi.",
      },
      {
        title: "Dla deweloperów",
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
    title: "Zbudowane na stacku, który już znasz",
    items: ["Next.js", "TypeScript", "Postgres", "Drizzle ORM", "Tailwind v4", "shadcn/ui"],
  },
  metrics: {
    items: [
      { value: "MIT", label: "Licencja open-source" },
      { value: "6", label: "Wbudowanych modułów" },
      { value: "On-prem", label: "Opcja wdrożenia" },
      { value: "Dowolne AI", label: "Strategia dostawcy" },
    ],
  },
  what: {
    title: "Od zapytania do szkicu oferty",
    body: "Solivio pomaga firmom zamieniać złożone, wielopozycyjne zapytania i rozproszony kontekst sprzedażowy w uporządkowane oferty. Rdzeń procesu jest celowo wąski, przejrzysty i rozszerzalny.",
    items: [
      {
        title: "Przyjęcie zapytania",
        body: "Zbieraj surowe zapytania z e-maili, wklejonego tekstu, CSV albo importerów specyficznych dla wdrożenia.",
      },
      {
        title: "Ekstrakcja",
        body: "System wyciąga pozycje, ilości, parametry, niejasności i ślad źródeł.",
      },
      {
        title: "Dopasowanie produktów",
        body: "Przeszukuj katalog po SKU, tekście, regułach i podobieństwie semantycznym, gdy embeddingi są włączone.",
      },
      {
        title: "Szkic oferty",
        body: "Powstaje szkic z pozycjami, notatkami, niedopasowanymi fragmentami i możliwością wygenerowania PDF.",
      },
      {
        title: "Weryfikacja przez handlowca",
        body: "Zespół poprawia produkty, ilości, rabaty i status akceptacji zanim cokolwiek wyjdzie do klienta.",
      },
    ],
  },
  capabilities: {
    title: "Warstwa sprzedaży dla istniejących systemów",
    body: "Solivio nie wymaga wymiany CRM, ERP, e-commerce, katalogów, dokumentów ani narzędzi raportowych. Porządkuje dane sprzedażowe z tych źródeł w jednym miejscu, przygotowuje szkic i przekazuje zaakceptowany rezultat tam, gdzie zespół już pracuje.",
    items: [
      {
        title: "Przyjmowanie źródeł",
        body: "Zacznij od e-maili, wklejonego tekstu, CSV, dokumentów albo importerów specyficznych dla wdrożenia.",
      },
      {
        title: "Kontekst z istniejących systemów",
        body: "Wprowadź do procesu katalog, klientów, ceny, stany magazynowe, umowy, CRM, ERP, e-commerce i polityki sprzedaży.",
      },
      {
        title: "Wybór dostawcy AI",
        body: "Użyj dostawcy AI pasującego do wdrożenia albo podłącz lokalne endpointy modeli do ekstrakcji i funkcji asystenta.",
      },
      {
        title: "Opcja w pełni on-prem",
        body: "Uruchom Solivio z lokalnymi modelami AI i samodzielnie hostowaną infrastrukturą, gdy dane nie mogą opuszczać firmy.",
      },
      {
        title: "Weryfikacja przez sprzedaż",
        body: "Handlowiec zachowuje kontrolę nad produktami, ilościami, rabatami, marżą i akceptacją.",
      },
      {
        title: "Rozszerzalne przekazanie danych",
        body: "Dodawaj moduły dla importerów, narzędzi agentów, stron, API, zadań, zdarzeń, slotów UI i dalszych integracji.",
      },
    ],
    link: { href: "/guides/features/", label: "Zobacz opis funkcji" },
  },
  workflow: {
    title: "Jak to działa",
    body: "Rdzeń procesu jest celowo wąski: przejście od danych od klienta do ustrukturyzowanego szkicu oferty z człowiekiem w pętli.",
    steps: [
      {
        title: "Zapytanie klienta",
        body: "Mail, arkusz albo dokument opisuje, czego potrzebuje klient.",
      },
      {
        title: "Ekstrakcja",
        body: "Solivio wyciąga produkty, ilości, wymagania i ograniczenia.",
      },
      {
        title: "Dopasowanie katalogu",
        body: "System znajduje kandydatów i oznacza wybory wymagające decyzji.",
      },
      {
        title: "Szkic oferty",
        body: "Powstaje szkic z cenami i notatkami tam, gdzie konfiguracja to umożliwia.",
      },
      {
        title: "Weryfikacja i akceptacja",
        body: "Handlowiec edytuje, waliduje, akceptuje albo cofa do kolejnego przebiegu.",
      },
      {
        title: "Zaakceptowane wyjście",
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
    title: "Architektura pod rozszerzenia, nie pod lock-in",
    body: "Solivio to modułowy monolit wdrażany dla jednego klienta. Rdzeń koncentruje się na procesie od zapytania do szkicu oferty, a moduły kompilowane podczas budowania łączą źródła, reguły, endpointy AI i miejsca docelowe właściwe dla danego wdrożenia.",
    link: { href: "/guides/modules/", label: "Poznaj moduły" },
    blocks: [
      {
        title: "Istniejące systemy",
        body: "CRM, ERP, e-commerce, skrzynki, arkusze, PDF-y, katalogi produktowe i wewnętrzne API zasilają Solivio danymi.",
      },
      {
        title: "Miejsce pracy Solivio",
        body: "Przyjęcie zapytania, ekstrakcja, dopasowanie katalogu, szkic oferty, weryfikacja, akceptacja i PDF działają w jednym miejscu.",
      },
      {
        title: "Moduły rozszerzeń",
        body: "Typowane strony, API, usługi, zdarzenia, importery, zadania, narzędzia agentów i sloty UI dopasowują Solivio do firmy.",
      },
      {
        title: "Granica wdrożenia",
        body: "Wybierz dostawców AI w chmurze, lokalne endpointy modeli albo pełne on-prem, aby granice danych pasowały do polityki firmy.",
      },
    ],
    note: "Wdrożenie dla jednego klienta - niezależność od dostawcy AI - moduły kompilowane podczas budowania - brak importów między modułami podczas działania",
  },
  architectureDiagram: {
    sourceSystems: ["CRM", "ERP", "E-commerce", "E-mail", "Excel", "PDF", "Wewnętrzne API"],
    solivioPipeline: ["Przyjęcie", "Ekstrakcja", "Dopasowanie", "Szkic", "Weryfikacja"],
    salesTeam: {
      title: "Zespół sprzedaży",
      body: "Handlowcy weryfikują, edytują i akceptują ofertę przed PDF-em lub przekazaniem wyniku do istniejących narzędzi.",
      actions: ["Weryfikacja", "Edycja", "Akceptacja", "PDF", "CRM", "ERP"],
    },
  },
  modules: {
    title: "Co mogą dodać moduły",
    body: "Moduły to pakiety źródłowe, które rozszerzają aplikację o typowane strony, API, usługi, zadania i integracje bez importów między modułami podczas działania aplikacji.",
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
        title: "Możliwości importerów",
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
    title: "Ścieżka operatora",
    body: "Od lokalnego uruchomienia do wdrożenia dla jednego klienta - dokumentacja prowadzi po kolei.",
    items: [
      {
        title: "Uruchom lokalnie",
        body: "`yarn setup` uruchamia Postgres, generuje połączenia modułów i wykonuje migracje.",
      },
      {
        title: "Konfiguracja ze źródeł",
        body: "Klon repozytorium, instalacja przez Yarn, kopia `.env.example`, potem aplikacja Next.js.",
      },
      {
        title: "Ścieżka integracji",
        body: "Domyślna ewaluacja działa lokalnie; integracje z CRM, ERP, e-commerce i innymi narzędziami dodaje się jako moduły wdrożeniowe.",
      },
      {
        title: "Granica AI",
        body: "Użyj poświadczeń wybranego dostawcy albo lokalnych endpointów modeli do ekstrakcji, dopasowania i funkcji asystenta.",
      },
      {
        title: "Budowanie i wdrożenie",
        body: "Obraz produkcyjny i przewodnik wdrożeniowy obsługują instalację VPS.",
      },
      {
        title: "Dokumentacja i API",
        body: "Konfiguracja, moduły, rozszerzanie, wdrożenie i wygenerowana referencja OpenAPI są dostępne w dokumentacji.",
      },
    ],
  },
  why: {
    title: "Dlaczego to istnieje",
    body: "W wielu firmach B2B najtrudniejszy nie jest końcowy szablon oferty. Najtrudniejszy bywa początek procesu: zapytania przychodzą zanim czyste dane trafią do CRM, ERP, e-commerce albo narzędzi, których zespół już używa. Solivio porządkuje właśnie ten etap.",
    items: [
      {
        title: "Dystrybutorzy techniczni",
        body: "Najlepsze dopasowanie: tysiące SKU i wielopozycyjne zapytania.",
      },
      {
        title: "Rozproszone dane",
        body: "Katalog, ERP, CRM, Excel, cenniki, PDF-y i wiedza seniorów rzadko działają jak jeden system.",
      },
      {
        title: "Weryfikacja zamiast autonomii",
        body: "Solivio przygotowuje szkic; handlowiec decyduje, co jest poprawne i co wychodzi do klienta.",
      },
    ],
  },
  finalCta: {
    developerTitle: "Deweloper / operator?",
    developerBody:
      "Uruchom Solivio lokalnie w kilka minut, przeczytaj przewodniki po modułach i sprawdź każdą warstwę kodu przed decyzją.",
    developerPrimary: { href: "/guides/getting-started/", label: "Uruchom lokalnie" },
    developerSecondary: { href: githubUrl, label: "Zobacz GitHub", external: true },
    businessTitle: "Biznes / wdrożenie?",
    businessBody:
      "Weź jedno reprezentatywne zapytanie ofertowe i sprawdź, czy proces od zapytania do szkicu oferty pasuje do obecnego sposobu ofertowania.",
    businessPrimary: {
      href: deraveReferralUrl("pl", "final_business_cta"),
      label: "Odwiedź Derave",
      external: true,
    },
  },
  footer: {
    tagline: "Open-source system od zapytania do szkicu oferty dla technicznych zespołów B2B.",
    product: "Produkt",
    resources: "Zasoby",
    community: "Społeczność",
  },
} satisfies LandingContent;
