const mongoose = require('mongoose');
const CONFIG = require('./config');

module.exports = {
    connection : null,
    connect : function (){

        if(this.connection){
            return this.connection;
        }

        return mongoose.connect(CONFIG.DB,{
            useNewUrlParser:true,
            useUnifiedTopogy:true,
            useCreateIndex:true
        })
        .then((connection) => {
            this.connection = connection;
            console.log('connection successful');
        }
        )
        .catch((error) => console.log(error));
    }
};