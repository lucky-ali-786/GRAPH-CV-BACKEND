import { Router } from "express";
import { VerifyJwt } from "../middlewares/user_authorization.js"; 
import { dummyVerifyPayment } from "../controllers/payments.controller.js";
const router = Router();
router.route('/verify').post(VerifyJwt, dummyVerifyPayment);
export default router;