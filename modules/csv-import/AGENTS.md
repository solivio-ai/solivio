# csv-import module

Headless capability module: contributes the CSV importers for the `product`
and `customer` import targets (no tables, routes, or pages). The owning
modules' import routes resolve them via `getImporter(target)` from
@solivio/sdk/runtime; bindings live in `solivio.config.ts` `slots`.
