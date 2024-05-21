const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
userName:String,
mobileNumber:String,
pin:Number,
})

module.exports = mongoose.model('User',userSchema);