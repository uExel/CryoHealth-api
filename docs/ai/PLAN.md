# PLAN — CryoHealth-api#8: alerts engine
Goal: #2 (G2 milestone) · Task: #8 · Loop budget: 3 · Rollback: revert PR; migration reversible

Steps (one atomic commit each, verification per step):
1. Schema: alerts/entities/ (promote Alert+HazardScore out of database/entities/, first
   real consumer per ADR 0001); drop Alert.dedupeKey column, add a partial unique index
   ("lakeId","tier") WHERE status='active' — DB-enforced dedupe, not an app-level check
   that can race between the pipeline endpoint and a concurrent manual override.
   Facility.lakeId (new, nullable FK) — "downstream of" mapping, admin-curated per PRD's
   explicit non-goal of computed flow-path modeling in the prototype.
   — verify: npm run migration:run
2. AlertsService: recordHazardScore (tier-transition detection + dedupe via
   ON CONFLICT DO NOTHING against the partial index), issueManual/override/clear (all
   require + audit a reason), recipientsFor (CHWs/facility_admins at facilities mapped
   to the lake) — verify: npm test (unit, mocked repos)
3. Notification channels: a real interface + multi-channel fan-out, ONE implementation
   (LogNotificationChannel) since no FCM/email credentials exist anywhere in this
   project. This is a documented gap, not faked delivery — swapping in real FCM/SES
   later is additive (new class, same interface), never a rewrite.
4. AlertsController: GET /alerts, /alerts/:id (public); POST /alerts, PATCH /alerts/:id
   (role-gated, reason required); POST /alerts/hazard-scores (the geo-service contract
   endpoint — role-gated with the existing JWT system for now; real service-to-service
   auth is a documented TODO, not this task's scope)
   — verify: npm test + live boot proving dedupe, routing, audit, and the feed API

Assumptions (would change the plan if wrong): "downstream" = admin-curated
Facility.lakeId, not computed flow-path (PRD non-goal P2). Push/email are a logged stub
behind a real interface, not simulated delivery claiming to have sent anything.
Blast radius: touches auth-adjacent audit/reason enforcement (verify-stage security
review applies, same as #4). GATE: Shaan's direct instruction ("build the alert
engine") + the scope choices above stated up front, not discovered mid-build.
