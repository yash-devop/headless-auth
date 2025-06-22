import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entryPoints: ["src/**/*.ts"],
  clean: true,
  format: ["esm"],
  target: "es2020",
  splitting: false,
  platform: "node", // Add this to specify Node.js platform
  shims: true, // Add this to handle Node.js built-ins
  external: [
    "@prisma/client",
    "./node_modules/@prisma/client",
    "./prismaGenerated",
    "events",
    "fs",
    "path",
    "crypto",
  ],
  ...options,
}));
