"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ticketController_1 = require("../controllers/ticketController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/', auth_1.authenticate, ticketController_1.buyTicket);
router.get('/', auth_1.authenticate, ticketController_1.getMyTickets);
router.get('/:id', auth_1.authenticate, ticketController_1.getTicketById);
exports.default = router;
