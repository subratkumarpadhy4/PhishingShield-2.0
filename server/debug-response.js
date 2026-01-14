#!/usr/bin/env node

const axios = require('axios');

async function quickTest() {
    try {
        const response = await axios.post('http://localhost:3000/api/ai/scan', {
            url: 'https://www.instagram.com/'
        });

        console.log('Full Response:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Response data:', error.response.data);
        }
    }
}

quickTest();
