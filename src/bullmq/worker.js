import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'bullmq';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StateGraph, START, END } from "@langchain/langgraph";
import http from 'http'; // 🚀 Added HTTP module for Health Server

import { 
  EvaluatorState, JD_Summarizer, R1, R2, R3, Final_Decision as Evaluator_Final_Decision
} from '../langgraph/main.js';
import { 
  EnhancerState, Experience_Enhancer, Projects_Enhancer, Achievements_Enhancer, Final_Decision as Enhancer_Final_Decision 
} from '../langgraph/enhancer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize dotenv configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); 

const { default: connectDB } = await import('../db/db.js');
const { connection } = await import('../db/redis.js');
const { Job } = await import('../models/jobs.models.js');

await connectDB();
console.log("Worker connected to MongoDB Atlas");

async function fetchImageToGeminiPart(imageUrl) {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType: "image/jpeg" 
    }
  };
}

const evaluatorApp = new StateGraph(EvaluatorState)
  .addNode("JD_Summarizer", JD_Summarizer)
  .addNode("R1", R1)
  .addNode("R2", R2)
  .addNode("R3", R3)
  .addNode("Final_Decision", Evaluator_Final_Decision)
  .addEdge(START, "JD_Summarizer")
  .addEdge("JD_Summarizer", "R1")
  .addEdge("JD_Summarizer", "R2")
  .addEdge("JD_Summarizer", "R3")
  .addEdge(["R1", "R2", "R3"], "Final_Decision") 
  .addEdge("Final_Decision", END)
  .compile();

const enhancerApp = new StateGraph(EnhancerState)
  .addNode("Experience_Enhancer", Experience_Enhancer)
  .addNode("Projects_Enhancer", Projects_Enhancer)
  .addNode("Achievements_Enhancer", Achievements_Enhancer)
  .addNode("Final_Decision", Enhancer_Final_Decision)
  .addEdge(START, "Experience_Enhancer")
  .addEdge(START, "Projects_Enhancer")
  .addEdge(START, "Achievements_Enhancer")
  .addEdge(["Experience_Enhancer", "Projects_Enhancer", "Achievements_Enhancer"], "Final_Decision") 
  .addEdge("Final_Decision", END)
  .compile();

const worker = new Worker('roast-queue', async (bullJob) => {
  console.log(`[Worker] Picked up job ${bullJob.id} of type: ${bullJob.name}`);

  if (bullJob.name === 'resume-roaster') {
    return handleRoast(bullJob);
  } else if (bullJob.name === 'evaluate-resume') {
    return handleResumeEvaluation(bullJob);
  } else if (bullJob.name === 'enhance-resume') {
    return handleResumeEnhancement(bullJob);
  } else {
    throw new Error(`Unknown job name: ${bullJob.name}`);
  }
}, { connection });

async function handleRoast(bullJob) {
  const { userId, imageUrl } = bullJob.data;
  console.log(`Starting Roast for user ${userId}`);
  
  await Job.findOneAndUpdate(
    { jobId: bullJob.id },
    { 
      $set: {
        user: userId,
        status: 'ACTIVE',
        resumeLinkUsed: imageUrl,
        type:"roast"
      }
    },
    { upsert: true, new: true }
  );

  const imagePart = await fetchImageToGeminiPart(imageUrl);
  
  // Security Upgrade: Fetching key dynamically from environment
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_ROAST_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const systemPrompt = "YOU ARE A RESUME ROASTER AI WHO ROASTS THE GIVEN RESUME NO GREETINGS NO SALUTATION NO ACKNOWLEDGEMENTS ONLY ROAST THE GIVEN RESUME IMAGE AND GIVE CLEAN TEXT AS OUTPUT roast it the funny way u can";
  
  console.log(`Sending image to Gemini for job ${bullJob.id}...`);
  const aiResponse = await model.generateContent([systemPrompt, imagePart]);
  const roastText = aiResponse.response.text();
  
  await Job.findOneAndUpdate(
    { jobId: bullJob.id },
    { 
      status: 'COMPLETED',
      result: { roast: roastText } 
    }
  );
  
  return roastText;
}

