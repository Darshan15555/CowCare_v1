import axiosClient from './axiosClient';

export const aiApi = {
  // Query Dual-Mode Gemini AI for cattle summary or health history questions
  getCowSummary: ({ cattleId, question, mode, requestId }) =>
    axiosClient.post('/ai/cow-summary', {
      cattleId,
      question,
      mode,
      requestId,
    }),
};
