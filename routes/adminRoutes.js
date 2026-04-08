const express = require('express');
const router = express.Router();
const {
    getAllUsersForAdmin,
    updateUserStatusByAdmin,
    getAdminOverview
} = require('../controllers/adminController');
const { authenticate, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticate, authorizeRoles('admin'));

router.get('/overview', getAdminOverview);
router.get('/users', getAllUsersForAdmin);
router.patch('/users/:id/status', updateUserStatusByAdmin);

module.exports = router;
