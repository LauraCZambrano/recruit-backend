import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import logger from '../utils/pino';
import {
    screeningResultSchema,
    type ScreeningResult,
} from '../schemas/screening';
import {
    jobDescriptionOutputSchema,
    type JobDescriptionOutput,
} from '../schemas/jobDescription';
import {
    interviewQuestionsOutputSchema,
    type InterviewQuestionsOutput,
} from '../schemas/interviewQuestions';

/**
 * AIService - Service responsible for AI-powered candidate screening
 * Uses Google Gemini AI to analyze resumes against job descriptions
 */
export class AIService {
    private readonly genAI: GoogleGenerativeAI;
    private readonly model: GenerativeModel;
    private readonly jobDescriptionModel: GenerativeModel;

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
                'Evalúa stack técnico, años de experiencia y coherencia.' + 
                'Toda tu interacción, análisis y resultados deben ser presentados exclusivamente en español.'
        });

        // Initialize job description generation model
        this.jobDescriptionModel = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction:
                'Eres un experto en HR y Marketing de Reclutamiento. ' +
                'Tu objetivo es crear descripciones de puestos atractivas, claras y profesionales ' +
                'basadas en requerimientos mínimos. ' +
                'Toda tu interacción, análisis y resultados deben ser presentados exclusivamente en español.'
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
            recommendation: aiResponse.recommendation,
            experienceYears: aiResponse.experienceYears ?? 0  // Default to 0 if missing
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
  "recommendation": "<PROCEED, HOLD, o REJECT>",
  "experienceYears": <número entero de años de experiencia profesional total>
}

Para calcular experienceYears:
- Analiza la sección de experiencia laboral del CV
- Suma los años totales de experiencia profesional
- Si no puedes determinar la experiencia, usa 0
- El valor debe ser un número entero entre 0 y 50

Sé riguroso y objetivo en tu evaluación.`;
    }

    /**
     * Constructs the user prompt for job description generation
     * @param description - User's job description requirements
     * @returns Formatted prompt string with JSON schema requirements
     */
    private buildJobDescriptionPrompt(description: string): string {
        return `Genera una descripción de puesto profesional y atractiva basada en los siguientes requerimientos:

${description}

Debes responder ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "title": "<título conciso y descriptivo del puesto, máximo 200 caracteres>",
  "description": "<descripción general atractiva y profesional del puesto, máximo 2000 caracteres>",
  "department": "<departamento lógico del puesto>",
  "location": "<ubicación del puesto>",
  "responsibilities": ["<responsabilidad específica y accionable>", ...],
  "requirements": ["<requisito específico y accionable>", ...],
  "benefits": ["<beneficio específico y atractivo>", ...],
  "salaryRange": "<rango salarial competitivo basado en el rol y ubicación>"
}

