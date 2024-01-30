const express = require('express');
const adminController = require('../controllers/adminController');
const login = require('../middleware/admin');
const { upload } = require('../service/fileUpload-delete');

const router = express.Router();

router.get('/', login.loginMiddleWare, adminController.showLoginPageAdmin);
router.get('/login', login.loginMiddleWare, adminController.showLoginPageAdmin);
router.get('/login/getOtp', adminController.OtpPage);
router.post('/login/generateOtp', adminController.otpGenerate);
router.post('/adminDashboard', adminController.getAdminDashBoard);
router.get('/adminDashboardPage', login.requireAuth, adminController.showAdminDashboard);
router.get('/adminCarPage', login.requireAuth, adminController.showAdminCarPage);
router.get('/adminLogout', adminController.logout);
router.post('/addCars', login.requireAuth, upload.single('carImage'), adminController.addCarAdmin);
router.get('/getCarDetails', login.requireAuth, adminController.getCar);
router.get('/adminCarPage/deleteCar', login.requireAuth, adminController.deleteCar);
router.post('/adminCarPage/updateCarDetails', login.requireAuth, upload.single('carImage'), adminController.updateCar);
router.get('/adminCarPage/findCarCategories', login.requireAuth, adminController.findCarCategories);
module.exports = router;
