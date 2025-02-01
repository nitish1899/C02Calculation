const mongoose = require("mongoose");

const querySchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: Number },
    message: { type: String, required: true }
},
    { timestamps: true }
);

module.exports = mongoose.model('Query', querySchema);