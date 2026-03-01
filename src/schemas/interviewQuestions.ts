import { object, string, array, z } from 'zod';

/**
 * Schema para validar el parámetro applicationId en la ruta
 */
export const generateInterviewQuestionsParamsSchema = object({
    params: object({
        applicationId: string({ error: 'Application ID is required' }).uuid(
            'Application ID must be a valid UUID',
        ),
    }),
});

/**
 * Schema para validar la estructura de salida de preguntas de entrevista
 */
export const interviewQuestionsOutputSchema = object({
    questions: array(string(), {
        error: 'Questions must be an array of strings',
    })
        .length(5, 'Questions array must contain exactly 5 items')
        .refine((questions) => questions.every((q) => q.trim().length > 0), {
            message: 'All questions must be non-empty strings',
        }),
});

// Tipos TypeScript derivados de los schemas
export type GenerateInterviewQuestionsParams = z.infer<
    typeof generateInterviewQuestionsParamsSchema
>['params'];

export type InterviewQuestionsOutput = z.infer<
    typeof interviewQuestionsOutputSchema
>;
