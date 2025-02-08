const mongoose = require('mongoose');

const inputSchema = new mongoose.Schema(
    {
        vehicleNumber: String,
        sourcePincode: Number,
        destinationPincode: Number,
        lodedWeight: Number,
        mobilizationDistance: Number,
        deMobilizationDistance: Number,
        carbonFootprint: Number,
        certificateNumber: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        fuelType: String,
        distance: { type: Number, required: true },
        pdfUrl: String,
    },
    { timestamps: true }
)

module.exports = mongoose.model('InputHistory', inputSchema);