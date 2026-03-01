import { object, string, z } from 'zod';
import { ApplicationStatus } from '../models/enums';

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

/**
 * Schema para validar el request de actualización de estado de aplicación
 * Valida params (UUID) y body (ApplicationStatus enum)
 */
export const updateApplicationStatusSchema = object({
    params: object({
        id: z.uuid({ message: 'id must be a valid UUID' }),
    }),
    body: object({
        status: z.enum([
            ApplicationStatus.NEW,
            ApplicationStatus.SCREENED,
            ApplicationStatus.INTERVIEWED,
            ApplicationStatus.OFFERED,
            ApplicationStatus.HIRED,
            ApplicationStatus.REJECTED,
        ], {
            message: 'status must be one of: NEW, SCREENED, INTERVIEWED, OFFERED, HIRED, REJECTED',
        }),
    }),
});

// Tipos TypeScript derivados del schema
export type UpdateApplicationStatusParams = z.infer<
    typeof updateApplicationStatusSchema
>['params'];

export type UpdateApplicationStatusBody = z.infer<
    typeof updateApplicationStatusSchema
>['body'];
