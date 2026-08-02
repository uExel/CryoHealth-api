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
exports.Observation = void 0;
const typeorm_1 = require("typeorm");
const lake_entity_1 = require("./lake.entity");
let Observation = class Observation {
    id;
    lake;
    lakeId;
    capturedAt;
    source;
    areaKm2;
    cloudFraction;
    sceneId;
    runId;
    createdAt;
};
exports.Observation = Observation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Observation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => lake_entity_1.Lake, (l) => l.observations, {
        nullable: false,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'lakeId' }),
    __metadata("design:type", lake_entity_1.Lake)
], Observation.prototype, "lake", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Observation.prototype, "lakeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Observation.prototype, "capturedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'sentinel2' }),
    __metadata("design:type", String)
], Observation.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 12, scale: 6 }),
    __metadata("design:type", String)
], Observation.prototype, "areaKm2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 5, scale: 4, nullable: true }),
    __metadata("design:type", String)
], Observation.prototype, "cloudFraction", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Observation.prototype, "sceneId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Observation.prototype, "runId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Observation.prototype, "createdAt", void 0);
exports.Observation = Observation = __decorate([
    (0, typeorm_1.Entity)('observations'),
    (0, typeorm_1.Index)(['lake', 'capturedAt'])
], Observation);
//# sourceMappingURL=observation.entity.js.map