require('dotenv').config();

const vehicleDetails = async (VechileNumber) => {
    const options = {
        method:'POST',
        url:process.env.SURE_PASS_RC_FULL_DETAILS_API,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.SURE_PASS_TOKEN,
        },
        data: {
            id_number: VechileNumber,
        }
    };

    try{ 
        const vehicleInfo = (await axios.request(options)).data;
        return res.status(200).json({vehicleInfo});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {vehicleDetails};



