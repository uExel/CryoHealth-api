# LEARNINGS

Team-shared lessons, maintained by /uexel:learn via uexel-scribe. Dated one-liners with
the why. Only lessons a teammate benefits from — personal notes belong to auto-memory.

- 2026-08-09: this repo's production Docker container crash-looped on its first-ever
  real run with `Error: Cannot find module '/app/dist/main.js'`. Root cause:
  `tsconfig.build.json` excluded `node_modules`, `test`, `dist`, `**/*spec.ts` — but not
  `scripts/`. With both `src/**/*.ts` and `scripts/**/*.ts` swept into the nest build and
  no explicit `rootDir` set, TypeScript inferred the common-ancestor rootDir as the
  project root itself, nesting compiled output under `dist/src/main.js` instead of the
  expected flat `dist/main.js`. The pre-existing `package.json` `start:prod` script
  (`node dist/main`) and the Dockerfile's `CMD ["node", "dist/main.js"]` both assumed the
  flat path and had silently always been broken — CI only ran `nest build` to check it
  compiles, and jest runs against source via ts-jest, so nothing had ever booted the app
  from its built artifact before. Fixed by adding `"scripts"` to tsconfig.build.json's
  exclude array — scripts/ is run via ts-node at the source level and was never meant to
  be part of the nest build output. When files outside `src/` (a `scripts/` dir, extra
  top-level dirs) get swept into compilation with no explicit `rootDir`, the build output
  structure can silently shift — don't trust `dist/main.js` exists just because
  `nest build` exits 0; test-boot the built artifact (`node dist/main.js` or a container
  run) at least once to confirm the entrypoint path is real.