Requisitos importantes:
- El título debe ser conciso, claro y descriptivo
- La descripción debe ser atractiva, profesional y con tono moderno
- Basado en la descripción, asigna un "department" lógico (ej: Ingeniería, Ventas, Marketing, Recursos Humanos, Finanzas, Operaciones, etc.)
- En "location", si no se menciona una ciudad específica, pon "Remoto" o "Híbrido" según parezca más adecuado para el puesto
- Incluye entre 3 y 10 responsabilidades específicas y accionables
- Incluye entre 3 y 10 requisitos específicos y accionables
- Incluye entre 3 y 10 beneficios específicos y atractivos
- Basado en el rol y la ubicación (o remoto), sugiere un rango salarial competitivo en el mercado actual (ej: "40,000 - 60,000 MXN")
- Todo el contenido debe estar en español con tono profesional pero moderno
- Usa lenguaje inclusivo y evita sesgos de género`;
    }

    /**
     * Parses and validates job description response
     * @param text - Raw response text from Gemini API
     * @returns Validated JobDescriptionOutput object
     * @throws Error if parsing or validation fails
     */
    private parseJobDescriptionResponse(text: string): JobDescriptionOutput {
        try {
            // Clean markdown blocks from response (reuse existing cleanMarkdownBlocks)
            const cleanedText = this.cleanMarkdownBlocks(text);
            
            // Parse JSON
            const aiResponse = JSON.parse(cleanedText);
            
            // Validate using jobDescriptionOutputSchema
            const validatedResult = jobDescriptionOutputSchema.parse(aiResponse);
            
            return validatedResult;
        } catch (error) {
            // Throw descriptive errors on parsing or validation failures
            if (error instanceof SyntaxError) {
                throw new Error(
                    `Failed to parse AI response as JSON: ${error.message}. ` +
                    `Response text: ${text.substring(0, 200)}...`
                );
            }
            
            if (error instanceof Error && error.name === 'ZodError') {
                throw new Error(
                    `AI response validation failed: ${error.message}. ` +
                    `The response structure does not match the expected job description format.`
                );
            }
            
            throw new Error(
                `Unexpected error parsing job description response: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Constructs the system instruction for interview questions generation
     * @returns System instruction string
     */
    private buildInterviewQuestionsSystemInstruction(): string {
        return (
            'Eres un reclutador técnico experto. ' +
            'Tu tarea es generar preguntas de entrevista personalizadas ' +
            'basadas en el CV del candidato y los requisitos del puesto. ' +
            'Enfócate en identificar gaps, áreas de duda o puntos que requieran clarificación. ' +
            'Toda tu interacción debe ser en español.'
        );
    }

    /**
     * Constructs the user prompt for interview questions generation
     * @param resumeText - Plain text content of the candidate's resume
     * @param jobDescription - Job description text
     * @returns Formatted prompt string with JSON schema requirements
     */
    private buildInterviewQuestionsPrompt(
        resumeText: string,
        jobDescription: string
    ): string {
        return `Analiza el siguiente CV y la descripción del puesto para generar preguntas de entrevista personalizadas.

CV del Candidato:
${resumeText}

Descripción del Puesto:
${jobDescription}

Genera exactamente 5 preguntas técnicas de entrevista que:
1. Identifiquen gaps entre el CV y los requisitos del puesto
2. Clarifiquen áreas de duda o experiencia poco detallada en el CV
3. Profundicen en habilidades técnicas relevantes para el puesto
4. Sean específicas al contexto del candidato (no preguntas genéricas)
5. Ayuden a evaluar si el candidato es adecuado para el rol

Debes responder ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "questions": [
    "pregunta 1",
    "pregunta 2",
    "pregunta 3",
    "pregunta 4",
    "pregunta 5"
  ]
}

Las preguntas deben ser claras, específicas y en español.`;
    }

    /**
     * Parses and validates interview questions response
     * @param text - Raw response text from Gemini API
     * @returns Validated InterviewQuestionsOutput object
     * @throws Error if parsing or validation fails
     */
    private parseInterviewQuestionsResponse(text: string): InterviewQuestionsOutput {
        try {
            // Clean markdown blocks from response
            const cleanedText = this.cleanMarkdownBlocks(text);
            
            // Parse JSON
            const aiResponse = JSON.parse(cleanedText);
            
            // Validate using interviewQuestionsOutputSchema
            const validatedResult = interviewQuestionsOutputSchema.parse(aiResponse);
            
            return validatedResult;
        } catch (error) {
            // Throw descriptive errors on parsing or validation failures
            if (error instanceof SyntaxError) {
                throw new Error(
                    `Failed to parse AI response as JSON: ${error.message}. ` +
                    `Response text: ${text.substring(0, 200)}...`
                );
            }
            
            if (error instanceof Error && error.name === 'ZodError') {
                throw new Error(
                    `AI response validation failed: ${error.message}. ` +
                    `The response must contain exactly 5 non-empty questions.`
                );
            }
            
            throw new Error(
                `Unexpected error parsing interview questions response: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
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
                recommendation: 'HOLD',
                experienceYears: 0
            };
        }
    }

    /**
     * Generates a professional job description using AI
     * @param description - User's job description requirements
     * @returns JobDescriptionOutput with title, description, responsibilities, requirements, and benefits
     * @throws Error if generation, parsing, or validation fails
     */
    async generateJobDescription(description: string): Promise<JobDescriptionOutput> {
        try {
            // Log generation start with description length
            logger.info({
                descriptionLength: description.length
            }, 'Starting AI job description generation');

            // Call buildJobDescriptionPrompt and construct the user prompt
            const userPrompt = this.buildJobDescriptionPrompt(description);

            // Track API response time
            const startTime = Date.now();
            
            // Invoke Gemini API
            const response = await this.jobDescriptionModel.generateContent(userPrompt);
            
            // Extract response text
            const responseText = response.response.text();
            
            // Log API response time
            const responseTime = Date.now() - startTime;
            logger.info({ responseTime }, 'Gemini API response received');

            // Parse response using parseJobDescriptionResponse
            const result = this.parseJobDescriptionResponse(responseText);

            // Log success with generated title and array counts
            logger.info({ 
                title: result.title,
                salaryRange: result.salaryRange,
                responsibilitiesCount: result.responsibilities.length,
                requirementsCount: result.requirements.length,
                benefitsCount: result.benefits.length
            }, 'AI job description generation completed successfully');

            return result;
        } catch (error) {
            // Log error with full details
            logger.error({
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                descriptionLength: description.length
            }, 'AI job description generation failed');

            // Re-throw error to be handled by controller
            throw error;
        }
    }

    /**
     * Generates personalized interview questions using AI
     * @param resumeText - Plain text content of the candidate's resume
     * @param jobDescription - Job description text
     * @param applicationId - UUID of the application (for logging)
     * @returns InterviewQuestionsOutput with exactly 5 questions
     * @throws Error if generation, parsing, or validation fails
     */
    async generateInterviewQuestions(
            resumeText: string,
            jobDescription: string,
            applicationId: string
        ): Promise<InterviewQuestionsOutput> {
            try {
                // Log generation start with context
                logger.info({
                    applicationId,
                    resumeLength: resumeText.length,
                    jobDescriptionLength: jobDescription.length
                }, 'Starting AI interview questions generation');

                // Build user prompt using buildInterviewQuestionsPrompt
                const userPrompt = this.buildInterviewQuestionsPrompt(
                    resumeText,
                    jobDescription
                );

                // Track start time for API response measurement
                const startTime = Date.now();

                // Use chat for multi-turn conversation with system instruction
                const chat = this.model.startChat({
                    history: [
                        {
                            role: 'user',
                            parts: [{ text: this.buildInterviewQuestionsSystemInstruction() }]
                        },
                        {
                            role: 'model',
                            parts: [{ text: 'Entendido. Generaré preguntas de entrevista personalizadas en español.' }]
                        }
                    ]
                });

                const response = await chat.sendMessage(userPrompt);

                // Extract response text using response.response.text()
                const responseText = response.response.text();

                // Log API response time
                const responseTime = Date.now() - startTime;
                logger.info({ applicationId, responseTime }, 'Gemini API response received');

                // Parse and validate response using parseInterviewQuestionsResponse
                const result = this.parseInterviewQuestionsResponse(responseText);

                // Log success with applicationId and questionsCount
                logger.info({ 
                    applicationId,
                    questionsCount: result.questions.length
                }, 'AI interview questions generation completed successfully');

                return result;
            } catch (error) {
                // Log error with full context
                logger.error({
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    applicationId,
                    resumeLength: resumeText.length,
                    jobDescriptionLength: jobDescription.length
                }, 'AI interview questions generation failed');

                // Re-throw error to be handled by controller
                throw error;
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
