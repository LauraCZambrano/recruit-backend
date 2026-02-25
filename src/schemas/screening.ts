import { object, string, number, array, z } from 'zod';

/**
 * Schema para validar la respuesta de Anthropic API
 * Contiene el resultado del análisis de screening de un candidato
 */
export const screeningResultSchema = object({
  score: number({ required_error: 'Score is required' })
    .min(0, 'Score must be at least 0')
    .max(100, 'Score must be at most 100'),
  summary: string({ required_error: 'Summary is required' })
    .min(1, 'Summary cannot be empty'),
  keyMatches: array(string(), { required_error: 'Key matches is required' }),
  missingSkills: array(string(), { required_error: 'Missing skills is required' }),
  recommendation: z.enum(['PROCEED', 'HOLD', 'REJECT'], {
    required_error: 'Recommendation is required',
    message: 'Recommendation must be PROCEED, HOLD, or REJECT',
  }),
});

/**
 * Schema para validar el request de screening de candidatos
 * Sigue el patrón de validación con body anidado
 */
export const screenCandidateRequestSchema = object({
  body: object({
    resumeText: string({ required_error: 'Resume text is required' })
      .min(1, 'Resume text is required'),
    jobDescription: string({ required_error: 'Job description is required' })
      .min(1, 'Job description is required'),
  }),
});

// Tipos TypeScript derivados de los schemas
export type ScreeningResult = z.infer<typeof screeningResultSchema>;
export type ScreenCandidateRequest = z.infer<typeof screenCandidateRequestSchema>['body'];
