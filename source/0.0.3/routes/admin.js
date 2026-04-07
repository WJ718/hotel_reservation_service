const express = require('express');
const router = express.Router();

const {
    renderAdmin,
    loginAdmin,
    adminReservations,
    adminPayments,
    adminInventory
} = require('../controllers/admin');

const { checkToken, verifyAdmin } = require('../middlewares');

router.get('/', checkToken, renderAdmin);
router.post('/login', loginAdmin);

router.get('/reservations', verifyAdmin, adminReservations);
router.get('/payments', verifyAdmin, adminPayments);
router.get('/inventory', verifyAdmin, adminInventory);

module.exports = router;