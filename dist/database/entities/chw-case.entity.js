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
exports.ChwCase = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let ChwCase = class ChwCase {
    id;
    chw;
    chwId;
    capturedAt;
    payload;
    outcome;
    syncState;
    deviceId;
    clientCaseId;
    createdAt;
};
exports.ChwCase = ChwCase;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChwCase.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'chwId' }),
    __metadata("design:type", user_entity_1.User)
], ChwCase.prototype, "chw", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ChwCase.prototype, "chwId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ChwCase.prototype, "capturedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], ChwCase.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ChwCase.prototype, "outcome", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['queued', 'synced'],
        enumName: 'sync_state',
        default: 'synced',
    }),
    __metadata("design:type", String)
], ChwCase.prototype, "syncState", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ChwCase.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ChwCase.prototype, "clientCaseId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ChwCase.prototype, "createdAt", void 0);
exports.ChwCase = ChwCase = __decorate([
    (0, typeorm_1.Entity)('chw_cases'),
    (0, typeorm_1.Index)(['chw', 'capturedAt'])
], ChwCase);
//# sourceMappingURL=chw-case.entity.js.map