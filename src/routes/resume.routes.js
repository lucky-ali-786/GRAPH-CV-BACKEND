import express from 'express';
import { upload } from '../middlewares/multer.js'; 
import { VerifyJwt } from '../middlewares/user_authorization.js'; 
import { 
  uploadResumeImages, 
  uploadForAtsEvaluation,
  uploadForEnhancement,
    getActiveRoastJobs,
    getActiveEvaluationJobs,
    getActiveEnhancementJobs,
    getRoastHistory,
    getEvaluationHistory,
    getEnhancementHistory,
    getMyResumeLinks
} from '../controllers/uploads.controller.js';

const router = express.Router();

router.post(
  '/upload', 
  VerifyJwt, 
  upload.single('resume'), 
  uploadResumeImages
);
router.route('/evaluate').post(
    VerifyJwt,
    upload.fields([
        { name: 'resumeImage', maxCount: 1 },
        { name: 'jdImage', maxCount: 1 }
    ]),
    uploadForAtsEvaluation
);
router.route('/enhance').post(
    VerifyJwt,
    upload.single('resumeImage'),
    uploadForEnhancement
);
router.route('/active/roasts').get(VerifyJwt,getActiveRoastJobs);
router.route('/active/evaluations').get(VerifyJwt,getActiveEvaluationJobs);
router.route('/active/enhancements').get(VerifyJwt,getActiveEnhancementJobs);
router.route('/history/roasts').get(VerifyJwt,getRoastHistory);
router.route('/history/evaluations').get(VerifyJwt,getEvaluationHistory);
router.route('/history/enhancements').get(VerifyJwt,getEnhancementHistory);
router.route('/myresumes').get(VerifyJwt,getMyResumeLinks);
export default router;