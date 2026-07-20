import { Router } from 'express';
import { VerifyJwt } from '../middlewares/user_authorization.js'
import {
    register,
    login,
    logout,
    getcurrentuser,
} from '../controllers/users.controller.js'
const router = Router();
router.route('/register').post(register);
router.route("/login").post(login);
router.route('/logout').post(VerifyJwt, logout);
router.route('/getcurrentuser').get(VerifyJwt, getcurrentuser)
export default router;
