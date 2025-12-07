"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const eventController_1 = require("../controllers/eventController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', eventController_1.getAllEvents);
router.get('/featured', eventController_1.getFeaturedEvents);
router.get('/trending', eventController_1.getTrendingEvents);
router.get('/nearby', eventController_1.getNearbyEvents);
router.get('/:id', eventController_1.getEventById);
router.post('/', auth_1.authenticate, eventController_1.createEvent);
router.put('/:id', auth_1.authenticate, eventController_1.updateEvent);
router.delete('/:id', auth_1.authenticate, eventController_1.deleteEvent);
exports.default = router;
