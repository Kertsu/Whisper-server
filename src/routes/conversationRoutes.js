import express from 'express'
import { isVerifiedAndAuthenticated } from '../middlewares/authMiddleware.js'
import { getConversations, getMessages, initiateConversation, sendMessage, updateMessage } from '../controllers/conversationController.js'

const conversationRouter = express.Router()

conversationRouter.post('/initiate/:username', isVerifiedAndAuthenticated, initiateConversation)

conversationRouter.get('/', isVerifiedAndAuthenticated, getConversations)

conversationRouter.post('/:conversationId/messages/send', isVerifiedAndAuthenticated, sendMessage)

conversationRouter.get('/:conversationId/messages', isVerifiedAndAuthenticated, getMessages)

conversationRouter.patch('/:conversationId/messages/:messageId', isVerifiedAndAuthenticated, updateMessage)

export default conversationRouter