require('dotenv').config();
const puppeteer = require('puppeteer');
const AWS = require('aws-sdk');

// AWS S3 Configuration
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

const pdfTemplate = ({ certificateNumber, certificateIssueDate, userName, vehicleNumber, co2Emission }) => `
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of CO2 Emission</title>
</head>

<body>
    <div
        style="font-family: 'Playfair Display', serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8f9fa; margin: 0;">

        <div
            style="border: 10px solid #D4AF37; padding: 30px; width: 700px; text-align: center; background-color: #fff; box-shadow: 0 0 20px rgba(0, 0, 0, 0.2); position: relative; background: url('https://www.toptal.com/designers/subtlepatterns/patterns/symphony.png');">

            <!-- Logos Section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="display: flex; flex-direction: column;">
                    <a target="blank" href="https://dpiit.gov.in">
                        <img src="https://transvue.s3.ap-south-1.amazonaws.com/DPIIT-1719464112334+(1).png" alt="DPIIT Logo" style="height: 20px; margin-bottom: 5px;">
                    </a>
                    <a href="https://www.startupindia.gov.in">
                        <img src="https://transvue.s3.ap-south-1.amazonaws.com/Logo1.png"
                            alt="Startup India Logo" style="height: 20px; margin-bottom: 5px;">
                    </a>
                </div>
                <div>
                    <img src="https://transvue.s3.ap-south-1.amazonaws.com/pureprukriti.png" alt="TSIL Logo"
                        style="height: 60px; width: 60px; margin-right: 5px; margin-bottom: 5px;">
                </div>
            </div>

            <!-- Certificate Header -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 16px;">Certificate Number: <span
                        style="font-weight: bold; color: #2c3e50;" id="certificateNumber">${certificateNumber}</span></p>
                <p style="margin: 0; font-size: 16px;">Date: <span style="font-weight: bold; color: #2c3e50;"
                        id="date">${certificateIssueDate}</span></p>
            </div>

            <h1
                style="font-size: 36px; margin-bottom: 20px; font-style: italic; font-family: 'Magnolia Script', cursive; color: #D4AF37;">
                Certificate of CO2 Emission</h1>

            <p style="font-size: 18px; margin: 10px 0;">This is to certify that the vehicle owned/hired by</p>
            <p style="font-size: 18px; margin: 10px 0; font-weight: bold; color: #2c3e50;" id="vehicleOwner">${userName}</p>
            <p style="font-size: 18px; margin: 10px 0;">with vehicle number</p>
            <p style="font-size: 18px; margin: 10px 0; font-weight: bold; color: #2c3e50;" id="vehicleNumber">${vehicleNumber}</p>
            <p style="font-size: 18px; margin: 10px 0;">has emitted</p>
            <p style="font-size: 18px; margin: 10px 0;"><span style="font-weight: bold; color: #2c3e50;"
                    id="co2Emission">${(co2Emission / 1000).toFixed(1)}</span> unit CO2</p>

            <!-- Signature Section -->
            <div style="margin-top: 40px; text-align: right; ">
                <img src="https://transvue.s3.ap-south-1.amazonaws.com/sign1.png" alt="Signature"
                    style="height: 50px; width: 150px; margin-left: 480px;">
                <p>Authorized Signature</p>
            </div>

            <!-- Issuer Section -->
            <div style="margin-top: 40px; text-align: center;">
                <p>Issued by:</p>
                <p style="font-weight: bold; color: #2c3e50;">Transvue Solution India Pvt. Ltd.</p>
            </div>

            <!-- Info Section -->
            <div style="display: flex;">
                <div style="text-align: left; margin: 5px 0; font-size: 7px;">
                    <p>* The above result is based on user input.</p>
                    <p>* Additional details are based on US/UK research.</p>
                </div>
                <div style="margin-left: auto; margin-right: 1px;">
                    <p>Time: <span style="font-weight: bold; color: #2c3e50;" id="time">${new Date().toLocaleTimeString()}</span></p>
                </div>
            </div>
        </div>
    </div>

    <script>
        window.onload = function () {
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const dateStr = now.toLocaleDateString('en-US', options);
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            document.getElementById('date').innerText = dateStr;
            document.getElementById('time').innerText = timeStr;
        };
    </script>
    
</body>
</html>`;

// Upload to AWS S3
const uploadPDFToS3 = async (pdfBuffer) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `certificates/${Date.now()}-certificate.pdf`,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
    };

    try {
        const uploadResponse = await s3.upload(params).promise();
        // console.log('PDF URL:', uploadResponse.Location);
        return { message: 'Upload successful', url: uploadResponse.Location };
    } catch (error) {
        console.error('S3 Upload Error:', error);
        throw new Error('Failed to upload PDF');
    }
};

// Generate PDF Using Puppeteer

const generatePDF = async ({ certificateNumber, certificateIssueDate, userName, vehicleNumber, co2Emission }) => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Convert HTML template to a PDF
    const htmlContent = pdfTemplate({ certificateNumber, certificateIssueDate, userName, vehicleNumber, co2Emission });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Ensure it stays a single page
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        width: '210mm',
        height: '297mm',
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        // scale: 0.9, // Adjust scale if content overflows
        pageRanges: '1',
    });

    await browser.close();

    return await uploadPDFToS3(pdfBuffer);
};

// Export the function
module.exports.generatePDF = generatePDF;