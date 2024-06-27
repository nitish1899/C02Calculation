const mongoose = require('mongoose');
const CONFIG = require('./config');

module.exports = {
    connection: null,
    connectDB: async function () {

        if (this.connection) {
            return this.connection;
        }

        const options = {
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 5,   // Minimum number of connections in the pool
            socketTimeoutMS: 120000
        };

        return await mongoose.connect(CONFIG.DB, options)
            .then((connection) => {
                this.connection = connection;
                console.log('connection successful');
            }
            )
            .catch((error) => console.log(error));
    }
};