import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The 3D layer uses react-three-fiber's imperative escape hatches by design:
    // per-frame InstancedMesh matrix/colour updates, texture configuration, and
    // mutating typed-array state inside useFrame. The experimental React Compiler
    // immutability rule doesn't model these, so we scope it off here only.
    files: ["src/components/globe/**/*.tsx"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