async function handleResumeEvaluation(bullJob) {
  const { userId, resumeImageUrl, jdImageUrl } = bullJob.data;
  console.log(`Starting LangGraph Pipeline (Evaluation) for job ${bullJob.id}...`)
  
  await Job.findOneAndUpdate(
    { jobId: bullJob.id },
    { 
      $set: {
        user: userId,
        status: 'ACTIVE',
        resumeLinkUsed: resumeImageUrl || 'missing',
        jd: jdImageUrl || 'missing',
        type:"resume-evaluation"
      }
    },
    { upsert: true, new: true }
  );

  if (!resumeImageUrl || !jdImageUrl) {
    throw new Error(`Missing URLs! Resume: ${resumeImageUrl}, JD: ${jdImageUrl}`);
  }

  const [resumeImagePart, jdImagePart] = await Promise.all([
    fetchImageToGeminiPart(resumeImageUrl),
    fetchImageToGeminiPart(jdImageUrl)
  ]);
  
  const initialState = {
    id: String(bullJob.id), 
    jd_image: jdImagePart,         
    resume_image: resumeImagePart, 
    results: [],            
    final_verdict: ""
  };

  const finalState = await evaluatorApp.invoke(initialState);
  const verdictJSON = JSON.parse(finalState.final_verdict);
  
  await Job.findOneAndUpdate(
    { jobId: bullJob.id },
    { 
      $set: { status: 'COMPLETED', result: verdictJSON } 
    }
  );
  
  console.log(`Evaluation Job ${bullJob.id} finished successfully.`);
  return;
}

async function handleResumeEnhancement(bullJob) {
  const { userId, resumeImageUrl } = bullJob.data;
  console.log(`Starting LangGraph Pipeline (Enhancer) for job ${bullJob.id}...`)
  
  // 1. Update DB to ACTIVE
  await Job.findOneAndUpdate(
    { jobId: bullJob.id },
    { 
      $set: {
        user: userId,
        status: 'ACTIVE',
        resumeLinkUsed: resumeImageUrl || 'missing',
        type:"resume-enhancement"
      }
    },
    { upsert: true, new: true }
  );

  if (!resumeImageUrl) {
    throw new Error(`Missing URL! Resume: ${resumeImageUrl}`);
  }
  const resumeImagePart = await fetchImageToGeminiPart(resumeImageUrl);
  const initialState = {
    id: String(bullJob.id),         
    resume_image: resumeImagePart, 
    enhancements: [],            
    final_summary: ""
  };
  
  const finalState = await enhancerApp.invoke(initialState);
  const finalUpgradesJSON = JSON.parse(finalState.final_summary);
  
  await Job.findOneAndUpdate(
    { jobId: bullJob.id },
    { 
      $set: { status: 'COMPLETED', result: finalUpgradesJSON } 
    }
  );
  
  console.log(`Enhancer Job ${bullJob.id} finished successfully.`);
  return;
}

worker.on('completed', (bullJob, returnvalue) => {
  console.log(`Job ${bullJob.id} (${bullJob.name}) completed execution.`);
});

worker.on('failed', async (bullJob, err) => {
  console.error(`Job ${bullJob.id} (${bullJob.name}) failed:`, err.message);
  await Job.findOneAndUpdate(
    { jobId: bullJob.id },
    { 
      status: 'FAILED',
      result: { error: err.message }
    }
  );
});

// 🚀 HEALTH CHECK SERVER FOR RENDER
// Render needs to bind to a port to know the worker is alive.
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', message: 'Graph CV Worker is alive and processing jobs' }));
}).listen(PORT, () => {
  console.log(`[Health Check] Server listening on port ${PORT}`);
});

export default worker;
