import { object, string, z } from 'zod';

/**
 * Schema para validar el request de envío de postulación
 * Sigue el patrón de validación con body anidado
 */
export const submitApplicationRequestSchema = object({
    body: object({
        firstName: string({ message: 'firstName is required' }).min(1, 'firstName is required'),
        lastName: string({ message: 'lastName is required' }).min(1, 'lastName is required'),
        email: string({ message: 'email is required' })
            .min(1, 'email is required')
            .pipe(z.email('email must be a valid email address')),
        jobPostingId: z.uuid({ message: 'jobPostingId must be a valid UUID' }),
        resumeText: string().optional(),
    }),
});

// Tipos TypeScript derivados del schema
export type SubmitApplicationRequest = z.infer<
    typeof submitApplicationRequestSchema
>['body'];
