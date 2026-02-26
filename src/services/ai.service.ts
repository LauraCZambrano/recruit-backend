import Anthropic from '@anthropic-ai/sdk';
import config from 'config';
import logger from '../utils/pino';
import AppError from '../utils/appError';
import {
    screeningResultSchema,
    type ScreeningResult,
} from '../schemas/screening';

/**
 * System prompt for the AI to act as an Expert Technical Recruiter
 */
const SYSTEM_PROMPT = `You are an Expert Technical Recruiter with deep knowledge in evaluating candidates.
Analyze the candidate's resume against the job description and provide a structured evaluation.

You MUST respond with a valid JSON object containing:
- score: number between 0-100 representing overall match
- summary: string with executive summary of the analysis
- keyMatches: array of strings listing matching skills/qualifications
- missingSkills: array of strings listing required skills the candidate lacks
- recommendation: one of "PROCEED", "HOLD", or "REJECT"

Evaluate:
1. Technical skills match
2. Soft skills alignment
3. Years of relevant experience
4. Red flags or gaps in the profile

Respond ONLY with the JSON object, no additional text.`;

/**
 * Scenario types for mock mode candidate classification
 */
type Scenario = 'FullStack' | 'React' | 'Node' | 'Generalista';

/**
 * Configuration for each scenario in mock mode
 */
interface ScenarioConfig {
    scoreRange: [number, number];
    summary: string;
    keyMatches: string[];
    missingSkills: string[];
    recommendation: 'PROCEED' | 'HOLD' | 'REJECT';
}

/**
 * AIService - Service responsible for AI-powered candidate screening
 * Uses Anthropic API to analyze resumes against job descriptions
 */
export class AIService {
    private readonly isMockMode: boolean;
    private readonly anthropic?: Anthropic;
    private readonly model?: string;
    private readonly maxTokens?: number;

    /**
     * Configuration for each scenario in mock mode
     */
    private readonly SCENARIO_CONFIGS: Record<Scenario, ScenarioConfig> = {
        FullStack: {
            scoreRange: [95, 100],
            summary: 'Candidato FullStack excepcional. Domina tanto el frontend como el backend de manera integral.',
            keyMatches: ['React', 'NodeJS', 'TypeScript', 'FullStack'],
            missingSkills: [],
            recommendation: 'PROCEED',
        },
        React: {
            scoreRange: [85, 95],
            summary: 'Perfil experto en Frontend con dominio sólido de React y ecosistema moderno.',
            keyMatches: ['React', 'Hooks', 'Tailwind'],
            missingSkills: [],
            recommendation: 'PROCEED',
        },
        Node: {
            scoreRange: [80, 90],
            summary: 'Arquitecto de Backend con experiencia en Node.js, escalabilidad y APIs REST.',
            keyMatches: ['NodeJS', 'Express', 'PostgreSQL'],
            missingSkills: ['React'],
            recommendation: 'PROCEED',
        },
        Generalista: {
            scoreRange: [40, 60],
            summary: 'Perfil generalista. Se recomienda revisar si tiene las bases técnicas necesarias para el rol.',
            keyMatches: ['General', 'Office'],
            missingSkills: ['React', 'NodeJS', 'TypeScript'],
            recommendation: 'HOLD',
        },
    };

    constructor() {
        let apiKey: string | undefined;
        try {
            apiKey = config.get<string>('anthropic.apiKey');
        } catch (error) {
            apiKey = undefined;
        }

        // Validate API key is configured and not empty
        if (!apiKey || apiKey.trim() === '') {
            throw new AppError('ANTHROPIC_API_KEY not configured', 500);
        }

        this.isMockMode = false;
        this.anthropic = new Anthropic({ apiKey });
        this.model = config.get<string>('anthropic.model');
        this.maxTokens = config.get<number>('anthropic.maxTokens');
        logger.info('AIService initialized successfully');
    }

    /**
     * Detects the candidate scenario based on resume content
     * @param resumeText - Plain text content of the candidate's resume
     * @returns Scenario classification: FullStack, React, Node, or Generalista
     * @private
     */
    private detectScenario(resumeText: string): Scenario {
        const lowerText = resumeText.toLowerCase();
        const hasReact = lowerText.includes('react');
        const hasNode = lowerText.includes('node');
        
        if (hasReact && hasNode) return 'FullStack';
        if (hasReact) return 'React';
        if (hasNode) return 'Node';
        return 'Generalista';
    }

