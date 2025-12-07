"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rsvpController_1 = require("../controllers/rsvpController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/', auth_1.authenticate, rsvpController_1.rsvp);
router.get('/', auth_1.authenticate, rsvpController_1.getMyRsvps);
router.delete('/:eventId', auth_1.authenticate, rsvpController_1.cancelRsvp);
exports.default = router;
