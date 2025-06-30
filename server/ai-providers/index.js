import { enrichGameListMock } from './mock.js';
import { enrichGameListGemini } from './gemini.js';
import { enrichGameListGithub } from './github.js';

export const enrichGameList = async (provider, gameList, apiKeys, externalApiTimeout) => {
    switch (provider) {
        case 'gemini':
            return enrichGameListGemini(gameList, apiKeys.GEMINI_API_KEY, apiKeys.GEMINI_MODEL_NAME, externalApiTimeout);
        case 'github':
            return enrichGameListGithub(gameList);
        case 'mock':
            return enrichGameListMock(gameList);
        default:
            throw new Error(`Unknown AI provider: ${provider}`);
    }
};