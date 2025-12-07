"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const trustedContactsController_1 = require("../controllers/trustedContactsController");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, trustedContactsController_1.getMyTrustedContacts);
router.get('/primary', auth_1.authenticate, trustedContactsController_1.getPrimaryTrustedContact);
router.post('/', auth_1.authenticate, trustedContactsController_1.addTrustedContact);
router.put('/:id', auth_1.authenticate, trustedContactsController_1.updateTrustedContact);
router.delete('/:id', auth_1.authenticate, trustedContactsController_1.deleteTrustedContact);
exports.default = router;
