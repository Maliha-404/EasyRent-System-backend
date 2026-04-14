const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { getOwnerDashboard, getTenantDashboard } = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/owner', getOwnerDashboard);
router.get('/tenant', getTenantDashboard);

module.exports = router;
