#!/usr/bin/env node

const axios = require('axios');

async function testEnhancedAI() {
    console.log('🧪 Testing Enhanced AI Analysis...\n');

    // Test with a university website (should be SAFE with detailed analysis)
    try {
        const response = await axios.post('http://localhost:3000/api/ai/scan', {
            url: 'https://www.bput.ac.in/'
        });

        console.log('✅ BPUT University Analysis:');
        console.log('─'.repeat(60));
        console.log(`Risk Score: ${response.data.aiAnalysis?.score}/100`);
        console.log(`Suggestion: ${response.data.aiAnalysis?.suggestion}`);
        console.log(`\nDetailed Analysis:\n${response.data.aiAnalysis?.reason}`);

        if (response.data.aiAnalysis?.threatIndicators?.length > 0) {
            console.log('\nThreat Indicators:');
            response.data.aiAnalysis.threatIndicators.forEach(t => console.log(`  • ${t}`));
        }

        if (response.data.aiAnalysis?.confidence) {
            console.log(`\nConfidence: ${response.data.aiAnalysis.confidence.toUpperCase()}`);
        }
        console.log('─'.repeat(60));
        console.log('');
    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }

    // Test with a suspicious URL
    try {
        const response = await axios.post('http://localhost:3000/api/ai/scan', {
            url: 'https://secure-bank-login-verify-account.com/'
        });

        console.log('⚠️  Suspicious URL Analysis:');
        console.log('─'.repeat(60));
        console.log(`Risk Score: ${response.data.aiAnalysis?.score}/100`);
        console.log(`Suggestion: ${response.data.aiAnalysis?.suggestion}`);
        console.log(`\nDetailed Analysis:\n${response.data.aiAnalysis?.reason}`);

        if (response.data.aiAnalysis?.threatIndicators?.length > 0) {
            console.log('\nThreat Indicators:');
            response.data.aiAnalysis.threatIndicators.forEach(t => console.log(`  • ${t}`));
        }

        if (response.data.aiAnalysis?.confidence) {
            console.log(`\nConfidence: ${response.data.aiAnalysis.confidence.toUpperCase()}`);
        }
        console.log('─'.repeat(60));
    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

testEnhancedAI();