    /**
     * Generates a random integer score within the specified range (inclusive)
     * @param min - Minimum value (inclusive)
     * @param max - Maximum value (inclusive)
     * @returns Random integer between min and max
     * @private
     */
    private randomScore(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Generates a mock screening result based on the detected scenario
     * @param scenario - The detected candidate scenario
     * @returns ScreeningResult with realistic mock data
     * @private
     */
    private generateMockResult(scenario: Scenario): ScreeningResult {
        const config = this.SCENARIO_CONFIGS[scenario];
        const [min, max] = config.scoreRange;
        
        return {
            score: this.randomScore(min, max),
            summary: config.summary,
            keyMatches: config.keyMatches,
            missingSkills: config.missingSkills,
            recommendation: config.recommendation,
        };
    }

    /**
     * Mock implementation of candidate screening
     * Analyzes resume content to detect scenario and generates realistic results
     * @param resumeText - Plain text content of the candidate's resume
     * @param jobDescription - Job description text (unused in mock mode)
     * @returns ScreeningResult with mock data based on detected scenario
     * @private
     */
    private async mockScreenCandidate(
        resumeText: string,
        jobDescription: string,
    ): Promise<ScreeningResult> {
        // Detect scenario based on resume content
        const scenario = this.detectScenario(resumeText);
        
        // Log the detected scenario
        console.log(`[AI Mock] Analizando perfil... Escenario detectado: ${scenario}`);
        
        // Generate mock result based on scenario
        const result = this.generateMockResult(scenario);
        
        // Simulate API latency with 2000ms delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return result;
    }

    /**
     * Analyzes a candidate's resume against a job description
     * @param resumeText - Plain text content of the candidate's resume
     * @param jobDescription - Job description text
     * @returns ScreeningResult with score, summary, keyMatches, missingSkills, and recommendation
     * @throws AppError if the API fails or the response is invalid
     */
    async screenCandidate(
        resumeText: string,
        jobDescription: string,
    ): Promise<ScreeningResult> {
        // Use mock mode if no API key is configured
        if (this.isMockMode) {
            return this.mockScreenCandidate(resumeText, jobDescription);
        }

        const operationId = crypto.randomUUID();

        logger.info({ operationId }, 'Starting candidate screening');

        try {
            const response = await this.anthropic!.messages.create({
                model: this.model!,
                max_tokens: this.maxTokens!,
                system: SYSTEM_PROMPT,
                messages: [
                    {
                        role: 'user',
                        content: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`,
                    },
                ],
            });

            const content = response.content[0];

            if (content.type !== 'text') {
                throw new AppError(
                    'Unexpected response type from Anthropic',
                    502,
                );
            }

            // Parse JSON response
            let parsed: unknown;
            try {
                parsed = JSON.parse(content.text);
            } catch {
                throw new AppError(
                    'Failed to parse Anthropic response as JSON',
                    502,
                );
            }

            // Validate with Zod schema
            const validated = screeningResultSchema.safeParse(parsed);

            if (!validated.success) {
                const errorDetails = validated.error.issues
                    .map((e) => `${String(e.path.join('.'))}: ${e.message}`)
                    .join(', ');
                throw new AppError(
                    `Invalid screening result: ${errorDetails}`,
                    502,
                );
            }

            logger.info(
                {
                    operationId,
                    score: validated.data.score,
                    recommendation: validated.data.recommendation,
                },
                'Candidate screening completed successfully',
            );

            return validated.data;
        } catch (error) {
            // Re-throw AppError instances
            if (error instanceof AppError) {
                throw error;
            }

            // Handle Anthropic SDK errors
            if (error instanceof Anthropic.APIError) {
                // Handle timeout errors
                if (
                    error.status === 408 ||
                    error.message?.toLowerCase().includes('timeout')
                ) {
                    throw new AppError('Anthropic API request timed out', 504);
                }

                // Handle other HTTP errors from API
                throw new AppError(
                    `Anthropic API error: ${error.status} - ${error.message}`,
                    502,
                );
            }

            // Handle connection errors (network issues, etc.)
            if (error instanceof Anthropic.APIConnectionError) {
                throw new AppError('Failed to connect to Anthropic API', 503);
            }

            // Handle any other unexpected errors as connection failures
            logger.error(
                { error, operationId },
                'Unexpected error during candidate screening',
            );
            throw new AppError('Failed to connect to Anthropic API', 503);
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
