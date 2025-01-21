const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
    {
        category: String,
        type: String,
        standardLadenWeight: Number,
        co2EPercentageAbove2021: Number,
        co2EPercentageBelow2021: Number,
        lodedVehicleNomalizationPercentage: Number,
        emptyVehicleNomalizationPercentage: Number,
    },
    { timestamps: true }
)

module.exports = mongoose.model('Vehicle', vehicleSchema);