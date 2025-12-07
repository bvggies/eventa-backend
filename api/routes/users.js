"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/profile', auth_1.authenticate, userController_1.getProfile);
router.put('/profile', auth_1.authenticate, userController_1.updateProfile);
router.get('/saved-events', auth_1.authenticate, userController_1.getSavedEvents);
router.post('/saved-events/:eventId', auth_1.authenticate, userController_1.saveEvent);
router.delete('/saved-events/:eventId', auth_1.authenticate, userController_1.unsaveEvent);
exports.default = router;
