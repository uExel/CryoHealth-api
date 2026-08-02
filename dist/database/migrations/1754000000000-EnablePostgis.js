"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnablePostgis1754000000000 = void 0;
class EnablePostgis1754000000000 {
    async up(q) {
        await q.query('CREATE EXTENSION IF NOT EXISTS postgis');
    }
    async down(q) {
        await q.query('DROP EXTENSION IF EXISTS postgis');
    }
}
exports.EnablePostgis1754000000000 = EnablePostgis1754000000000;
//# sourceMappingURL=1754000000000-EnablePostgis.js.map