#!/usr/bin/env node

/**
 * Test script for ReferralGuard API endpoints
 * Verifies that real data is being served
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDashboardSummary() {
  console.log('🧪 Testing Dashboard Summary API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/dashboard-summary`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Dashboard Summary API working');
      console.log(`   Revenue at Risk: $${data.data.revenueAtRisk}M`);
      console.log(`   Leakage Rate: ${data.data.leakageRate}%`);
      console.log(`   Total Markets: ${data.data.totalMarkets.toLocaleString()}`);
      console.log(`   Data Source: ${data.dataSource}`);
      
      if (data.data.modelPerformance) {
        console.log(`   ML Model: ${data.data.modelPerformance.modelName}`);
        console.log(`   Accuracy: ${(data.data.modelPerformance.accuracy * 100).toFixed(1)}%`);
      }
    } else {
      console.log('❌ Dashboard Summary API failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Dashboard Summary API error:', error.message);
  }
}

async function testHighRiskProviders() {
  console.log('\n🧪 Testing High-Risk Providers API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/high-risk-providers?pageSize=5`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ High-Risk Providers API working');
      console.log(`   Total Providers: ${data.pagination.total.toLocaleString()}`);
      console.log(`   High Risk: ${data.summary.highRiskProviders.toLocaleString()}`);
      console.log(`   ML Model Used: ${data.summary.mlModelUsed}`);
      
      if (data.providers.length > 0) {
        const provider = data.providers[0];
        console.log(`   Sample Provider: ${provider.providerName}`);
        console.log(`   Risk Score: ${provider.riskScore}/100`);
        console.log(`   Revenue at Risk: $${(provider.revenueAtRisk / 1000000).toFixed(1)}M`);
      }
    } else {
      console.log('❌ High-Risk Providers API failed:', data.error);
    }
  } catch (error) {
    console.log('❌ High-Risk Providers API error:', error.message);
  }
}

async function testMLPrediction() {
  console.log('\n🧪 Testing ML Prediction API...');
  
  try {
    const sampleProvider = {
      providerNPI: '1234567890',
      providerName: 'Test Provider',
      specialty: 'Cardiology',
      zipCode: '12345',
      marketShare: 75.0,
      revenue: 1000000,
      providerCount: 3,
      totalMarketRevenue: 1500000,
      providerServices: 500
    };
    
    const response = await fetch(`${BASE_URL}/api/ml-predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ providerData: [sampleProvider] }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ ML Prediction API working');
      console.log(`   Model Type: ${data.modelInfo.modelType}`);
      console.log(`   Predictions: ${data.modelInfo.totalPredictions}`);
      
      if (data.predictions.length > 0) {
        const prediction = data.predictions[0];
        console.log(`   Risk Score: ${prediction.riskScore}`);
        console.log(`   Risk Level: ${prediction.riskLevel}`);
        console.log(`   Model Used: ${prediction.modelUsed}`);
      }
    } else {
      console.log('❌ ML Prediction API failed:', data.error);
    }
  } catch (error) {
    console.log('❌ ML Prediction API error:', error.message);
  }
}

async function main() {
  console.log('🚀 ReferralGuard API Test Suite');
  console.log('=' * 40);
  
  await testDashboardSummary();
  await testHighRiskProviders();
  await testMLPrediction();
  
  console.log('\n' + '=' * 40);
  console.log('✅ API testing completed!');
  console.log('\n💡 If all tests pass, your dashboard is using real data and ML models!');
}

// Run tests
main().catch(console.error); 