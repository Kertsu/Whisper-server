import express from 'express'
import { isVerifiedAndAuthenticated } from '../middlewares/authMiddleware.js'
import { initiateConversation } from '../controllers/conversationController.js'

const conversationRouter = express.Router()

conversationRouter.post('/initiate/:username', isVerifiedAndAuthenticated, initiateConversation)

export default conversationRouter