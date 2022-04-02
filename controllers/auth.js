
const bcrypt = require('bcrypt');

const User = require('../models/user');
const jwt = require('jsonwebtoken');

const { validationResult } = require('express-validator');

exports.signup = (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error("Validation failed.");
        error.statusCode = 422;
        error.data = errors.array();
        throw error
    }
    let { email, name, password } = req.body;
    bcrypt.hash(password, 12)
        .then(hashedPwd => {
            const user = new User({
                email, password:hashedPwd, name
            });
            return user.save();

        })
        .then(result => {

            res.status(201).json({ message: "User Created!", userId: result._id })
        })
        .catch(err => {
            console.error("Error ! ", err);
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        })


}


exports.login = (req, res, next) => {

    const { email, password } = req.body;
    let loadedUser;

    User.findOne({ email })
        .then(user => {
            if (!user) {
                const error = new Error('A User with this email could not be found.');
                error.statusCode = 401;
                throw error;

            }

            loadedUser = user;
            console.log("login password ", { password, user_existing: user.password });

            return bcrypt.compare(password, user.password)

        })
        .then(isEquals => {
            if (!isEquals) {

                console.log("Is Equals is ", isEquals);

                const error = new Error('Wrong password !');
                error.statusCode = 401;
                throw error;
            }

            const token = jwt.sign({
                email: loadedUser.email,
                userId: loadedUser._id.toString()
            },
                'yoursecretkey',
                { expiresIn: '1h' }
            );

            res.status(200).json({ message: 'User logged in successfully !', token, userId: loadedUser._id.toString() });

        })
        .catch(err => {
            console.error("Error ! ", err);
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        })

}