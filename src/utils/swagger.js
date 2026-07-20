import swaggerAutogen from 'swagger-autogen';
import dotenv from 'dotenv';
dotenv.config();

// Determine if running in production (Render) or local
const isProduction = process.env.NODE_ENV === 'production';

const doc = {
  info: {
    title: 'Graph CV API 🚀',
    description: 'API documentation for Graph CV: AI-Powered Resume Roaster & ATS Evaluator'
  },
  // Exact Render URL without http:// or https://
  host: isProduction ? 'graphcv-api.onrender.com' : 'localhost:8000',
  schemes: isProduction ? ['https'] : ['http'],
};

const outputFile = './swagger-output.json';
const routes = ['../app.js']; 

swaggerAutogen()(outputFile, routes, doc);
