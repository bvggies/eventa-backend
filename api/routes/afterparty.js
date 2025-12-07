"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const afterpartyController_1 = require("../controllers/afterpartyController");
const router = express_1.default.Router();
router.get('/nearby', afterpartyController_1.getAfterPartyVenues);
exports.default = router;
