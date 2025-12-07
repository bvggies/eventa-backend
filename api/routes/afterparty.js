"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const afterpartyController_1 = require("../controllers/afterpartyController");
const router = express_1.default.Router();
// Public routes
router.get('/nearby', afterpartyController_1.getAfterPartyVenues);
// Admin routes
router.post('/venues', auth_1.authenticate, afterpartyController_1.addVenue);
router.get('/venues', auth_1.authenticate, afterpartyController_1.getAllVenues);
router.delete('/venues/:id', auth_1.authenticate, afterpartyController_1.deleteVenue);
exports.default = router;
