import express from 'express'
import { isVerifiedAndAuthenticated } from '../middlewares/authMiddleware.js'
import { getConversations, initiateConversation, sendMessage } from '../controllers/conversationController.js'

const conversationRouter = express.Router()

conversationRouter.post('/initiate/:username', isVerifiedAndAuthenticated, initiateConversation)

conversationRouter.get('/', isVerifiedAndAuthenticated, getConversations)

conversationRouter.post('/:conversationId/messages/send', isVerifiedAndAuthenticated, sendMessage)

export default conversationRouter