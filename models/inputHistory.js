const mongoose = require('mongoose');

const inputSchema = new mongoose.Schema({
    vehicleNumber: String,
    sourcePincode: Number,
    destinationPincode: Number,
    lodedWeight: Number,
    mobilizationDistance: Number,
    deMobilizationDistance: Number,
    _user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
})

module.exports = mongoose.model('InputHistory', inputSchema);