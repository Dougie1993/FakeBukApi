const User = require('../models/user.model')

let verifySession = (req, res, next) => {
    // Grab refresh token from header //
    let refreshToken = req.header('x-refresh-token');

    //grab id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if(!user) {
            //user not found
            return Promise.reject(
                new Error('User not found check if userId and Refresh token are valid')
            );
        }

        // user found & session valid
        req.user_id = user.id;
        req.refreshToken = refreshToken;
        req.userObject = user;

        //check if session has expired
        let isSessionValid = false;
        user.sessions.forEach((sessions) => {
            if (sessions.token === refreshToken) {
                //check if session has expired
                if(User.hasRefreshTokenExpired(sessions.expiresAt) === false) {
                    //refresh token has ot expired
                    isSessionValid = true;
                }
            }
        });
        if (isSessionValid) {
            //session is valid call next to continue processing webrequest
            next();
        } else {
            //session not valid
            return Promise.reject({
                'error': 'Refresh token has expired or session is invalid'
            })
        }
    }).catch((err) => {
        res.status(401).send(err);
    })
    
}

module.exports = (verifySession)
