require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const stream = require('stream');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Set up Multer for handling file uploads (stored in memory)
const upload = multer({ storage: multer.memoryStorage() });

// Google Drive API Configuration
const FOLDER_ID = '1YjRXRAvYqD9zZPKVo3fQEH03Srzhyh7Q';

// Authenticate with Google Drive using Service Account
// We will look for google-credentials.json in the same directory
const auth = new google.auth.GoogleAuth({
    keyFile: 'google-credentials.json',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Upload Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`Receiving file: ${req.file.originalname}`);

        // Convert the buffer to a readable stream so Google API can process it
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        // Upload to Google Drive
        const response = await drive.files.create({
            requestBody: {
                name: req.file.originalname, // File name in Drive
                parents: [FOLDER_ID],        // Upload into specific folder
            },
            media: {
                mimeType: req.file.mimetype,
                body: bufferStream,
            },
            fields: 'id, name, webViewLink',
        });

        console.log(`File uploaded successfully. ID: ${response.data.id}`);

        res.status(200).json({ 
            success: true, 
            message: 'File successfully uploaded to Google Drive!',
            file: response.data 
        });

    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file to Google Drive', details: error.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`SIMPANIN Backend running at http://localhost:${port}`);
    console.log(`Make sure to place your Google Service Account JSON key as 'google-credentials.json' in this folder.`);
});
