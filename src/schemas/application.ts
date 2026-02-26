import { object, string, z } from 'zod';

/**
 * Schema para validar el request de envío de postulación
 * Sigue el patrón de validación con body anidado
 */
export const submitApplicationRequestSchema = object({
    body: object({
        candidateId: z.uuid({ message: 'candidateId must be a valid UUID' }),
        jobPostingId: z.uuid({ message: 'jobPostingId must be a valid UUID' }),
        resumeText: string({ message: 'resumeText is required' }).min(
            1,
            'resumeText is required',
        ),
    }),
});

// Tipos TypeScript derivados del schema
export type SubmitApplicationRequest = z.infer<
    typeof submitApplicationRequestSchema
>['body'];
