const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');

    if (!authHeader) {
        let error = new Error('Not authenticated.');
        error.statusCode = 401;
        throw error;
    }

    const token = authHeader.split(' ')[1];

    let decodedToken;
    try {
        decodedToken = jwt.verify(token, "yoursecretkey");
    }
    catch (err) {
        let error = new Error('JWT unable to authenticate.');

        error.statusCode = 500;
        throw error;
    }
    if (!decodedToken) {
        let error = new Error('Not authenticated.');
        error.statusCode = 401;
        throw error;

    }

    req.userId = decodedToken.userId;
    next();

}