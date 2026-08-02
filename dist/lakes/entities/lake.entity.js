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
exports.Lake = void 0;
const typeorm_1 = require("typeorm");
const observation_entity_1 = require("./observation.entity");
let Lake = class Lake {
    id;
    name;
    nameUr;
    valley;
    district;
    damType;
    glacierContact;
    icimodId;
    geom;
    boundary;
    elevationM;
    historicalGlof;
    currentTier;
    stale;
    observations;
    createdAt;
    updatedAt;
};
exports.Lake = Lake;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Lake.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Lake.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Lake.prototype, "nameUr", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Lake.prototype, "valley", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Lake.prototype, "district", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['moraine', 'bedrock', 'ice', 'unknown'],
        enumName: 'dam_type',
        default: 'unknown',
    }),
    __metadata("design:type", String)
], Lake.prototype, "damType", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Lake.prototype, "glacierContact", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true }),
    __metadata("design:type", String)
], Lake.prototype, "icimodId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 }),
    __metadata("design:type", Object)
], Lake.prototype, "geom", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'geometry',
        spatialFeatureType: 'Polygon',
        srid: 4326,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Lake.prototype, "boundary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Lake.prototype, "elevationM", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Lake.prototype, "historicalGlof", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['normal', 'watch', 'high', 'critical'],
        enumName: 'tier',
        default: 'normal',
    }),
    __metadata("design:type", String)
], Lake.prototype, "currentTier", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Lake.prototype, "stale", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => observation_entity_1.Observation, (o) => o.lake),
    __metadata("design:type", Array)
], Lake.prototype, "observations", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Lake.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Lake.prototype, "updatedAt", void 0);
exports.Lake = Lake = __decorate([
    (0, typeorm_1.Entity)('lakes')
], Lake);
//# sourceMappingURL=lake.entity.js.map