"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HazardScore = void 0;
const typeorm_1 = require("typeorm");
const lake_entity_1 = require("../../lakes/entities/lake.entity");
let HazardScore = class HazardScore {
    id;
    lake;
    lakeId;
    runId;
    score;
    tier;
    components;
    computedAt;
    createdAt;
};
exports.HazardScore = HazardScore;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], HazardScore.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => lake_entity_1.Lake, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'lakeId' }),
    __metadata("design:type", lake_entity_1.Lake)
], HazardScore.prototype, "lake", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], HazardScore.prototype, "lakeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], HazardScore.prototype, "runId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 8, scale: 4 }),
    __metadata("design:type", String)
], HazardScore.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['normal', 'watch', 'high', 'critical'],
        enumName: 'tier',
    }),
    __metadata("design:type", String)
], HazardScore.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], HazardScore.prototype, "components", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], HazardScore.prototype, "computedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], HazardScore.prototype, "createdAt", void 0);
exports.HazardScore = HazardScore = __decorate([
    (0, typeorm_1.Entity)('hazard_scores'),
    (0, typeorm_1.Index)(['lake', 'computedAt'])
], HazardScore);
//# sourceMappingURL=hazard-score.entity.js.map