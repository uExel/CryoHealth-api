"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const typeorm_1 = require("typeorm");
const all_entities_1 = require("./all-entities");
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5433),
    username: process.env.DB_USER ?? 'cryohealth',
    password: process.env.DB_PASSWORD ?? 'cryohealth-dev',
    database: process.env.DB_NAME ?? 'cryohealth',
    entities: all_entities_1.entities,
    migrations: ['src/database/migrations/*.ts'],
});
//# sourceMappingURL=data-source.js.map