const otpGenerator = require('otp-generator');
const otpModel = require('../models/otp');
const sendOtp = async (req,res) => {
    try{
        const otp = otpGenerator.generate(4,{upperCaseAlphabets:false,lowerCaseAlphabets:false,specialChars:false});

        const cDate = new Date();

        await otpModel.findOneAndUpdate({mobileNumber:req.query.mobileNumber},
            {otp,otpExpiration: new Date(cDate.getTime())},
            {upsert:true,new:true,setDefaultsOnInsert:true}
        );
        
        return res.status(200).json({
            success:true,
            message: otp
        })
    } catch(error){
        return res.status(400).json({
            success:false,
            message:error?.message
        })
    }
}

const verifyOtp = async (req,res) => {
    try{     
       const existingOtp =  await otpModel.findOne({mobileNumber:req.body.mobileNumber});
       
       if(!existingOtp.otp){
        throw new Error('Otp does not exists');
       }

    // otp expiration time is 5 minutes
       const cDate = new Date();

       if(new Date().getTime() > (existingOtp.otpExpiration + 300000)){
        throw new Error('Otp expired');
       }

       if(existingOtp.otp !== req.body.otp){
        throw new Error('Invalid otp')
       }

        return res.status(200).json({success:true})
    } catch(error){
        return res.status(400).json({
            success:false,
            message:error?.message
        })
    }
}

module.exports = {sendOtp,verifyOtp};