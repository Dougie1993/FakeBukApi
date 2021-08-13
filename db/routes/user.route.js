const express = require('express');
const User = require('../models/user.model')
const cors = require('cors');
const { request } = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken')


router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Expose-Headers", "x-access-token, x-refresh-token, _id");
    // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PATCH, PUT, GET,POST, DELETE');
        return res.status(200).json({});
    }
    next();
  });


// router.use(cors());

// Middleware

let verifySession = (req, res, next) => {
    // Grab refresh token from header //
    let refreshToken = req.header('x-refresh-token');

    //grab id from the request header
    let _id = req.header('_id');

    try{
        User.findByIdAndToken(_id, refreshToken).then((user) => {
            if(!user) {
                //user not found
                return Promise.reject(
                    res.status(401).send('User not found')
                );
            }
            // user found & session valid
            req._id = user.id;
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

    catch (e) {
        console.log('error')
    }
        
    
}

let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');

    // Verify JWT

    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if(err) {
            // check error
            //jwt is invalid - * DO NOT AUNTENTICATE *
            res.status(401).send(err);
        } else {
            // jwt is valid
            req.user_id = decoded._id; //user id is encoded with the secret when token was generated so we decode it here
            next();
        }
    });
}

router.post('/register', (req, res) => {
    let body = req.body;
    let newUser = new User(body);

    newUser.save().then((savedUser) => {
        // res.json(savedUser);
        return newUser.createSession(); // This generates refresh Token and saves session to DB
    }).then((refreshToken) => {
        // once we have the refresh token we will generate access token
        return newUser.generateAccessToken().then((accessToken) => { 
            // access token generated successfully, now we return an object containing the auth tokens
            return { accessToken, refreshToken }
        });
    }).then((authTokens) => {
        //grab the tokens and attach them to response header;
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
        res.send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })

})

router.post('/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials( email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            // Session created successfully - refreshToken returned.
            // now we generate an access auth token for the user

            return user.generateAccessToken().then((accessToken) => {
                // access auth token generated successfully, now we return an object containing the auth tokens
                return { accessToken, refreshToken }
            });
        }).then((authTokens) => {
            // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    })
})

/**
 * GET /user/me/access-token
 * Purpose: generates and returns an access token
 */

router.get('/me/access-token', verifySession, (req, res) => {
    req.userObject.generateAccessToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
})

router.get('/profile/:userId/me/:jwttoken', authenticate, (req, res) => {
    _id = req.params.userId;
    token = req.params.jwttoken;
    User.findByIdAndToken(_id, token).then((user) => {
        res.send(user);
    })
})

module.exports = router