import { object, string, number, array, z } from 'zod';

/**
 * Schema para validar la respuesta
 * Contiene el resultado del análisis de screening de un candidato
 */
export const screeningResultSchema = object({
    score: number({ error: 'Score is required' })
        .min(0, 'Score must be at least 0')
        .max(100, 'Score must be at most 100'),
    summary: string({ error: 'Summary is required' }).min(
        1,
        'Summary cannot be empty',
    ),
    keyMatches: array(string(), { error: 'Key matches is required' }),
    missingSkills: array(string(), { error: 'Missing skills is required' }),
    recommendation: z.enum(['PROCEED', 'HOLD', 'REJECT'], {
        error: 'Recommendation must be PROCEED, HOLD, or REJECT',
    }),
});

/**
 * Schema para validar el request de screening de candidatos
 * Sigue el patrón de validación con body anidado
 */
export const screenCandidateRequestSchema = object({
    body: object({
        resumeText: string({ error: 'Resume text is required' }).min(
            1,
            'Resume text is required',
        ),
        jobDescription: string({ error: 'Job description is required' }).min(
            1,
            'Job description is required',
        ),
    }),
});

// Tipos TypeScript derivados de los schemas
export type ScreeningResult = z.infer<typeof screeningResultSchema>;
export type ScreenCandidateRequest = z.infer<
    typeof screenCandidateRequestSchema
>['body'];
