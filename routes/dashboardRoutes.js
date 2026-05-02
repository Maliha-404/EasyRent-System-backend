const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { getOwnerDashboard, getTenantDashboard, createOwnerBuilding, createOwnerUnit, createOwnerNotice } = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/owner', getOwnerDashboard);
router.post('/owner/buildings', createOwnerBuilding);
router.post('/owner/units', createOwnerUnit);
router.post('/owner/notices', createOwnerNotice);

router.get('/tenant', getTenantDashboard);

module.exports = router;
