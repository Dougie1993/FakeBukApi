// db connection logic

const config = require('../environment');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const mongoConnect = config.database.connection_url;
mongoose.connect(mongoConnect, {useNewUrlParser: true, useUnifiedTopology: true}, err =>{
    if(err) {
        console.error('Error!' + err)
    } else {
        console.log('Connected to mongodb')
    }
})

//To prevent depracation warnings from MongoDB native driver
mongoose.set('useCreateIndex', true)
mongoose.set('useFindAndModify', false)

module.exports = {
    mongoose
}