const express = require('express')
const {mongoose} = require('./db/mongoose')
const cors = require('cors')
const User = require('./db/routes/user.route')



const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const port = process.env.PORT || 3000

app.use(cors())
app.use('/user', User)

app.get('/', (req, res) => {
    res.send('Hello World')
})


app.listen(port , function(){
    console.log('Listening to server from port: ' + port)
})