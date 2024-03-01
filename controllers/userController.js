/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-shadow */
/* eslint-disable no-underscore-dangle */
/* eslint-disable import/order */
/* eslint-disable no-unused-vars */
const bcrypt = require('bcrypt');
const emailValidator = require('email-validator');
const { differenceInDays, differenceInMonths, differenceInYears } = require('date-fns');
const mongoose = require('mongoose');

const { User, admin } = require('../models/users');
const { Car } = require('../models/car');

const { sendAdminOtp, generateOtp, sendMailToAdmin } = require('../service/nodeMailer');
const userService = require('../service/userService');
const { v4: uuidv4 } = require('uuid');
const { log } = require('handlebars');

const getHomePage = (req, res) => {
  const { previous } = req.session;
  if (previous) {
    if (!previous) {
      return res.status(200).redirect('/');
    }
    const { carId, dropDate, pickDate } = req.session;
    if (pickDate) {
      return res.redirect(`${previous}?carId=${carId}&&pickDate=${pickDate}&&dropDate=${dropDate}`);
    }

    return res.redirect(`${previous}?carId=${carId}`);
  }
  if (!req.session.name) {
    return res.render('user/index');
  }
  const { name } = req.session;
  return res.render('user/index', { name });
};

const loginPage = (req, res) => {
  res.render('user/login');
};

function register(req, res) {
  res.render('user/signUp');
}

const userLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email && !password) {
    return res.status(400).render('user/login', { error: 'Missing user name or password' });
  }
  try {
    const user = await User.findOne({ role: 'user', email });

    if (!user) {
      return res.status(404).render('user/login', { error: 'User name or password is invalid' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(404).render('user/login', { error: ' password is invalid' });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const { originalUrl } = req.session;
    req.session.password = hashPassword;
    req.session.name = user.name;
    req.session.email = email;
    req.session.userId = uuidv4();
    req.session._id = user._id;

    // Avoid storing password in session
    // req.session.password = password;
    if (originalUrl) {
      return res.redirect(`${originalUrl}`);
    }
    return res.redirect('/');
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
};

async function profilePage(req, res) {
  try {
    if (req.session) {
      const { name, password } = req.session;
      const user = await User.findOne({ name });

      if (user) {
        // Compare hashed password
        const psw = password.toString();
        const passwordMatch = bcrypt.compare(psw, user.password);
        if (passwordMatch) {
          const address = user.address[0];
          if (user.deletedAt) {
            res.status(200).render('user/profile', {
              data: user, name, address, message: `${name} your account is Permanently Deleted `,
            });
          }
          res.status(200).render('user/profile', { data: user, name, address });
        } else {
          res.status(404).render('user/login', { error: 'User name or password is invalid' });
        }
      }
    } else {
      res.status(400).redirect('/');
    }
  } catch (error) {
    res.status(500).json({ error: 'server Error', details: error });
  }
}
async function logoutUser(req, res) {
  try {
    if (req.session.userId) {
      req.session.destroy((error) => {
        if (error) {
          console.error(error);
        } else {
          res.redirect('/');
        }
      });
    }
  } catch {
    res.status(500).json({ error: 'server Error' });
  }
}
async function updateUser(req, res) {
  try {
    const { editId } = req.query;
    const {
      name,
      age,
      password,
      email,
      phone,
      houseName,
      zip,
      place,
      licenseNumber,
    } = req.body;
    const updateValues = ({
      name,
      age,
      password,
      email,
      licenseNumber,
      address: {
        place,
        zip,
        houseName,
      },
      phone,
    });
    if (editId && updateValues) {
      const update = await User.findByIdAndUpdate(
        editId,
        { $set: updateValues },
        { $new: true },
      );
      req.session.name = name;
      res.status(200).redirect('/profile');
    }
  } catch {
    res.status(500).json({ error: 'server Error' });
  }
}
async function deleteUser(req, res) {
  const { deleteId } = req.query;
  try {
    if (deleteId) {
      const deleteUserById = await User.findByIdAndDelete(deleteId);
      if (deleteUserById) {
        req.session.userId = '';
        req.session.name = '';
        req.session.password = '';
        res.status(200).redirect('/');
      } else {
        res.status(404).json('User not found');
      }
    } else {
      res.status(400).json('Missing deleteId parameter');
    }
  } catch (error) {
    console.error('Error deleting user', error);
    res.status(500).json('Internal Server Error');
  }
}
async function showCars(req, res) {
  try {
    const { name, password } = req.session;
    req.session.bookingId = '';
    const cars = await Car.find();
    if (cars) {
      cars.carImageUrl = encodeURIComponent(cars.carImage);
      res.render('user/cars', { data: cars, name });
    }
  } catch (error) {
    console.error('Error deleting user', error);
    res.status(500).json('Internal Server Error');
  }
}

async function filterCars(req, res) {
  const {
    transmission,
    fuel,
    carCategory,
    pickDateData,
    dropDateData,
  } = req.body;
  let AvailabilityId = [];
  if (pickDateData && dropDateData) {
    const pickDate = new Date(pickDateData);
    const dropDate = new Date(dropDateData);
    const availability = await userService.findCarAvailability(pickDate, dropDate);
    AvailabilityId = availability.map((entry) => entry._id);
    req.session.pickDate = pickDate;
    req.session.dropDate = dropDate;
  }
  const model = [
    {
      $match: {
        _id: {
          $nin: AvailabilityId,
        },
        TransmitionType: { $in: transmission },
        fuelType: { $in: fuel },
        carCategory: { $in: carCategory },
      },
    },
  ];
  const allCollections = await Car.aggregate(model);
  res.status(200).json(allCollections);
}

async function carDetailsUser(req, res) {
  const { name, password } = req.session;
  try {
    const { id } = req.query;
    const cars = await Car.findById(id);
    const { fuelType, carCategory } = cars;
    let carData = await Car.aggregate([
      {
        $match:
          {
            $or:
             [
               { carCategory },
               { fuelType },
             ],
          },
      },
      {
        $limit: 7,
      },
    ]);
    carData = carData.filter((car) => car._id.toString() !== id);
    res.status(200).render('user/carDetails', { car: cars, data: carData, name });
  } catch (error) {
    console.error('Error Details User', error);
    res.status(500).json('Internal Server Error');
  }
}

async function carSearchByName(req, res) {
  try {
    const { searchText } = req.body;
    if (searchText) {
      const car = await Car.find({ carName: { $regex: new RegExp(searchText, 'i') } });
      res.status(200).json(car);
    }
  } catch (error) {
    console.error('Error search car', error);
    res.status(500).json('Internal Server Error');
  }
}
const emailOtp = {};

async function generateOtpEmail(req, res) {
  try {
    const { email } = req.body;
    const otp = generateOtp();
    emailOtp[email] = otp;
    sendAdminOtp(email, otp, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).send(error);
      }
      console.error(otp, email);
      return res.status(201).json(email);
    });
  } catch (error) {
    console.error('Error search car', error);
    res.status(500).json('Internal Server Error');
  }
}
const registrationValidation = async (req, res) => {
  try {
    const {
      name,
      age,
      password,
      email,
      phone,
      houseName,
      zip,
      place,
      licenseNumber,
    } = req.body;
    const isValid = emailValidator.validate(email);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      age,
      password: hashPassword,
      email,
      phone,
      licenseNumber,
      address: {
        place,
        zip,
        houseName,
      },
      role: 'user',
    });
    await newUser.save();
    req.session.name = name;
    req.session.password = hashPassword;
    req.session._id = newUser._id;
    req.session.userId = uuidv4();
    return res.status(200).json('ok');
  } catch (error) {
    return res.status(500).json({ error: 'server Error', details: error });
  }
};

