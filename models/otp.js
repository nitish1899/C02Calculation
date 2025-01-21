const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
    {
        mobileNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        otp: { type: Number, required: true },
        otpExpiration: {
            type: Date,
            default: Date.now,
            get: (otpExpiration) => otpExpiration.getTime(),
        }
    }, 
    { timestamps: true }
);

module.exports = mongoose.model('Otp', otpSchema);