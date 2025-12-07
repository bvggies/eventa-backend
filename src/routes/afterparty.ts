import express from 'express';
import { getAfterPartyVenues } from '../controllers/afterpartyController';

const router = express.Router();

router.get('/nearby', getAfterPartyVenues);

export default router;

