const express = require('express');
const User = require('../models/user.model')
const cors = require('cors');
const router = express.Router()


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

module.exports = router