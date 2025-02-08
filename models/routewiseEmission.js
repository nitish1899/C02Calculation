const mongoose = require('mongoose');

const routes = ['Delhi-Mumbai', 'Bengaluru-Hyderabad', 'Lucknow-Varanasi', 'Kolkata-Chennai', 'Delhi-Chandigarh', 'Other Routes',];

const routewiseEmissionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        route: { type: String, enum: routes, default: 'Other Routes' },
        totalEmission: { type: Number, default: 0 }
    },
    { timestamps: true }
);

module.exports = mongoose.model('RoutewiseEmission', routewiseEmissionSchema);
module.exports.routes = routes;