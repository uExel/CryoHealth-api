"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entities = void 0;
const lake_entity_1 = require("../lakes/entities/lake.entity");
const observation_entity_1 = require("../lakes/entities/observation.entity");
const user_entity_1 = require("../users/entities/user.entity");
const hazard_score_entity_1 = require("./entities/hazard-score.entity");
const alert_entity_1 = require("./entities/alert.entity");
const facility_entity_1 = require("./entities/facility.entity");
const chw_case_entity_1 = require("./entities/chw-case.entity");
const sync_log_entity_1 = require("./entities/sync-log.entity");
const audit_entry_entity_1 = require("./entities/audit-entry.entity");
exports.entities = [
    lake_entity_1.Lake,
    observation_entity_1.Observation,
    hazard_score_entity_1.HazardScore,
    alert_entity_1.Alert,
    facility_entity_1.Facility,
    user_entity_1.User,
    chw_case_entity_1.ChwCase,
    sync_log_entity_1.SyncLog,
    audit_entry_entity_1.AuditEntry,
];
//# sourceMappingURL=all-entities.js.map