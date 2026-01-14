#!/usr/bin/env node

/**
 * Test script to verify Groq AI integration
 * Tests the /api/ai/scan endpoint with a sample URL
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function testGroqIntegration() {
    console.log('🧪 Testing Groq AI Integration...\n');

    // Test 1: Safe URL
    console.log('Test 1: Scanning Instagram (should be SAFE)');
    try {
        const response = await axios.post(`${SERVER_URL}/api/ai/scan`, {
            url: 'https://www.instagram.com/',
            userId: 'test-user'
        });

        console.log('✅ Response received:');
        console.log(`   Risk Score: ${response.data.aiAnalysis?.score || 'N/A'}/100`);
        console.log(`   Suggestion: ${response.data.aiAnalysis?.suggestion || 'N/A'}`);
        console.log(`   Reason: ${response.data.aiAnalysis?.reason || 'N/A'}`);
        console.log('');
    } catch (error) {
        console.error('❌ Test 1 Failed:', error.response?.data || error.message);
        console.log('');
    }

    // Test 2: Suspicious URL
    console.log('Test 2: Scanning suspicious URL (should be MALICIOUS)');
    try {
        const response = await axios.post(`${SERVER_URL}/api/ai/scan`, {
            url: 'https://secure-login-verify-account-now.com/',
            userId: 'test-user'
        });

        console.log('✅ Response received:');
        console.log(`   Risk Score: ${response.data.aiAnalysis?.score || 'N/A'}/100`);
        console.log(`   Suggestion: ${response.data.aiAnalysis?.suggestion || 'N/A'}`);
        console.log(`   Reason: ${response.data.aiAnalysis?.reason || 'N/A'}`);
        console.log('');
    } catch (error) {
        console.error('❌ Test 2 Failed:', error.response?.data || error.message);
        console.log('');
    }

    console.log('✨ Testing complete!');
}

// Run the test
testGroqIntegration().catch(console.error);
