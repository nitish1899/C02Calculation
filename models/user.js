const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userName:{
      type: String,
      required: true
    },
  // image:{
  //   type:String,
  //   required:false,
  // },
  mobileNumber:{
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  pin:{type:String,required:true},
  });

module.exports = mongoose.model('User',userSchema);