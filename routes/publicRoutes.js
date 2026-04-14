const express = require('express');
const router = express.Router();
const { getHomeData, getProperties, getPropertyById } = require('../controllers/publicController');

router.get('/home', getHomeData);
router.get('/properties', getProperties);
router.get('/properties/:id', getPropertyById);

module.exports = router;
