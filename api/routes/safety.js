"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminAuth_1 = require("../middleware/adminAuth");
const safetyController_1 = require("../controllers/safetyController");
const router = express_1.default.Router();
// User routes
router.post('/location', auth_1.authenticate, safetyController_1.shareLocation);
router.post('/emergency', auth_1.authenticate, safetyController_1.reportEmergency);
router.post('/safe', auth_1.authenticate, safetyController_1.markSafe);
router.post('/check-in', auth_1.authenticate, safetyController_1.checkIn);
router.get('/history', auth_1.authenticate, safetyController_1.getMySafetyHistory);
// Admin routes
router.get('/admin/alerts', auth_1.authenticate, adminAuth_1.requireAdmin, safetyController_1.getAllSafetyAlerts);
router.get('/admin/feed', auth_1.authenticate, adminAuth_1.requireAdmin, safetyController_1.getLiveSafetyFeed);
router.get('/admin/emergencies', auth_1.authenticate, adminAuth_1.requireAdmin, safetyController_1.getUnacknowledgedEmergencies);
router.post('/admin/acknowledge/:id', auth_1.authenticate, adminAuth_1.requireAdmin, safetyController_1.acknowledgeSafetyAlert);
router.get('/admin/statistics', auth_1.authenticate, adminAuth_1.requireAdmin, safetyController_1.getSafetyStatistics);
exports.default = router;
