const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'public', 'models');

// Ensure directory exists
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const models = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {}); // Delete the file on error
            reject(err);
        });
    });
}

async function start() {
    console.log("🚀 Starting Face-API models download...");
    
    for (const model of models) {
        const url = `${baseUrl}${model}`;
        const dest = path.join(modelsDir, model);
        
        process.stdout.write(`📥 Downloading ${model}... `);
        try {
            await downloadFile(url, dest);
            console.log("✅");
        } catch (err) {
            console.log("❌");
            console.error(`Error downloading ${model}: ${err.message}`);
        }
    }
    
    console.log("\n✨ Download complete. Models are ready in /public/models/");
}

start();
