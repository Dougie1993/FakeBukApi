const mongoose = require('mongoose');
const _ = require('lodash')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const jwtSecret = require('../../environment.json')

const UserSchema = mongoose.Schema({
    firstname: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    middlename: {
        type: String,
        trim: true
    },
    lastname: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    sessions: [{
        token: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Number,
            required: true
        }

    }]
})

// Instance Methods

// Getting the response to be in Json and omiting important information on response
UserSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();

    // return document except the password and sessions //
    return _.omit(userObject, ['password','sessions'])
}

// Generate Refresh Token
UserSchema.methods.generateRefreshToken = function () {
    // generate random 64byte Hex String it is not saved to the db savesessiontodb() does that
    // import crypto
    return new Promise ((resolve, reject) => {
        crypto.randomBytes(64, (err, buf) => {
            if (!err) {
                let token = buf.toString('hex');
                return resolve(token);
            } else {
                reject(new Error('Refresh Token Failed to Generate'));
            }
        })
    })

}

UserSchema.methods.generateAccessToken = function () {
    const user = this;
    
    return new Promise ((resolve, reject) => {
        // install jsonwebtoken
        jwt.sign({_id: user._id.toHexString()}, jwtSecret.secret.secret_key, {expiresIn: "15m"}, (err, token) => {
            if (!err) {
                resolve(token)
                
            } else {
                reject(new Error('jwt signature Error'));
            }
        })
    })
}

UserSchema.methods.createSession = function () {
    let user = this;
    return user.generateRefreshToken().then((refreshToken) => {
        return saveSessionToDatabase(user, refreshToken);
    }).then((refreshToken) => {
        // saved to database successfully
        // now return the refresh token
        return refreshToken;
    }).catch((e) => {
        return Promise.reject('Failed to save session to database.\n' + e);
    })
}

// Static Methods
UserSchema.statics.findByCredentials = function (email, password) {
    let User = this;

    return User.findOne({ email }).then((user) => {
        if (!user) return Promise.reject(new Error('User not Found'));

        return new Promise((resolve, reject) => {
            bcrypt.compare( password, user.password, (err, res) => {
                if (res) {
                    resolve(user);
                } else {
                    reject(new Error('password mismatch'));
                }
            })
            
        })
    })
}

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
    let secondsSinceEpoch = Date.now() / 1000;
    if (expiresAt > secondsSinceEpoch) {
        // hasnt expired
        return false;
    } else {
        // has expired
        return true;
    }

}

UserSchema.statics.findByIdAndToken = function (_id, token) {
    // This one is used in auth middleware when now dealing with headers
    const User = this;
    if (_id.match(/^[0-9a-fA-F]{24}$/)) {
        // Yes, it's a valid ObjectId, proceed with `findById` call.
        return User.findOne({
            _id,
            'sessions.token': token
        }).then((user) => {
            if(user) {
                return Promise.resolve(user);
            } else {
                return Promise.reject(new Error('User not Found'));
            }
        }).catch((e) => {
            return Promise.reject(new Error('User not Found2')).then(function() {
                // not called
              }, function(error) {
               // console.error(error); // Stacktrace
              });
        });
    } else {
        return Promise.reject(new Error('id format invalid')).then(function() {
            // not called
          }, function(error) {
           // console.error(error); // Stacktrace
          });
    }   
}

UserSchema.statics.getJWTSecret = () => {
    return jwtSecret.secret.secret_key;
}

/* MIDDLEWARE */
// Before a user document is saved, this code runs

UserSchema.pre('save', function (next) {
    let user = this;
    let costFactor = 10;

    if (user.isModified('password')) {
        // code to run if password has been change..will edit lated when we use the forgot password route

        // Generate salt and hash passwords
        bcrypt.genSalt(costFactor, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            })
        })
    } else {
        next();
    }
});

// Helper Methods
let saveSessionToDatabase = (user, refreshToken) => {
    //save the session to DB
    return new Promise ((resolve, reject) => {
        let expiresAt = generateRefreshTokenExpiryTime();

        user.sessions.push({ 'token': refreshToken, expiresAt});
        user.save().then(() => {
            return resolve(refreshToken)
        }).catch((e) => {
            reject(new Error('failed to save session ' + e));
        })
    })
    
}

let generateRefreshTokenExpiryTime = () => {
    let daysUntilExpire = "5";
    let secondsUntilExpire = ((daysUntilExpire * 24) * 60) * 60;
    return ((Date.now() / 1000) + secondsUntilExpire);
}

const User = mongoose.model('User', UserSchema)
module.exports = ( User )