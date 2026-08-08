# HANDOFF — CryoHealth-api — 2026-08-09 00:45 PKT

Session: hetzner-tunnel-deploy Model: claude-sonnet-5 Branch: main Goal: none Task: none (ad hoc, cross-repo deploy infra)

## State

CD pipeline (`deploy.yml`, workflow_run on green `ci`) built and secrets are in place
(`DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`). CI is green again — fixed the one real
lint error (`cases.service.spec.ts` unnecessary `any` cast) that had been blocking `ci`
for the last 3 commits, unrelated to this session's actual goal. Dockerfile now keeps
`ts-node` + TS source in the prod image so `npm run migration:run` works against exactly
the deployed image (`docker compose run --rm api npm run migration:run`, wired into
`cryohealth-infra/deploy.sh`, runs before the container restarts on every deploy).
Latest `deploy` run built and pushed the image to GHCR successfully but failed at the SSH
step: the Hetzner box (`ubuntu-4gb-hel1-1`, 204.168.190.206) can't pull the private GHCR
image (`docker pull` → `unauthorized`) — it has no `docker login ghcr.io` credential yet.
Asked the user for a GitHub PAT (`read:packages`) to fix this; awaiting reply.

## Done this session

- Dockerfile: keep ts-node+src in prod image so migrations run from the deployed image
  (8208050)
- deploy.yml: build+push to GHCR, SSH deploy, gated on ci (8208050)
- Fixed the pre-existing lint error blocking ci for 3 commits — removed a redundant `any`
  cast in cases.service.spec.ts since `CasesService.create()` already returns
  `Promise<ChwCase>` (62cbea4)
- GitHub Actions secrets set: DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY

## Not done / deferred

- Server has never successfully pulled/run this repo's image — blocked on GHCR PAT (see
  Open questions). Until then, `api` isn't actually running on the Hetzner box.
- No live verification of the migration-on-deploy step (`docker compose run --rm api npm
run migration:run`) against the production DB — can't test until the image can be pulled

## Next action

Once the user supplies a GHCR `read:packages` PAT: SSH to 204.168.190.206 as `deploy`,
`docker login ghcr.io -u <user> -p <PAT>`, then re-run the failed `deploy` workflow from
the GitHub Actions UI (Actions → deploy → latest run → Re-run jobs → Re-run failed jobs —
**must click through the confirmation modal that appears**, closing it without confirming
does nothing silently).

## Open questions for a human

- GHCR pull PAT for the deploy box — blocking: yes
- Real Copernicus CDSE credentials for geo (separate repo, but api's
  `GEO_SERVICE_API_KEY` is already live and correct on the server) — blocking: no

## Failed approaches (do not retry)

- GitHub Actions "Re-run failed jobs" from the `...`/`Re-run jobs` menu without confirming
  the modal that appears does nothing silently — always screenshot after clicking to
  confirm the "Re-run jobs" dialog actually appeared and was confirmed before assuming a
  re-run happened
- Making the `cryohealth-api`/`cryohealth-geo` GHCR packages public instead of using a PAT
  — blocked by uExel org policy ("Setting is disabled by organization administrators" on
  the package visibility toggle)

## Loops run

- none (ad hoc, no /uexel:plan → /uexel:build loop)

## Files touched

Dockerfile, .github/workflows/deploy.yml (new), src/cases/cases.service.spec.ts

## Verification status

tests: 28/28 passing (jest) lint: clean build: clean review: n/a
deploy: not yet live on the server (blocked on GHCR PAT)

## Resume with

/uexel:orient (then: check with user whether the GHCR PAT was provided, docker login on
the server, re-run the deploy workflow)
