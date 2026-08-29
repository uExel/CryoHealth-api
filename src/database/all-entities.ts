/**
 * Every entity, in one place — purely because TypeORM's DataSource needs a single flat
 * array (used by both the migration CLI and DatabaseModule). Physical ownership is still
 * per-module: entities live inside the feature module that owns them (lakes/, users/)
 * once that module exists. Entities still under database/entities/ belong to features not
 * built yet — see ARCHITECTURE.md "Directory structure" and docs/ai/decisions/0001 for the
 * rule, and the PRD tracking map for which task builds each one.
 */
import { Lake } from '../lakes/entities/lake.entity';
import { Observation } from '../lakes/entities/observation.entity';
import { User } from '../users/entities/user.entity';
import { HazardScore } from '../alerts/entities/hazard-score.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { Facility } from './entities/facility.entity';
import { ChwCase } from '../cases/entities/chw-case.entity';
import { SyncLog } from './entities/sync-log.entity';
import { District } from '../districts/entities/district.entity';
import { Glacier } from '../glaciers/entities/glacier.entity';
import { GlacierObservation } from '../glaciers/entities/glacier-observation.entity';
import { Protocol } from '../protocols/entities/protocol.entity';
import { ChwProfile } from '../chw-profiles/entities/chw-profile.entity';

export const entities = [
  Lake,
  Observation,
  HazardScore,
  Alert,
  Facility,
  User,
  ChwCase,
  SyncLog,
  AuditEntry,
  District,
  Glacier,
  GlacierObservation,
  Protocol,
  ChwProfile,
];
