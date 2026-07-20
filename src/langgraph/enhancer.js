import 'dotenv/config'; // Injects environment variables automatically
import { Annotation } from "@langchain/langgraph";
import { GoogleGenerativeAI } from "@google/generative-ai";

const EnhancerState = Annotation.Root({
  id: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
  resume_image: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  enhancements: Annotation({
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    default: () => [],
  }),
  final_summary: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
});

async function Experience_Enhancer(state) {
  console.log(`[Resume ${state.id}] Running Experience Enhancer...`);
  
  // Securely fetching key from .env
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_EXPERIENCE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const prompt = `You are an elite Tech Resume Writer. Analyze the Work Experience/Internship sections of the attached resume.
  Suggest specific, rewritten bullet points to maximize ATS scores.
  
  RULES FOR ENHANCEMENT:
  1. NUMBERS: Inject placeholders for metrics if missing (e.g., "Increased efficiency by [X]%").
  2. BOLDING: Recommend specific technical terms or impact metrics to be **bolded**.
  3. JARGON & ACTION VERBS: Replace weak verbs with diversified power words (e.g., "Architected," "Orchestrated," "Spearheaded").
  4. THE XYZ FORMULA: Restructure points to follow "Accomplished [X] as measured by [Y], by doing [Z]".
  5. UNPACK ACRONYMS: Ensure both the acronym and full term are present for maximum ATS matching (e.g., "Application Programming Interface (API)").
  
  OUTPUT FORMAT:
  NODE: EXPERIENCE
  ENHANCEMENTS: [List 3-5 highly optimized bullet point suggestions]`;

  const result = await model.generateContent([prompt, state.resume_image]);
  return { enhancements: [result.response.text()] };
}

async function Projects_Enhancer(state) {
  console.log(`[Resume ${state.id}] Running Projects Enhancer...`);
  
  // Securely fetching key from .env
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_PROJECTS_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const prompt = `You are a Senior Engineering Manager reviewing a candidate's Personal Projects on the attached resume.
  Suggest specific rewrites to make the projects sound more complex and production-ready for ATS scanners.
  
  RULES FOR ENHANCEMENT:
  1. NUMBERS: Add scale metrics (e.g., "Handled [X] concurrent background jobs using BullMQ", "Reduced query latency by [X]ms").
  2. BOLDING: Highlight tech stack keywords (e.g., **Redis**, **MERN**) and architecture terms.
  3. JARGON & ACTION VERBS: Elevate the language (e.g., use "Containerized," "Implemented pub/sub," "Optimized").
  4. BUSINESS VALUE: Link technical implementation to a tangible outcome (e.g., "ensuring zero data loss during high concurrency").
  5. EXACT KEYWORD MATCHING: Standardize technology names to their most common ATS search format (e.g., "Node.js" not "Nodejs").
  
  OUTPUT FORMAT:
  NODE: PROJECTS
  ENHANCEMENTS: [List 3-5 highly optimized bullet point suggestions]`;

  const result = await model.generateContent([prompt, state.resume_image]);
  return { enhancements: [result.response.text()] };
}

async function Achievements_Enhancer(state) {
  console.log(`[Resume ${state.id}] Running Achievements Enhancer...`);
  
  // Securely fetching key from .env
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_ACHIEVEMENTS_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const prompt = `You are an ATS Optimization Expert. Analyze the Certifications, Achievements, or Extracurricular sections of the attached resume.
  
  RULES FOR ENHANCEMENT:
  1. NUMBERS: Quantify achievements (e.g., "Ranked top [X]% out of [Y] competitors", "Led a team of [X]").
  2. BOLDING: Highlight the name of the award, the granting institution, or the core skill demonstrated.
  3. JARGON & ACTION VERBS: Use strong verbs (e.g., "Awarded," "Recognized," "Led").
  4. CONTEXTUALIZE SCALE: Don't just list the achievement; clarify the scope. (e.g., "Selected from a pool of 5,000+ applicants").
  5. RELEVANCE ANCHORING: Tie the achievement back to a core engineering competency where possible (e.g., "demonstrating advanced problem-solving in data structures").
  
  OUTPUT FORMAT:
  NODE: ACHIEVEMENTS
  ENHANCEMENTS: [List 2-4 highly optimized suggestions]`;

  const result = await model.generateContent([prompt, state.resume_image]);
  return { enhancements: [result.response.text()] };
}

async function Final_Decision(state) {
  console.log(`[Resume ${state.id}] Running Final Synthesis...`);
  
  // Securely fetching key from .env
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_FINAL_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const reports = state.enhancements.join("\n\n--- NEXT ENHANCEMENT REPORT ---\n\n");
  
  const prompt = `You are a Master Career Coach. Review the following 3 enhancement reports for a candidate's resume:
  ${reports}
  
  Synthesize these suggestions into a clean, actionable JSON payload that a frontend application can render to the user.
  
  Output strictly in JSON format using the following structure:
  {
    "experience_upgrades": ["Array of the best rewritten experience bullets with **markdown bolding**"],
    "project_upgrades": ["Array of the best rewritten project bullets with **markdown bolding**"],
    "achievement_upgrades": ["Array of the best rewritten achievement bullets with **markdown bolding**"],
    "general_ats_advice": "A short, 2-sentence summary on what words or metrics the candidate is lacking the most."
  }`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  return { final_summary: result.response.text() };
}

export { EnhancerState, Experience_Enhancer, Projects_Enhancer, Achievements_Enhancer, Final_Decision };