const userOtpCheck = async (req, res) => {
  const { otp, Email } = req.body;
  if (emailOtp[Email] && emailOtp[Email] === otp) {
    const user = await User.findOne({ role: 'user', email: Email });
    if (user) {
      delete emailOtp[Email];
      const { password } = user;
      const psw = password.toString();
      const hashPassword = bcrypt.hash(psw, 10);

      req.session.password = hashPassword;
      req.session.name = user.name;
      req.session.email = user.email;
      req.session.userId = uuidv4();
      return res.status(200).redirect('/');
    }
    const error = 'not found user';
  }
  return res.status(404).redirect('/login');
};

const contactPage = (req, res) => {
  const { name, password } = req.session;
  res.status(200).render('user/contact', { name });
};

async function userMessageToAdmin(req, res) {
  try {
    const {
      name,
      email,
      subject,
      message,
    } = req.body;
    if (email) {
      sendMailToAdmin(email, message, subject, (error, info) => {
        if (error) {
          console.error(error);
          return res.status(500).send(error);
        }
        return res.status(201).json('Success fully send message');
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'server Error', details: error });
  }
}

const aboutPage = (req, res) => {
  const { name } = req.session;
  res.status(200).render('user/about', { name });
};

const addToWishlist = async (req, res) => {
  const { carId } = req.body;
  const { _id } = req.session;
  if (_id === undefined) {
    return res.status(401).json('Not Found user');
  }
  try {
    // Find the user by their email and role
    const user = await User.findOne({ role: 'user', _id });

    if (!user) {
      return res.status(404).json('User not found');
    }

    const result = await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { whishList: carId } },
      { new: true },
    );
    if (!result) {
      return res.status(404).json('User not found');
    }

    return res.status(200).json('Car added to wishlist');
  } catch (error) {
    console.error('Error adding car to wishlist:', error);
    return res.status(404).json('Error adding car to wishlist:', error.message);
  }
};
const wishListPage = async (req, res) => {
  try {
    const { _id, name } = req.session;
    if (!_id) {
      return res.status(401).render('user/wishList');
    }
    const cars = await User.findById(_id).populate('whishList');
    if (!cars) {
      return res.render('user/wishList');
    }

    return res.render('user/wishList', { data: cars.whishList, name });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return res.status(500).json({ error: 'Error fetching wishlist', message: error.message });
  }
};

// const carBookingPage = async (req, res) => {
//   const {
//     pickDate, dropDate, _id, name, bookingId,
//   } = req.session;
//   let { carId } = req.query;
//   if (!carId) {
//     carId = req.session.carId;
//   }
//   req.session.carId = carId;
//   const car = await Car.findById(carId);
//   const user = await User.findById(_id);
//   const address = user.address[0];
//   if (!car || !user) {
//     return res.status(402).json('not find car or user');
//   }
//   try {
//     if (pickDate && dropDate) {
//       const formattedPickDate = userService.formattedDate(pickDate);
//       const formattedDropDate = userService.formattedDate(dropDate);
//       const dayDifferenceIn = differenceInDays(dropDate, pickDate);
//       const amount = car.dayRent * dayDifferenceIn;
//       req.session.amount = amount;
//       if (bookingId) {
//         if (car.bookings.includes(bookingId)) {
//           res.status(200).render('user/booking', {
//             car,
//             user,
//             name,
//             amount,
//             address,
//             payment: 'payment',
//             dayDifferenceIn,
//             formattedPickDate,
//             formattedDropDate,
//           });
//         }
//       }
//       req.session.carId = carId;
//       return res.status(200).render('user/booking', {
//         car,
//         user,
//         dayDifferenceIn,
//         formattedPickDate,
//         formattedDropDate,
//         name,
//         amount,
//         address,
//         bookingId,
//         booking: 'booking',
//       });
//     }
//   } catch (error) {
//     console.error('Error:', error);
//     return res.status(500).send('An error occurred while processing the recovery message');
//   }
//   return res.status(200).render('user/booking', {
//     car, user, name, address, booking: 'booking',
//   });
// };
const bookingCar = async (req, res) => {
  const {
    pickDate, dropDate, _id, name, bookingId,
  } = req.session;
  let { carId } = req.query;
  if (!carId) {
    carId = req.session.carId;
  }
  req.session.carId = carId;
  const car = await Car.findById(carId);
  const user = await User.findById(_id);
  const address = user.address[0];
  if (!car || !user) {
    return res.status(402).json('not find car or user');
  }
  if (pickDate && dropDate) {
    const formattedPickDate = userService.formattedDate(pickDate);
    const formattedDropDate = userService.formattedDate(dropDate);
    const dayDifferenceIn = differenceInDays(dropDate, pickDate);
    const amount = car.dayRent * dayDifferenceIn;
    req.session.days = dayDifferenceIn;
    req.session.amount = amount;
    if (bookingId) {
      return res.status(200).render('user/checkOut', {
        car,
        user,
        name,
        amount,
        address,
        dayDifferenceIn,
        formattedPickDate,
        formattedDropDate,
        payment: 'payment',
      });
    }
    return res.status(200).render('user/checkOut', {
      car,
      user,
      name,
      amount,
      address,
      dayDifferenceIn,
      formattedPickDate,
      formattedDropDate,
    });
  }
  return res.status(200).render('user/checkOut', { car, user, address });
};
const addDate = async (req, res) => {
  const { pickDate, dropDate } = req.query;
  req.session.pickDate = pickDate;
  req.session.dropDate = dropDate;
  res.status(200).redirect('/bookingCar');
};

