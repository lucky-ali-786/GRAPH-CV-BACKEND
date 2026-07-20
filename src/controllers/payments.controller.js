import { asynchandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/apierror.js';
import { Apiresponse } from '../utils/Apiresponse.js';
import { User } from '../models/users.model.js';
export const dummyVerifyPayment = asynchandler(async (req, res) => {
    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, {
        $set: { isPro: true }
    });
    return res.status(200).json(
        new Apiresponse(
            200, 
            { paymentId: `dummy_tx_${Date.now()}` }, 
            "Dummy payment successful. Account upgraded to Pro."
        )
    );
});