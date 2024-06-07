const mongoose = require('mongoose');
const CONFIG = require('./config');

module.exports = {
    connection: null,
    connectDB: async function () {

        if (this.connection) {
            return this.connection;
        }

        return await mongoose.connect(CONFIG.DB)
            .then((connection) => {
                this.connection = connection;
                console.log('connection successful');
            }
            )
            .catch((error) => console.log(error));
    }
};