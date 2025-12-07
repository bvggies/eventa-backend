"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const adminAuth_1 = require("../middleware/adminAuth");
const router = express_1.default.Router();
// All admin routes require authentication and admin role
router.use(auth_1.authenticate);
router.use(adminAuth_1.requireAdmin);
// User management
router.get('/users', adminController_1.getAllUsers);
router.post('/users', adminController_1.createUser);
router.put('/users/:id', adminController_1.updateUser);
router.delete('/users/:id', adminController_1.deleteUser);
// Analytics
router.get('/analytics', adminController_1.getAnalytics);
router.get('/notifications', adminController_1.getNotifications);
router.get('/activity', adminController_1.getRecentActivity);
router.get('/financial', adminController_1.getFinancialData);
exports.default = router;
