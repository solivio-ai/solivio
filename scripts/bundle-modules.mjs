#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Bundles every module under modules/ into a self-contained ESM bundle at
 * modules-dist/<package-name>/index.mjs.
 *
 * Each bundle inlines its dependencies (including @solivio/sdk) so it can be
 * loaded by the core at runtime from outside the app's node_modules — by file
 * URL, with no app rebuild. This is the artifact an operator drops into
 * SOLIVIO_MODULES_DIR.
 *
 * Requires the SDK to be built first (esbuild resolves @solivio/sdk → sdk/dist).
 * Adding a module needs no change here and no Dockerfile edit.
 */
import { build } from "esbuild";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = path.join(root, "modules");
const outRoot = path.join(root, "modules-dist");

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

const dirs = readdirSync(modulesDir, { withFileTypes: true }).filter((e) => e.isDirectory());

const MODULE_UI_RUNTIME_VERSION = 1;

const moduleUiRuntimePlugin = {
  name: "solivio-module-ui-runtime",
  setup(build) {
    build.onResolve({ filter: /^react$/ }, () => ({
      namespace: "solivio-ui-runtime",
      path: "react",
    }));
    build.onResolve({ filter: /^react-dom\/client$/ }, () => ({
      namespace: "solivio-ui-runtime",
      path: "react-dom/client",
    }));
    build.onResolve({ filter: /^react\/jsx-(dev-)?runtime$/ }, (args) => ({
      namespace: "solivio-ui-runtime",
      path: args.path,
    }));
    build.onResolve({ filter: /^react\/.+$/ }, (args) => ({
      errors: [
        {
          text: `Module UI bundles may import "react" and "react/jsx-runtime" only, not "${args.path}".`,
        },
      ],
    }));
    build.onResolve({ filter: /^react-dom(\/.*)?$/ }, (args) => ({
      errors: [
        {
          text: `Module UI bundles may import "react-dom/client" only, not "${args.path}".`,
        },
      ],
    }));

    build.onLoad({ filter: /^react$/, namespace: "solivio-ui-runtime" }, () => ({
      contents: sharedReactShim(),
      loader: "js",
    }));
    build.onLoad({ filter: /^react-dom\/client$/, namespace: "solivio-ui-runtime" }, () => ({
      contents: sharedReactDomClientShim(),
      loader: "js",
    }));
    build.onLoad(
      { filter: /^react\/jsx-(dev-)?runtime$/, namespace: "solivio-ui-runtime" },
      () => ({
        contents: sharedJsxRuntimeShim(),
        loader: "js",
      }),
    );
  },
};

function runtimeGuard(member) {
  return `const runtime = globalThis.__SOLIVIO_MODULE_RUNTIME__;
if (!runtime || runtime.contractVersion !== ${MODULE_UI_RUNTIME_VERSION}) {
  throw new Error("Solivio module UI shared runtime is missing or incompatible.");
}
const ${member} = runtime.${member};`;
}

function sharedReactShim() {
  return `${runtimeGuard("react")}
export default react;
export const Children = react.Children;
export const Component = react.Component;
export const Fragment = react.Fragment;
export const Profiler = react.Profiler;
export const PureComponent = react.PureComponent;
export const StrictMode = react.StrictMode;
export const Suspense = react.Suspense;
export const cache = react.cache;
export const cloneElement = react.cloneElement;
export const createContext = react.createContext;
export const createElement = react.createElement;
export const createRef = react.createRef;
export const forwardRef = react.forwardRef;
export const isValidElement = react.isValidElement;
export const lazy = react.lazy;
export const memo = react.memo;
export const startTransition = react.startTransition;
export const use = react.use;
export const useActionState = react.useActionState;
export const useCallback = react.useCallback;
export const useContext = react.useContext;
export const useDebugValue = react.useDebugValue;
export const useDeferredValue = react.useDeferredValue;
export const useEffect = react.useEffect;
export const useId = react.useId;
export const useImperativeHandle = react.useImperativeHandle;
export const useInsertionEffect = react.useInsertionEffect;
export const useLayoutEffect = react.useLayoutEffect;
export const useMemo = react.useMemo;
export const useOptimistic = react.useOptimistic;
export const useReducer = react.useReducer;
export const useRef = react.useRef;
export const useState = react.useState;
export const useSyncExternalStore = react.useSyncExternalStore;
export const useTransition = react.useTransition;
export const version = react.version;`;
}

function sharedReactDomClientShim() {
  return `${runtimeGuard("reactDomClient")}
export default reactDomClient;
export const createRoot = reactDomClient.createRoot;
export const hydrateRoot = reactDomClient.hydrateRoot;`;
}

function sharedJsxRuntimeShim() {
  return `${runtimeGuard("jsxRuntime")}
export const Fragment = jsxRuntime.Fragment;
export const jsx = jsxRuntime.jsx;
export const jsxs = jsxRuntime.jsxs;
export const jsxDEV = jsxRuntime.jsxDEV ?? jsxRuntime.jsx;`;
}

let count = 0;
for (const dir of dirs) {
  const pkgPath = path.join(modulesDir, dir.name, "package.json");
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    continue; // not a package
  }
  const entry = path.join(modulesDir, dir.name, "src", "index.ts");
  const outDir = path.join(outRoot, pkg.name);
  const outfile = path.join(outDir, "index.mjs");

  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node24",
    logLevel: "warning",
  });

  const uiDir = path.join(modulesDir, dir.name, "src", "ui");
  if (existsSync(uiDir)) {
    for (const uiEntry of readdirSync(uiDir, { withFileTypes: true }).filter((e) => e.isFile())) {
      if (!/\.(tsx?|jsx?)$/.test(uiEntry.name)) continue;
      const input = path.join(uiDir, uiEntry.name);
      const outputName = `${uiEntry.name.replace(/\.(tsx?|jsx?)$/, "")}.mjs`;
      const uiOutfile = path.join(outDir, "ui", outputName);

      await build({
        entryPoints: [input],
        outfile: uiOutfile,
        bundle: true,
        format: "esm",
        platform: "browser",
        target: "es2022",
        jsx: "automatic",
        define: {
          "process.env.NODE_ENV": '"production"',
        },
        plugins: [moduleUiRuntimePlugin],
        logLevel: "warning",
      });
    }
  }

  // A minimal manifest so the dir is a resolvable package if ever imported by name.
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, "package.json"),
    `${JSON.stringify({ name: pkg.name, version: pkg.version, type: "module", main: "index.mjs" }, null, 2)}\n`,
  );

  console.log(`bundled ${pkg.name} → modules-dist/${pkg.name}/index.mjs`);
  count++;
}

console.log(`\n${count} module bundle(s) written to modules-dist/`);
