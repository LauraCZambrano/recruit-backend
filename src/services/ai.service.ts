import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import logger from '../utils/pino';
import {
    screeningResultSchema,
    type ScreeningResult,
} from '../schemas/screening';

/**
 * AIService - Service responsible for AI-powered candidate screening
 * Uses Google Gemini AI to analyze resumes against job descriptions
 */
export class AIService {
    private readonly genAI: GoogleGenerativeAI;
    private readonly model: GenerativeModel;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            throw new Error(
                'GEMINI_API_KEY environment variable is not defined. ' +
                'Please set it in your .env file to enable AI-powered candidate screening.'
            );
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: 
                'Eres un experto reclutador técnico de DaCodes. ' +
                'Tu tarea es analizar el texto de un CV frente a los requisitos de un puesto. ' +
                'Debes ser riguroso y objetivo. ' +
                'Evalúa stack técnico, años de experiencia y coherencia.'
        });

        logger.info('AIService initialized successfully with Gemini AI');
    }

    /**
     * Cleans markdown code block delimiters from text
     * @param text - Raw text that may contain markdown code blocks
     * @returns Cleaned text with markdown delimiters removed
     */
    private cleanMarkdownBlocks(text: string): string {
        // Remove ```json ... ``` blocks
        let cleaned = text.replaceAll(/```json\s*\n?([\s\S]*?)\n?```/g, '$1');
        
        // Remove ``` ... ``` blocks
        cleaned = cleaned.replaceAll(/```\s*\n?([\s\S]*?)\n?```/g, '$1');
        
        // Trim whitespace
        return cleaned.trim();
    }

    /**
     * Parses and validates the AI response text
     * @param text - Raw response text from Gemini API
     * @returns Validated ScreeningResult object
     * @throws Error if parsing or validation fails
     */
    private parseAndValidateResponse(text: string): ScreeningResult {
        // Clean markdown blocks from response
        const cleanedText = this.cleanMarkdownBlocks(text);
        
        // Parse JSON
        const aiResponse = JSON.parse(cleanedText);
        
        // Map AI response fields to schema format
        const mappedResult = {
            score: aiResponse.score,
            summary: aiResponse.justification,      // justification → summary
            keyMatches: aiResponse.skillsFound,     // skillsFound → keyMatches
            missingSkills: aiResponse.missingSkills,
            recommendation: aiResponse.recommendation
        };
        
        // Validate mapped object using schema
        const validatedResult = screeningResultSchema.parse(mappedResult);
        
        return validatedResult;
    }

    /**
     * Constructs the user prompt for Gemini API
     * @param resumeText - Plain text content of the candidate's resume
     * @param jobDescription - Job description text
     * @returns Formatted prompt string with JSON schema requirements
     */
    private buildUserPrompt(resumeText: string, jobDescription: string): string {
        return `Analiza el siguiente CV y evalúalo contra la descripción del puesto.

CV:
${resumeText}

Descripción del Puesto:
${jobDescription}

Debes responder ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "score": <número entre 0 y 100>,
  "justification": "<explicación breve del score, máximo 200 caracteres>",
  "skillsFound": ["<skill1>", "<skill2>", ...],
  "missingSkills": ["<skill1>", "<skill2>", ...],
  "recommendation": "<PROCEED, HOLD, o REJECT>"
}

Sé riguroso y objetivo en tu evaluación.`;
    }

    /**
     * Analyzes a candidate's resume against a job description
     * @param resumeText - Plain text content of the candidate's resume
     * @param jobDescription - Job description text
     * @returns ScreeningResult with score, summary, keyMatches, missingSkills, and recommendation
     */
    async screenCandidate(
        resumeText: string,
        jobDescription: string,
    ): Promise<ScreeningResult> {
        try {
            // Log analysis start with resume text length
            logger.info({
                resumeLength: resumeText.length,
                hasJobDescription: !!jobDescription
            }, 'Starting AI candidate screening analysis');

            // Construct prompt with resume and job description
            const userPrompt = this.buildUserPrompt(resumeText, jobDescription);

            // Track API response time
            const startTime = Date.now();
            
            // Invoke Gemini API
            const response = await this.model.generateContent(userPrompt);
            
            // Extract response text
            const responseText = response.response.text();
            
            // Log API response time
            const responseTime = Date.now() - startTime;
            logger.info({ responseTime }, 'Gemini API response received');

            // Parse and validate response
            const result = this.parseAndValidateResponse(responseText);

            // Log successful analysis with score
            logger.info({ score: result.score }, 'AI screening analysis completed successfully');

            return result;
        } catch (error) {
            // Log error with full details
            logger.error({
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                resumeLength: resumeText.length,
                hasJobDescription: !!jobDescription
            }, 'AI screening failed');

            // Return fallback result
            return {
                score: 0,
                summary: 'Error en el análisis de IA',
                keyMatches: [],
                missingSkills: [],
                recommendation: 'HOLD'
            };
        }
    }
}


// Factory function to create AIService instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
    if (!aiServiceInstance) {
        aiServiceInstance = new AIService();
    }
    return aiServiceInstance;
}
