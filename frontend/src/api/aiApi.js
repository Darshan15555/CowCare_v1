import axiosClient from './axiosClient';

export const aiApi = {
  // Conversational Chat with CowCare AI (Grounded in MongoDB with Conversation Memory)
  chat: ({ cattleId, message, conversationHistory = [], mode, language, requestId }) =>
    axiosClient.post('/ai/chat', {
      cattleId,
      message,
      conversationHistory,
      mode,
      language,
      requestId,
    }),

  // Backwards-compatible Cow Summary helper
  getCowSummary: ({ cattleId, question, mode, requestId }) =>
    axiosClient.post('/ai/chat', {
      cattleId,
      message: question,
      conversationHistory: [],
      mode,
      requestId,
    }),
};
