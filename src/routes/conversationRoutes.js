import express from 'express'
import { isVerifiedAndAuthenticated } from '../middlewares/authMiddleware.js'
import { getConversations, initiateConversation } from '../controllers/conversationController.js'

const conversationRouter = express.Router()

conversationRouter.post('/initiate/:username', isVerifiedAndAuthenticated, initiateConversation)

conversationRouter.get('/', isVerifiedAndAuthenticated, getConversations)

export default conversationRouter