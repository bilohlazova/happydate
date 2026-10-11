import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export default {};", shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const base = resolve(process.cwd(), "src", specifier.slice(2));
      const path = [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? base;
      return { url: pathToFileURL(path).href, shortCircuit: true };
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
      const base = resolve(fileURLToPath(new URL(".", context.parentURL)), specifier);
      const path = [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
      if (path) return { url: pathToFileURL(path).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
