import dotenv from 'dotenv';
dotenv.config();

import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const DEFAULT_MODEL = 'llama-3.1-8b-instant';

export const getGroqResponse = async (messages, options = {}) => {
    try {
        const response = await groq.chat.completions.create({
            model: options.model || DEFAULT_MODEL,
            max_tokens: options.maxTokens || 300,
            messages: messages,
            temperature: options.temperature || 0.7
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error('Groq API Error:', error.message);

        if (error.status === 429) {
            throw new Error('AI service rate limit exceeded. Please try again in a moment.');
        }

        if (error.status === 401) {
            throw new Error('AI service authentication failed. Check API key.');
        }

        if (error.status === 500) {
            throw new Error('AI service is experiencing issues. Please try again.');
        }

        throw new Error('AI service temporarily unavailable. Please try again.');
    }
};

export const getGroqResponseWithRetry = async (messages, maxRetries = 3, options = {}) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`AI attempt ${attempt}/${maxRetries}`);

            const response = await getGroqResponse(messages, options);

            console.log(`AI response received (${response.length} chars)`);
            return response;

        } catch (error) {
            lastError = error;
            console.error(`AI attempt ${attempt} failed:`, error.message);

            if (error.message.includes('authentication')) {
                throw error;
            }

            if (attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`Waiting ${waitTime/1000}s before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    console.error('All AI retry attempts failed');
    throw lastError;
};

export const analyzeImage = async (imageBuffer) => {
    try {
        console.log('Analyzing image with AI...');

        const base64Image = imageBuffer.toString('base64');

        const response = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            max_tokens: 512,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        },
                        {
                            type: 'text',
                            text: 'Analyze this medical symptom image. Describe what you observe (color, texture, size, location) without providing a diagnosis. Keep it brief and objective.'
                        }
                    ]
                }
            ]
        });
        
        console.log('Image analysis complete');
        return response.choices[0].message.content;

    } catch (error) {
        console.error('Image analysis failed:', error.message);
        return null;
    }
};

export const buildConversationHistory = (consultation) => {
    const messages = [];

    consultation.chatHistory.forEach(msg => {
        messages.push({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.message
        });
    });

    return messages;
};

export const getConsultationSummary = async (consultation) => {
    try {
        const { buildSummaryPrompt } = await import('./buildAIPrompt.js');
        const prompt = buildSummaryPrompt(consultation);

        console.log('Requesting consultation summary from AI...');

        const response = await getGroqResponse([
            { role: 'user', content: prompt }
        ]);

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('Summary parsed successfully');
                return parsed;
            }
        } catch (parseError) {
            console.error('Failed to parse AI summary as JSON');
        }

        return {
            summary: response,
            recommendations: [],
            confidenceScore: 70
        };

    } catch (error) {
        console.error('Summary generation failed:', error.message);
        throw error;
    }
};

export const checkAIServiceHealth = async () => {
    try {
        await groq.chat.completions.create({
            model: DEFAULT_MODEL,
            max_tokens: 10,
            messages: [
                { role: 'user', content: 'Hello' }
            ]
        });

        return {
            available: true,
            message: 'AI service is healthy'
        };

    } catch (error) {
        return {
            available: false,
            message: error.message
        };
    }
};

export const streamGroqResponse = async (messages, onChunk) => {
    try {
        const stream = await groq.chat.completions.create({
            model: DEFAULT_MODEL,
            max_tokens: 1024,
            messages: messages,
            stream: true
        });

        let fullText = '';

        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
                fullText += text;
                if (onChunk) {
                    onChunk(text);
                }
            }
        }
        return fullText;

    } catch (error) {
        console.error('Streaming error:', error.message);
        throw new Error('Failed to stream AI response');
    }
};

export const validateMedicalResponse = (aiResponse) => {
    const warnings = [];

    const dangerousPatterns = [
        /you (definitely|certainly) have/i,
        /this is (definitely|certainly)/i,
        /you need to take/i,
        /take \d+ (mg|tablets)/i,
    ];

    dangerousPatterns.forEach(pattern => {
        if (pattern.test(aiResponse)) {
            warnings.push('AI response contains definitive medical advice');
        }
    });

    const emergencyPatterns = [
        /call (911|emergency)/i,
        /go to (the )?(emergency room|ER|hospital) (immediately|now)/i,
        /seek immediate medical/i
    ];

    const isEmergency = emergencyPatterns.some(pattern => pattern.test(aiResponse));

    const cautionPatterns = [
        /consult (a |your )?(doctor|physician|healthcare provider)/i,
        /I('m| am) not a doctor/i,
        /cannot diagnose/i,
        /recommend seeing/i
    ];

    const isCautious = cautionPatterns.some(pattern => pattern.test(aiResponse));

    return {
        warnings,
        isEmergency,
        isCautious,
        isSafe: warnings.length === 0 && (isEmergency || isCautious)
    };
};

export const formatAIResponse = (response) => {
    let formatted = response.replace(/\n{3,}/g, '\n\n');
    formatted = formatted.trim();
    return formatted;
};

export const estimateTokens = (text) => {
    return Math.ceil(text.length / 4);
};

export const buildSystemContext = () => {
    return `You are a concise medical AI assistant. Keep all replies short — 2 to 4 sentences maximum. Your role is to:
1. Ask one focused follow-up question at a time
2. Give brief, clear health guidance
3. NEVER provide definitive diagnoses - only doctors can diagnose
4. Recommend professional evaluation when needed
5. Be especially cautious with emergency symptoms

Be brief, warm, and direct. Never write long paragraphs. You are a helpful tool, not a replacement for medical professionals.`;
};

export const parseStructuredResponse = (response, expectedFormat = 'json') => {
    try {
        if (expectedFormat === 'json') {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }

        return null;
    } catch (error) {
        console.error('Failed to parse structured response:', error.message);
        return null;
    }
};

export const getGroqResponseWithSystem = async (systemPrompt, userMessage, options = {}) => {
    try {
        const response = await groq.chat.completions.create({
            model: options.model || DEFAULT_MODEL,
            max_tokens: options.maxTokens || 1024,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: options.temperature || 0.7
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error('AI Error with system prompt:', error.message);
        throw new Error('AI service unavailable');
    }
};

export const batchGroqRequests = async (requestsArray) => {
    const results = [];

    for (const request of requestsArray) {
        try {
            const response = await getGroqResponse(request.messages, request.options);
            results.push({
                success: true,
                data: response,
                requestId: request.id
            });
        } catch (error) {
            results.push({
                success: false,
                error: error.message,
                requestId: request.id
            });
        }
    }

    return results;
};

export const getGroqResponseWithTimeout = async (messages, timeoutMs = 30000, options = {}) => {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI request timeout')), timeoutMs);
    });

    const aiPromise = getGroqResponse(messages, options);

    try {
        const response = await Promise.race([aiPromise, timeoutPromise]);
        return response;
    } catch (error) {
        console.error('AI timeout or error:', error.message);
        throw error;
    }
};

export const logAIInteraction = (userId, prompt, response, metadata = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        userId,
        promptLength: prompt.length,
        responseLength: response.length,
        estimatedTokens: estimateTokens(prompt) + estimateTokens(response),
        ...metadata
    };

    console.log('AI Interaction:', JSON.stringify(logEntry));

    return logEntry;
};

export const sanitizeForLogging = (text) => {
    let sanitized = text;

    const defaultPatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/g,
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
        /\b\d{10,}\b/g
    ];

    const allPatterns = [...defaultPatterns];

    allPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
};
