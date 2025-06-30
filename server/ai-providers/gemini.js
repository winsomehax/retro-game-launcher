import axios from 'axios';

export const enrichGameListGemini = async (gameList, GEMINI_API_KEY, GEMINI_MODEL_NAME, EXTERNAL_API_TIMEOUT) => {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured.');
    }

    const modelName = GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const gameTitles = gameList.map(game => game.title).join(', ');
    const prompt = `For the following game titles: ${gameTitles}, provide a short, engaging description for each, suitable for a game library. `+
    `Return the data as a pure valid JSON array where each object has "title", "description", "genre", "release" fields. You must NOT return `+
    `anything other than valid JSON that can be used directly. No extra characters or words or labelling it "json".`;

    const contents = [{ "parts": [{ "text": prompt }] }];

    try {
        const apiResponse = await axios.post(targetUrl, { contents }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: EXTERNAL_API_TIMEOUT,
        });

        const contentType = apiResponse.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            if (apiResponse.data.candidates && apiResponse.data.candidates.length > 0) {
                const generatedText = apiResponse.data.candidates[0].content.parts[0].text;
                try {
                    const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/);
                    let enrichedData;
                    if (jsonMatch && jsonMatch[1]) {
                        enrichedData = JSON.parse(jsonMatch[1]);
                    } else {
                        enrichedData = JSON.parse(generatedText);
                    }
                    return enrichedData;
                } catch (parseError) {
                    console.error("Gemini enrich-gamelist: Error parsing generated text as JSON:", parseError.message);
                    console.error("Gemini raw response text for parsing error:", generatedText);
                    throw new Error('Failed to parse game enrichment data from Gemini.');
                }
            } else {
                console.warn("Gemini enrich-gamelist: No candidates or unexpected JSON structure.", apiResponse.data);
                throw new Error('No enrichment data returned from Gemini.');
            }
        } else {
            throw new Error(`Gemini enrich-gamelist returned non-JSON response. Content-Type: ${contentType}`);
        }
    } catch (error) {
        console.error("Gemini enrich-gamelist request failed:", error.message);
        if (error.response) {
            const contentType = error.response.headers['content-type'];
            let responseData = error.response.data;
            let errorDetails = responseData;

            if (contentType && contentType.includes('application/json')) {
                errorDetails = responseData.error || responseData; 
                throw new Error(`Error from Gemini API (enrich): ${errorDetails.message || 'Unknown error'}`);
            } else {
                throw new Error(`Error from Gemini API (enrich, non-JSON response). Status: ${error.response.status}, Content-Type: ${contentType}`);
            }
        } else if (error.request) {
            throw new Error('Gateway Timeout: No response from Gemini API (enrich).');
        } else {
            throw new Error('Internal Server Error while calling Gemini API for game list enrichment.');
        }
    }
};