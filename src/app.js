import express from 'express'
import http from 'http'
import cookieParser from 'cookie-parser';
import cors from 'cors'
import { createRequire } from 'module'; 
const require = createRequire(import.meta.url); 
const swaggerUi = require('swagger-ui-express'); 
const swaggerDocument = require('./utils/swagger-output.json');
const app = express();
const server=http.createServer(app);
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], 
    credentials: true 
}));
app.use(express.json({ limit: '200kb' }))
app.use(cookieParser())
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"));
import userrouter from './routes/user.routes.js'
import resumeroutes from './routes/resume.routes.js'
import paymentroutes from './routes/payment.routes.js'
app.use('/users/api/v1',userrouter)
app.use('/resume/api/v1',resumeroutes)
app.use('/payments',paymentroutes)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
export {app,server};
