import { Router } from "express";
import { loginUser, logoutUser, registerUser,getCurrentUser,refreshAccessToken,updateProfile,updateDeviceToken,updateAvatar,changePassword} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router=Router()

router.route('/register').post(
    upload.single('avatar'),  
    registerUser
);

router.route('/login').post(loginUser)

router.route('/logout').post(verifyJWT,logoutUser)

router.route('/refreshAccessToken').post(refreshAccessToken)

router.route('/profile')
    .get(verifyJWT, getCurrentUser)
    .patch(verifyJWT, updateProfile);

router.route('/avatar').patch(
    verifyJWT,
    upload.single('avatar'),
    updateAvatar
);

router.route('/password').put(
    verifyJWT,
    changePassword
);

router.route('/device-token').patch(
    verifyJWT,
    updateDeviceToken
);




export default router