const mongoose = require('mongoose');

const routes = ['Delhi-Mumbai', 'Bangalore-Hyderabad', 'Lucknow-Varanasi', 'Kolkata-Chennai', 'Delhi-Chandigarh', 'Other Routes',];

const routewiseEmissionSchema = new mongoose.Schema(
    {
        route: { type: String, enum: routes, default: 'Other Routes' },
        totalEmission: { type: Number, default: 0 }
    },
    { timestamps: true }
);

module.exports = mongoose.model('RoutewiseEmission', routewiseEmissionSchema);
module.exports.routes = routes;