const changeDate = async (req, res) => {
  const { pickDate, dropDate } = req.query;
  req.session.pickDate = '';
  req.session.dropDate = '';
  res.status(200).json('success');
};

const findCarByDate = async (req, res) => {
  const { pickDateData, dropDateData } = req.body;
  let AvailabilityId = [];

  if (!pickDateData || !dropDateData) {
    return res.status(401).redirect('/');
  }
  const pickDate = new Date(pickDateData);
  const dropDate = new Date(dropDateData);
  AvailabilityId = await userService.findCarAvailability(pickDate, dropDate);
  AvailabilityId = AvailabilityId.map((entry) => entry._id);
  req.session.pickDate = pickDate;
  req.session.dropDate = dropDate;
  const car = await Car.aggregate([
    {
      $match: {
        _id: {
          $nin: AvailabilityId,
        },
      },
    },
  ]);
  if (!car) {
    return res.status(401).redirect('/');
  }
  return res.status(200).render('user/cars', { data: car });
};
const removeWishlist = async (req, res) => {
  const { id } = req.query;
  const { _id } = req.session;
  if (!id || !_id) {
    return res.status(401).json('not  fide id');
  }
  const user = await User.findByIdAndUpdate(_id, {
    $pull: {
      whishList: id,
    },
  }, {
    new: true,
  });
  return res.status(200).redirect('/whishList');
};

const userRecoveryMessage = async (req, res) => {
  try {
    const { ...data } = req.body;
    const { _id } = req.session;

    // Find the admin with the role 'Admin'
    const adminDoc = await admin.findOne({ role: 'Admin' });

    if (!adminDoc) {
      return res.status(404).send('Admin not found');
    }

    // Update the notifications field of the admin document
    adminDoc.notifications.push({
      userId: _id,
      message: data.message, // Assuming the message is provided in the request body
      sender: data.sender, // Assuming the sender is provided in the request body
      createdAt: new Date(),
    });

    // Save the updated admin document
    await adminDoc.save();

    return res.status(201).redirect('/profile');
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('An error occurred while processing the recovery message');
  }
};

