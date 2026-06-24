export type LandingLocale = "en" | "pl";

type Link = {
  href: string;
  label: string;
  external?: boolean;
};

type SectionItem = {
  title: string;
  body: string;
};

type WorkflowStep = {
  title: string;
  body: string;
};

export type LandingContent = {
  locale: LandingLocale;
  lang: string;
  path: string;
  alternatePath: string;
  alternateLabel: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  nav: {
    product: string;
    architecture: string;
    docs: string;
  };
  hero: {
    h1: string;
    h1Highlight: string;
    body: string;
    facts: string[];
    primary: Link;
    secondary: Link;
    quickStart: string;
    offerNav: string[];
    offerTitle: string;
    offerMeta: string;
    offerStatus: string;
    offerTableHeaders: string[];
    offerRows: string[][];
    offerActions: string[];
  };
  stack: {
    title: string;
    items: string[];
  };
  metrics: {
    items: { value: string; label: string }[];
  };
  what: {
    title: string;
    body: string;
    items: SectionItem[];
  };
  capabilities: {
    title: string;
    body: string;
    items: SectionItem[];
    link: Link;
  };
  workflow: {
    title: string;
    body: string;
    steps: WorkflowStep[];
  };
  architecture: {
    title: string;
    body: string;
    link: Link;
    blocks: SectionItem[];
    note: string;
  };
  modules: {
    title: string;
    body: string;
    link: Link;
    items: SectionItem[];
  };
  operator: {
    title: string;
    body: string;
    items: SectionItem[];
  };
  why: {
    title: string;
    body: string;
    items: SectionItem[];
  };
  finalCta: {
    developerTitle: string;
    developerBody: string;
    developerPrimary: Link;
    developerSecondary: Link;
    businessTitle: string;
    businessBody: string;
    businessPrimary: Link;
  };
  footer: {
    tagline: string;
    product: string;
    resources: string;
    community: string;
  };
};

export const siteOrigin = "https://solivio.ai";
export const githubUrl = "https://github.com/solivio-ai/solivio";
export const deraveUrl = "https://derave.dev";
export const deraveReferralUrl = (locale: LandingLocale, placement: string) => {
  const url = new URL(deraveUrl);

  url.searchParams.set("utm_source", "solivio.ai");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "solivio_landing");
  url.searchParams.set("utm_content", `${locale}_${placement}`);

  return url.toString();
};

