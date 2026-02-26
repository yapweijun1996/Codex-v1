// Test script for API endpoints
const http = require('http');

function testAPI() {
    const postData = JSON.stringify({
        message: 'What time is it in Singapore?'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log('Testing /api/chat endpoint...\n');

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('Response:');
            console.log(JSON.stringify(JSON.parse(data), null, 2));
        });
    });

    req.on('error', (error) => {
        console.error('Error:', error);
    });

    req.write(postData);
    req.end();
}

testAPI();