// eslint-disable-next-line consistent-return
const userBookedCar = async (req, res) => {
  const formData = req.body;
  const {
    _id, carId, pickDate, dropDate, amount, days,
  } = req.session;

  const bookingDate = new Date();

  const userCheck = await User.findById(_id).populate('bookedCar');
  const confirmArray = await userService.confirm(_id, carId, userCheck);
  if (confirmArray.length > 0) {
    return res.status(409).json({ message: 'already booked' });
  }
  const bookingData = {
    car: carId,
    bookingDate,
    pickupDate: pickDate,
    returnDate: dropDate,
    totalPrice: amount,
    totalDays: days,
    status: 'pending',
  };
  try {
    const user = await User.findByIdAndUpdate(
      _id,
      { $addToSet: { bookedCar: bookingData } },
      { new: true },
    );

    const bookingId = user.bookedCar[user.bookedCar.length - 1]._id;
    const car = await Car.findByIdAndUpdate(carId, {
      $addToSet: {
        bookings: bookingId,
      },
    }, {
      new: true,
    });
    req.session.bookingId = bookingId;
    userService.razerPayCreation(bookingId, amount * 100)
      .then(async (razerPay) => {
        await User.findOneAndUpdate(
          { _id, 'bookedCar._id': bookingId },
          { $set: { 'bookedCar.$.payment_id': razerPay.id } },
        );

        // Rest of your code...
        return res.status(200).json({ razerPay, formData });
      })
      .catch((error) => {
        // Handle any errors that occur during order creation
        console.error('Error creating order:', error);
        return res.status(400).json('error for payment');
      });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json('Internal server error');
  }
};

const bookedCars = async (req, res) => {
  try {
    const { _id, name } = req.session;
    if (!_id) {
      return res.status(401).render('user/carsBooked');
    }
    const cars = await User.findById(_id).populate('bookedCar.car');

    if (!cars) {
      return res.render('user/carsBooked');
    }
    const count = cars.bookedCar.length;

    return res.render('user/carsBooked', { data: cars.bookedCar, name, count });
  } catch (error) {
    console.error('Error fetching bookedCar:', error);
    return res.status(500).json({ error: 'Error fetching wishlist', message: error.message });
  }
};
const removeBookings = async (req, res) => {
  const { id } = req.query;
  const { _id } = req.session;
  if (!id || !_id) {
    return res.status(401).json('not  find id');
  }
  const user = await User.findByIdAndUpdate(
    _id,
    { $pull: { bookedCar: { _id: id } } },
    { new: true },
  );

  return res.status(200).redirect('/bookedCars');
};

const userPayRent = async (req, res) => {
  const { bookingId } = req.body;
  res.send(bookingId);
};

const paymentPageByCar = async (req, res) => {
  const {
    bookingId, pickDate, dropDate, id,
  } = req.query;
  req.session.bookingId = bookingId;
  req.session.pickDate = pickDate;
  req.session.dropDate = dropDate;
  req.session.carId = id;

  return res.status(200).redirect('/bookingCar');
};

const carDetails = async (req, res) => {
  const { _id, name } = req.session;
  const { bookingId } = req.query;
  try {
    const user = await User.findById(_id).populate('bookedCar.car');
    const thisBooking = user.bookedCar.find((booking) => booking._id.toString() === bookingId);
    return res.json(thisBooking);
  } catch (error) {
    return res.status(500).json('server error', error);
  }
};

const paymentVerification = async (req, res) => {
  try {
    const { _id } = req.session;
    await userService.verifyPayment(req.body);
    const updatedUser = await userService.changeStatus(req.body.razerPay, _id, req.body.method);
    req.session.bookingId = '';
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Payment verification failed:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};
module.exports = {
  getHomePage,
  loginPage,
  register,
  userLogin,
  profilePage,
  logoutUser,
  updateUser,
  deleteUser,
  showCars,
  filterCars,
  carDetailsUser,
  carSearchByName,
  generateOtpEmail,
  userOtpCheck,
  registrationValidation,
  contactPage,
  userMessageToAdmin,
  aboutPage,
  addToWishlist,
  wishListPage,
  userRecoveryMessage,
  // carBookingPage,
  bookingCar,
  addDate,
  changeDate,
  removeWishlist,
  findCarByDate,
  userBookedCar,
  bookedCars,
  removeBookings,
  userPayRent,
  paymentPageByCar,
  carDetails,
  paymentVerification,
};