export const landingPages: Record<LandingLocale, LandingContent> = {
  en: {
    locale: "en",
    lang: "en",
    path: "/",
    alternatePath: "/pl/",
    alternateLabel: "PL",
    title: "Solivio - Open-source AI quoting system for B2B sales",
    description:
      "Solivio is an open-source, self-hosted AI quoting system that turns raw B2B requests, catalogs, and customer data into draft offers.",
    ogTitle: "Solivio - Open-source inquiry-to-draft-quote system",
    ogDescription:
      "Run Solivio locally or on-prem. Connect CRM, ERP, ecommerce, catalogs, and documents into one sales review flow.",
    nav: {
      product: "Product",
      architecture: "Architecture",
      docs: "Docs",
    },
    hero: {
      h1: "From raw B2B inquiry to",
      h1Highlight: "draft quote",
      body: "Solivio is an open-source, self-hosted quoting system for B2B teams. It connects CRM, ERP, ecommerce, catalogs, inboxes, spreadsheets, and documents, then turns that context into draft offers for review. Use hosted AI providers or local model endpoints depending on the deployment.",
      facts: [
        "MIT licensed - clone and run",
        "Run cloud AI or local models on-prem",
        "Extend with modules for your existing systems",
      ],
      primary: { href: "/guides/getting-started/", label: "Start setup" },
      secondary: { href: githubUrl, label: "View GitHub", external: true },
      quickStart: "git clone https://github.com/solivio-ai/solivio.git && cd solivio && yarn setup",
      offerNav: ["Inquiries", "Catalog", "Offers", "Customers", "Assistant"],
      offerTitle: "Draft offer 2026-0607-001",
      offerMeta: "ACME Automation - 18 items - Review",
      offerStatus: "Draft",
      offerTableHeaders: ["Item", "Qty", "Total"],
      offerRows: [
        ["Servo motor 750W", "4", "5,000.00"],
        ["Planetary gearbox 10:1", "4", "2,480.00"],
        ["Drive controller 3kW", "4", "4,320.00"],
        ["Brake resistor 200W", "4", "440.00"],
      ],
      offerActions: ["Edit", "Approve & generate PDF"],
    },
    stack: {
      title: "Built with a stack you already know",
      items: [
        "Next.js",
        "TypeScript",
        "Postgres",
        "Drizzle ORM",
        "Tailwind v4",
        "shadcn/ui",
        "Astro",
      ],
    },
    metrics: {
      items: [
        { value: "MIT", label: "Open-source license" },
        { value: "6", label: "Built-in modules" },
        { value: "On-prem", label: "Deployment option" },
        { value: "Any AI", label: "Provider strategy" },
      ],
    },
    what: {
      title: "From inquiry to draft quote",
      body: "Solivio helps companies turn complex, multi-line inquiries and scattered sales context into structured offers. The core workflow is narrow, inspectable, and extendable.",
      items: [
        {
          title: "Request intake",
          body: "Collect raw requests from email, pasted text, CSV, or implementation-specific importers.",
        },
        {
          title: "Extraction",
          body: "Extract requested lines, quantities, parameters, ambiguities, and source evidence.",
        },
        {
          title: "Product matching",
          body: "Search the catalog by SKU, text, rules, and semantic similarity when embeddings are enabled.",
        },
        {
          title: "Draft quote",
          body: "Create a draft with line items, notes, unmatched fragments, and PDF output.",
        },
        {
          title: "Human review",
          body: "Salespeople edit quantities, products, discounts, and acceptance state before anything leaves.",
        },
      ],
    },
    capabilities: {
      title: "A sales layer for your existing systems",
      body: "Solivio does not replace CRM, ERP, ecommerce, catalog, document, or reporting tools. It gathers sales context from those systems, prepares the draft, and returns accepted output through implementation modules.",
      items: [
        {
          title: "Source intake",
          body: "Start from email, pasted text, CSV, documents, or implementation-specific importers.",
        },
        {
          title: "Existing-system context",
          body: "Bring catalog, customer, pricing, stock, contract, CRM, ERP, ecommerce, and policy data into the sales workflow.",
        },
        {
          title: "AI provider choice",
          body: "Use the AI provider that fits your deployment, or connect local model endpoints for extraction and assistant features.",
        },
        {
          title: "Fully on-prem option",
          body: "Run Solivio with local AI models and self-hosted infrastructure when company policy requires no data to leave.",
        },
        {
          title: "Sales review",
          body: "Keep the salesperson in control of products, quantities, discounts, margins, and approvals.",
        },
        {
          title: "Extensible handoff",
          body: "Add modules for importers, agent tools, pages, APIs, jobs, events, UI slots, and downstream handoffs.",
        },
      ],
      link: { href: "/guides/features/", label: "See the feature walkthrough" },
    },
    workflow: {
      title: "How it works",
      body: "The core workflow is intentionally narrow: get from customer input to a structured quote draft with a salesperson in the loop.",
      steps: [
        {
          title: "Customer inquiry",
          body: "A message, spreadsheet, or document describes what the customer needs.",
        },
        {
          title: "Extraction",
          body: "Solivio extracts products, quantities, requirements, and constraints.",
        },
        {
          title: "Catalog matching",
          body: "The system finds candidate products and flags uncertain choices.",
        },
        {
          title: "Draft quote",
          body: "A quote draft is generated with pricing and notes where configured.",
        },
        {
          title: "Review & approval",
          body: "The salesperson edits, validates, accepts, or sends it back for another pass.",
        },
        {
          title: "Accepted output",
          body: "Accepted offers can become PDFs or move into ERP, CRM, ecommerce, and other implementation-specific destinations.",
        },
      ],
    },
    architecture: {
      title: "Architecture for extension, not lock-in",
      body: "Solivio is a single-tenant modular monolith. The core stays focused on inquiry-to-quote work, while build-time modules connect the sources, rules, AI endpoints, and destinations that belong to your deployment.",
      link: { href: "/guides/modules/", label: "Explore modules" },
      blocks: [
        {
          title: "Existing systems",
          body: "CRM, ERP, ecommerce, inboxes, spreadsheets, PDFs, product catalogs, and internal APIs feed Solivio.",
        },
        {
          title: "Solivio app",
          body: "Intake, extraction, catalog matching, draft offers, review, acceptance, and PDF output live in one app.",
        },
        {
          title: "Extension modules",
          body: "Typed pages, API routes, services, events, importers, jobs, agent tools, and UI slots adapt Solivio to each company.",
        },
        {
          title: "Deployment boundary",
          body: "Choose managed AI providers, local model endpoints, or fully on-prem operation so data boundaries match company policy.",
        },
      ],
      note: "Single-tenant per deployment - AI provider agnostic - modules compiled at build time - no runtime module imports",
    },
    modules: {
      title: "Module surfaces",
      body: "Modules are source packages that contribute typed pieces of the application without importing each other at runtime.",
      link: { href: "/guides/extending/", label: "Read the extending guide" },
      items: [
        { title: "Pages", body: "UI pages mounted into the generated app shell." },
        { title: "API routes", body: "HTTP endpoints under the generated app-router tree." },
        {
          title: "Services & events",
          body: "Business logic and typed cross-module observer events.",
        },
        { title: "Jobs", body: "Background jobs and optional cron schedules." },
        {
          title: "Importer capabilities",
          body: "Normalize raw source data before owning modules persist it.",
        },
        { title: "Agent tools", body: "Tools consumed by offer generation and assistant agents." },
        {
          title: "i18n, nav & slots",
          body: "Translations, sidebar entries, and UI injection points.",
        },
      ],
    },
    operator: {
      title: "Operator path",
      body: "From laptop evaluation to a single-tenant deployment, the docs keep the path explicit.",
      items: [
        {
          title: "Run locally",
          body: "Use `yarn setup` to start Postgres, generate wiring, and run migrations.",
        },
        {
          title: "Source setup",
          body: "Clone, install with Yarn, copy `.env.example`, then run the Next.js app.",
        },
        {
          title: "Integration path",
          body: "The default evaluation path is local-first; CRM, ERP, ecommerce, and other integrations are added as deployment modules.",
        },
        {
          title: "AI boundary",
          body: "Use managed provider credentials or local model endpoints for extraction, matching, and assistant capabilities.",
        },
        {
          title: "Build & deploy",
          body: "Use the production image and deployment guide for a VPS-style install.",
        },
        {
          title: "Docs & API",
          body: "Setup, modules, extending, deployment, and generated OpenAPI reference are included.",
        },
      ],
    },
    why: {
      title: "Why it exists",
      body: "The hard part in many B2B teams is not the final quote template. It is the intake step: raw requests arrive before clean data reaches CRM, ERP, ecommerce, or the tools the team already uses. Solivio focuses on that stage.",
      items: [
        {
          title: "Technical distributors",
          body: "Best fit for teams with thousands of SKUs and multi-line requests.",
        },
        {
          title: "Fragmented data",
          body: "Catalogs, ERP, CRM, Excel, price lists, PDFs, and senior knowledge rarely act as one system.",
        },
        {
          title: "Review over autonomy",
          body: "Solivio prepares a draft; salespeople decide what is correct and what leaves the company.",
        },
      ],
    },
    finalCta: {
      developerTitle: "Developer / operator?",
      developerBody:
        "Run Solivio locally in minutes, read the module guides, and inspect every layer of the source before deciding whether it fits your team.",
      developerPrimary: { href: "/guides/getting-started/", label: "Run Solivio locally" },
      developerSecondary: { href: githubUrl, label: "View GitHub", external: true },
      businessTitle: "Business / implementation?",
      businessBody: "Use one real RFQ to check whether Solivio fits your current quoting process.",
      businessPrimary: {
        href: deraveReferralUrl("en", "final_business_cta"),
        label: "Visit Derave",
        external: true,
      },
    },
    footer: {
      tagline: "Open-source inquiry-to-draft-quote system for technical B2B teams.",
      product: "Product",
      resources: "Resources",
      community: "Community",
    },
  },
  pl: {
    locale: "pl",
    lang: "pl",
    path: "/pl/",
    alternatePath: "/",
    alternateLabel: "EN",
    title: "Solivio - open-source system AI do ofert B2B",
    description:
      "Solivio to open-source'owy, samodzielnie hostowany system AI, który zamienia surowe zapytania B2B, katalogi i dane klientów w szkice ofert.",
    ogTitle: "Solivio - open-source system od zapytania do szkicu oferty",
    ogDescription:
      "Uruchom Solivio lokalnie albo w pełni on-prem. Połącz CRM, ERP, e-commerce, katalogi i dokumenty w jednym procesie przeglądu ofert.",
    nav: {
      product: "Produkt",
      architecture: "Architektura",
      docs: "Dokumentacja",
    },
    hero: {
      h1: "Od surowego zapytania B2B do",
      h1Highlight: "szkicu oferty",
      body: "Solivio to open-source'owy, samodzielnie hostowany system do szkiców ofert B2B. Łączy CRM, ERP, e-commerce, katalogi, skrzynki, arkusze i dokumenty, a potem zamienia ten kontekst w szkice ofert do sprawdzenia. Możesz użyć dostawcy AI w chmurze albo lokalnych modeli.",
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
        ["Servo motor 750W", "4", "5 000,00"],
        ["Planetary gearbox 10:1", "4", "2 480,00"],
        ["Drive controller 3kW", "4", "4 320,00"],
        ["Brake resistor 200W", "4", "440,00"],
      ],
      offerActions: ["Edytuj", "Zaakceptuj i wygeneruj PDF"],
    },
    stack: {
      title: "Zbudowane na stacku, który już znasz",
      items: [
        "Next.js",
        "TypeScript",
        "Postgres",
        "Drizzle ORM",
        "Tailwind v4",
        "shadcn/ui",
        "Astro",
      ],
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
  },
};
