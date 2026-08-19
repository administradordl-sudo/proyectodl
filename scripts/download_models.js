const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, '../public/models');

if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

const files = [
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model.weights.bin',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model.weights.bin',
    'ssd_mobilenet_v1_model-weights_manifest.json',
    'ssd_mobilenet_v1_model.weights.bin'
];

async function downloadFile(filename) {
    const url = baseUrl + filename;
    const dest = path.join(modelsDir, filename);
    
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {}); 
            reject(err);
        });
    });
}

async function main() {
    console.log('Downloading face-api models...');
    for (const file of files) {
        console.log(`Downloading ${file}...`);
        try {
            await downloadFile(file);
            console.log(`Successfully downloaded ${file}`);
        } catch (error) {
            console.error(`Error downloading ${file}:`, error.message);
        }
    }
    console.log('Done.');
}

main();
