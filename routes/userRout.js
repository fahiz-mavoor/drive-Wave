const express = require('express');

const userController = require('../controllers/userController');
const middleware = require('../middleware/user');

const router = express.Router();

router.get('/', userController.getHomePage);
router.get('/login', middleware.loginMiddleWare, userController.loginPage);
router.get('/register', middleware.loginMiddleWare, userController.register);
router.post('/userLogin', userController.userLogin);
router.get('/profile', middleware.requireAuth, userController.profilePage);
router.get('/logout', middleware.requireAuth, userController.logoutUser);
router.post('/editUser', middleware.requireAuth, userController.updateUser);
router.post('/deleteUser', middleware.requireAuth, userController.deleteUser);
router.get('/cars', userController.showCars);
router.post('/filterCars', userController.filterCars);
router.get('/carDetails', userController.carDetailsUser);
router.post('/searchCar', userController.carSearchByName);
router.post('/generateOtp', userController.generateOtpEmail);
router.post('/checkOtpUser', userController.userOtpCheck);
router.post('/registrationValidation', userController.registrationValidation);
router.get('/contact', userController.contactPage);
router.post('/contactMessage', userController.userMessageToAdmin);
router.get('/about', userController.aboutPage);
router.post('/addWishlist', userController.addToWishlist);
router.get('/whishList', middleware.mustLogin, userController.wishListPage);
router.post('/userRecoveryMessage', userController.userRecoveryMessage);
// router.get('/carBooking', middleware.mustLogin, userController.carBookingPage);
router.get('/bookingCar', middleware.mustLogin, userController.bookingCar);
router.get('/addDate', middleware.mustLogin, userController.addDate);
router.get('/changeDate', middleware.mustLogin, userController.changeDate);
router.post('/findCarByDate', userController.findCarByDate);
router.get('/removeWishlist', middleware.mustLogin, userController.removeWishlist);
router.post('/userBookedCar', middleware.mustLogin, userController.userBookedCar);
router.get('/bookedCars', middleware.mustLogin, userController.bookedCars);
router.get('/removeBookings', middleware.mustLogin, userController.removeBookings);
router.get('/userPayRent', middleware.mustLogin, userController.userPayRent);
router.get('/paymentPageByCar', middleware.mustLogin, userController.paymentPageByCar);
router.get('/BookedCar', middleware.mustLogin, userController.carDetails);
router.post('/paymentVerification', middleware.mustLogin, userController.paymentVerification);

module.exports = router;
