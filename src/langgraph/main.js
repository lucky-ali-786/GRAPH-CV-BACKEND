import 'dotenv/config'; // Injects environment variables automatically
import { Annotation } from "@langchain/langgraph";
import { GoogleGenerativeAI } from "@google/generative-ai";

const EvaluatorState = Annotation.Root({
  id: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
  jd_image: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  resume_image: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  results: Annotation({
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    default: () => [],
  }),
  final_verdict: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
});

async function JD_Summarizer(state) {
  console.log(`[Job ${state.id}] Running JD_Summarizer...`);
  
  // Securely fetching key from .env
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_JD_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const prompt = `Summarize this Job Description specifically for an ATS resume checker. 
  Extract core requirements, mandatory skills, and years of experience. 
  No greetings, no salutations, no fluff. Output clean, raw text only.`;
  
  const result = await model.generateContent([prompt, state.jd_image]);
  return { results: [result.response.text()] };
}

async function R1(state) {
  console.log(`[Job ${state.id}] Running R1 (Fact Checker)...`);
  
  // Securely fetching key from .env
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_R1_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const jdSummary = state.results[0] || "No JD provided.";
  const prompt = `Act as a binary ATS Compliance Checker. Your ONLY job is to verify the literal presence of requirements from the Job Description against the attached Resume images. Do not evaluate the quality of the work.
  JD SUMMARY:\n${jdSummary}\n
  OUTPUT EXACTLY IN THIS FORMAT (No greetings, no markdown):
  NODE_TYPE: FACT_CHECKER\nSCORE: [0-100]\nVERIFIED_SKILLS: [Comma-separated list]\nMISSING_MANDATORY: [List]`;
  
  const result = await model.generateContent([prompt, state.resume_image]);
  return { results: [result.response.text()] };
}

async function R2(state) {
  console.log(`[Job ${state.id}] Running R2 (Fluff Detector)...`);
  
  // Securely fetching key from .env
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_R2_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const jdSummary = state.results[0] || "No JD provided.";
  const prompt = `Act as a Cynical Technical Recruiter. Detect exaggerated claims and "keyword stuffing" in the Resume based on this Job Description:
  ${jdSummary}\nRULES: 1. Ignore standalone "Skills" sections entirely. 2. Only award credit if a technology is contextualized in a bullet point.
  OUTPUT EXACTLY IN THIS FORMAT:
  NODE_TYPE: CONTEXT_ANALYZER\nSCORE: [0-100]\nFLUFF_FLAGGED: [List]\nEVIDENCE_BACKED_MATCHES: [List]`;

  const result = await model.generateContent([prompt, state.resume_image]);
  return { results: [result.response.text()] };
}

async function R3(state) {
  console.log(`[Job ${state.id}] Running R3 (Engineering Manager)...`);
  
  // Securely fetching key from .env
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_R3_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const jdSummary = state.results[0] || "No JD provided.";
  const prompt = `Act as a Senior Engineering Manager. Evaluate the technical depth and architectural complexity of the Resume against this Job Description:
  ${jdSummary}\nRULES: Evaluate problem-solving scope. Are they building production-grade systems or just basic tutorials?
  OUTPUT EXACTLY IN THIS FORMAT:
  NODE_TYPE: TECH_LEAD\nSCORE: [0-100]\nFIT: [Reject | Weak | Potential | Strong]\nARCHITECTURE_NOTES: [One sentence]`;

  const result = await model.generateContent([prompt, state.resume_image]);
  return { results: [result.response.text()] };
}

async function Final_Decision(state) {
  console.log(`[Job ${state.id}] Running Final_Decision...`);
  
  // Securely fetching key from .env
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_EVAL_FINAL_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const reports = state.results.slice(1).join("\n\n--- NEXT REPORT ---\n\n");
  const prompt = `You are the Head of Talent Acquisition. Review the following 3 sub-evaluations for a candidate:
  ${reports}
  
  Synthesize these reports into a final, definitive hiring decision. 
  Output strictly in JSON format using the following structure:
  {
    "overall_score": 0-100,
    "final_fit": "Reject" | "Weak" | "Potential" | "Strong",
    "critical_flags": ["list of major concerns"],
    "executive_summary": "2-sentence final justification"
  }`;
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  return { final_verdict: result.response.text() };
}

export { EvaluatorState, JD_Summarizer, R1, R2, R3, Final_Decision };