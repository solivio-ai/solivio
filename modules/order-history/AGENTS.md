# order-history module

Headless capability module: contributes the `recall_order_history` agent tool
to the chat and offer-generation agents. The tool reads the customer in scope
from the injected AgentToolContext and fetches past offers through
`getService("offers").recentOffersForCustomer` — no own tables, routes, or UI.
