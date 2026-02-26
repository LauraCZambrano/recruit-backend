import logger from '../utils/pino';
import {
    screeningResultSchema,
    type ScreeningResult,
} from '../schemas/screening';

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
 * Uses mock mode to analyze resumes against job descriptions
 */
export class AIService {
    private readonly isMockMode: boolean;

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
        this.isMockMode = true;
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
     */
    async screenCandidate(
        resumeText: string,
        jobDescription: string,
    ): Promise<ScreeningResult> {
        return this.mockScreenCandidate(resumeText, jobDescription);
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
