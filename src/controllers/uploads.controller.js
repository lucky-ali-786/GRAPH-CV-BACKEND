import { uploadFileOnCloudinary } from '../utils/cloudinary.js';
import fs from 'fs';
import { User } from '../models/users.model.js';
import { mainqueue } from '../bullmq/producer.js';
import { asynchandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/apierror.js';
import { Apiresponse } from '../utils/Apiresponse.js';
import { Job } from '../models/jobs.models.js';

export const uploadResumeImages = asynchandler(async (req, res) => {   
    const files = req.file;
    const userId = req.user._id;

    if (!files) {
        throw new ApiError(400, "No image uploaded");
    }

    // 1. Fetch user to check billing status
    const user = await User.findById(userId);
    if (!user) {
        if (files.path) fs.unlinkSync(files.path);
        throw new ApiError(404, "User not found");
    }

    // 2. Reject if out of free credits and not Pro
    if (!user.isPro && user.credits <= 0) {
        if (files.path) fs.unlinkSync(files.path);
        throw new ApiError(403, "You have run out of free credits. Please upgrade to Pro.");
    }

    // 3. Upload to Cloudinary
    const result = await uploadFileOnCloudinary(files.path);   

    // 4. Update user resume list & decrement credit if not Pro
    const updateQuery = {
        $push: { resume: { links: result.secure_url } }
    };
    if (!user.isPro) {
        updateQuery.$inc = { credits: -1 };
    }

    await User.findByIdAndUpdate(userId, updateQuery);

    // 5. Queue BullMQ job
    const job = await mainqueue.add('resume-roaster', {
        userId: userId.toString(),
        imageUrl: result.secure_url,
        type: "roast"
    });

    return res.status(200).json(
        new Apiresponse(
            200, 
            { 
                job,
                remainingCredits: user.isPro ? "Unlimited" : user.credits - 1 
            }, 
            "Roast job created successfully"
        )
    );
});

export const uploadForAtsEvaluation = asynchandler(async (req, res) => {   
    const resumeFile = req.files?.resumeImage?.[0];
    const jdFile = req.files?.jdImage?.[0];
    const userId = req.user._id;

    if (!resumeFile || !jdFile) {
        if (resumeFile) fs.unlinkSync(resumeFile.path);
        if (jdFile) fs.unlinkSync(jdFile.path);
        throw new ApiError(400, "Both Resume and Job Description images are required");
    }

    // 1. Fetch user to check billing status
    const user = await User.findById(userId);
    if (!user) {
        fs.unlinkSync(resumeFile.path);
        fs.unlinkSync(jdFile.path);
        throw new ApiError(404, "User not found");
    }

    // 2. Reject if out of free credits and not Pro
    if (!user.isPro && user.credits <= 0) {
        fs.unlinkSync(resumeFile.path);
        fs.unlinkSync(jdFile.path);
        throw new ApiError(403, "You have run out of free credits. Please upgrade to Pro.");
    }

    // 3. Upload images to Cloudinary
    const [resumeResult, jdResult] = await Promise.all([
        uploadFileOnCloudinary(resumeFile.path),
        uploadFileOnCloudinary(jdFile.path)
    ]);
    
    // 4. Update user resume list & decrement credit if not Pro
    const updateQuery = {
        $push: { resume: { links: resumeResult.secure_url } }
    };
    if (!user.isPro) {
        updateQuery.$inc = { credits: -1 };
    }

    await User.findByIdAndUpdate(userId, updateQuery);

    // 5. Queue BullMQ job
    const job = await mainqueue.add('evaluate-resume', {
        userId: userId.toString(),
        resumeImageUrl: resumeResult.secure_url, 
        jdImageUrl: jdResult.secure_url,
        type: "resume-evaluation"          
    });

    return res.status(200).json(
        new Apiresponse(
            200, 
            { 
                job,
                remainingCredits: user.isPro ? "Unlimited" : user.credits - 1 
            }, 
            "ATS Evaluation job created successfully"
        )
    );
});

export const uploadForEnhancement = asynchandler(async (req, res) => {   
    const file = req.file; 
    const userId = req.user._id;

    if (!file) {
        throw new ApiError(400, "Resume image is required for enhancement");
    }

    // 1. Fetch user to check billing status
    const user = await User.findById(userId);
    if (!user) {
        if (file.path) fs.unlinkSync(file.path);
        throw new ApiError(404, "User not found");
    }

    // 2. Reject if out of free credits and not Pro
    if (!user.isPro && user.credits <= 0) {
        if (file.path) fs.unlinkSync(file.path);
        throw new ApiError(403, "You have run out of free credits. Please upgrade to Pro.");
    }

    // 3. Upload to Cloudinary
    const result = await uploadFileOnCloudinary(file.path);   
    
    // 4. Update user resume list & decrement credit if not Pro
    const updateQuery = {
        $push: { resume: { links: result.secure_url } }
    };
    if (!user.isPro) {
        updateQuery.$inc = { credits: -1 };
    }

    await User.findByIdAndUpdate(userId, updateQuery);

    // 5. Queue BullMQ job
    const job = await mainqueue.add('enhance-resume', {
        userId: userId.toString(),
        resumeImageUrl: result.secure_url,
        type: "resume-enhancement"
    });

    return res.status(200).json(
        new Apiresponse(
            200, 
            { 
                job,
                remainingCredits: user.isPro ? "Unlimited" : user.credits - 1 
            }, 
            "Resume enhancement job created successfully"
        )
    );
});

export const getRoastHistory = asynchandler(async (req, res) => {
    const userId = req.user._id;

    const history = await Job.find({ 
        user: userId, 
        type: "roast" 
    }).sort({ createdAt: -1 });

    return res.status(200).json(
        new Apiresponse(200, history, "Roast history fetched successfully")
    );
});

export const getEvaluationHistory = asynchandler(async (req, res) => {
    const userId = req.user._id;
    const history = await Job.find({ 
        user: userId, 
        type: "resume-evaluation" 
    }).sort({ createdAt: -1 });

    return res.status(200).json(
        new Apiresponse(200, history, "ATS evaluation history fetched successfully")
    );
});

export const getEnhancementHistory = asynchandler(async (req, res) => {
    const userId = req.user._id;
    const history = await Job.find({ 
        user: userId, 
        type: "resume-enhancement" 
    }).sort({ createdAt: -1 });

    return res.status(200).json(
        new Apiresponse(200, history, "Resume enhancement history fetched successfully")
    );
});

export const getActiveRoastJobs = asynchandler(async (req, res) => {
    const userId = req.user._id.toString();
    const jobs = await mainqueue.getJobs(['waiting', 'active', 'delayed']);
    const userRoastJobs = jobs.filter(job => 
        job.name === 'resume-roaster' && job.data.userId === userId
    );
    const jobsData = await Promise.all(userRoastJobs.map(async (job) => ({
        jobId: job.id,
        state: await job.getState(),
        progress: job.progress
    })));
    return res.status(200).json(new Apiresponse(200, jobsData, "Active roast jobs fetched"));
});

export const getActiveEvaluationJobs = asynchandler(async (req, res) => {
    const userId = req.user._id.toString();
    
    const jobs = await mainqueue.getJobs(['waiting', 'active', 'delayed']);
    
    const userEvalJobs = jobs.filter(job => 
        job.name === 'evaluate-resume' && job.data.userId === userId
    );

    const jobsData = await Promise.all(userEvalJobs.map(async (job) => ({
        jobId: job.id,
        state: await job.getState(),
        progress: job.progress
    })));

    return res.status(200).json(new Apiresponse(200, jobsData, "Active evaluation jobs fetched"));
});

export const getActiveEnhancementJobs = asynchandler(async (req, res) => {
    const userId = req.user._id.toString();
    
    const jobs = await mainqueue.getJobs(['waiting', 'active', 'delayed']);
    
    const userEnhanceJobs = jobs.filter(job => 
        job.name === 'enhance-resume' && job.data.userId === userId
    );

    const jobsData = await Promise.all(userEnhanceJobs.map(async (job) => ({
        jobId: job.id,
        state: await job.getState(),
        progress: job.progress
    })));

    return res.status(200).json(new Apiresponse(200, jobsData, "Active enhancement jobs fetched"));
});

export const getMyResumeLinks = asynchandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select("resume");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const allLinks = user.resume.flatMap((item) => item.links);

    return res.status(200).json(
        new Apiresponse(
            200, 
            { 
                totalLinks: allLinks.length,
                links: allLinks, 
                resumeHistory: user.resume 
            }, 
            "Resume links fetched successfully"
        )
    );
});