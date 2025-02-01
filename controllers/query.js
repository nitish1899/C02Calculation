const Query = require("../models/query");

const createQuery = async (req, res) => {
    try {

        const { fullName, email, phone, message } = req.body;

        if (!fullName || !email || !message) {
            throw new Error('Please enter all the required format');
        }

        const query = await Query.create({ fullName, email, phone, message });

        return res.status(200).json({ success: true, message: 'Query submitted successfully!' });
    } catch (error) {
        console.log('Error : ', error.message);
        return res.status(400).json({ success: false, message: 'Failed to submit your query.' });
    }
}

module.exports = { createQuery };
