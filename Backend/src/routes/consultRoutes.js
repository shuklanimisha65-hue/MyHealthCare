import { Router } from "express"
import {
    createConsultation,
    addPrescription,
    archiveConsultation,
    completeConsultation,
    setFollowUp,
    sendMessage,
    getActiveConsultations,
    getRecentConsultations,
    getFollowUpsDue,
    getUserStats,
    getConsultationById,
    rateConsultation

} from "../controllers/consult.consultation.js"
import {verifyJWT} from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'
const router=Router();

router.route('/').post(verifyJWT, upload.single('file'), createConsultation)

router.route('/recent').get(verifyJWT, getRecentConsultations)
router.route('/active').get(verifyJWT, getActiveConsultations)
router.route('/followUps-due').get(verifyJWT, getFollowUpsDue)
router.route('/userstats').get(verifyJWT, getUserStats)

router.route('/:consultationId').get(verifyJWT, getConsultationById)
router.route('/:consultationId/message').post(verifyJWT, sendMessage)
router.route('/:consultationId/prescription').post(verifyJWT, addPrescription)
router.route('/:consultationId/archive').patch(verifyJWT, archiveConsultation)
router.route('/:consultationId/complete').patch(verifyJWT, completeConsultation)
router.route('/:consultationId/followUp').patch(verifyJWT, setFollowUp)
router.route('/:consultationId/rate').post(verifyJWT, rateConsultation)

export default router
