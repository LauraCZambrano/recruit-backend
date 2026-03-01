import { object, string, array, z } from 'zod';

/**
 * Schema para validar la estructura de salida de descripción de trabajo
 * Valida el formato de descripción de trabajo generado por IA
 */
export const jobDescriptionOutputSchema = object({
    title: string({ error: 'Title is required' })
        .min(1, 'Title cannot be empty')
        .max(200, 'Title must not exceed 200 characters'),

    description: string({ error: 'Description is required' })
        .min(1, 'Description cannot be empty')
        .max(2000, 'Description must not exceed 2000 characters'),

    department: string({ error: 'Department is required' })
        .min(1, 'Department cannot be empty')
        .max(100, 'Department must not exceed 100 characters'),

    location: string({ error: 'Location is required' })
        .min(1, 'Location cannot be empty')
        .max(100, 'Location must not exceed 100 characters'),

    responsibilities: array(string(), {
        error: 'Responsibilities must be an array of strings',
    })
        .min(1, 'Responsibilities must contain at least 1 item')
        .max(20, 'Responsibilities must not exceed 20 items'),

    requirements: array(string(), {
        error: 'Requirements must be an array of strings',
    })
        .min(1, 'Requirements must contain at least 1 item')
        .max(20, 'Requirements must not exceed 20 items'),

    benefits: array(string(), {
        error: 'Benefits must be an array of strings',
    })
        .min(1, 'Benefits must contain at least 1 item')
        .max(20, 'Benefits must not exceed 20 items'),

    salaryRange: string({ error: 'Salary range is required' })
        .min(1, 'Salary range cannot be empty')
        .max(100, 'Salary range must not exceed 100 characters'),
});

/**
 * Schema para validar el request de generación de descripción de trabajo
 * Sigue el patrón de validación con body anidado
 */
export const generateJobDescriptionRequestSchema = object({
    body: object({
        description: string({ error: 'Description is required' })
            .min(1, 'Description cannot be empty')
            .max(2000, 'Description must not exceed 2000 characters')
            .refine((val) => val.trim().length > 0, {
                message: 'Description cannot contain only whitespace',
            }),
    }),
});

// Tipos TypeScript derivados de los schemas
export type JobDescriptionOutput = z.infer<typeof jobDescriptionOutputSchema>;
export type GenerateJobDescriptionRequest = z.infer<
    typeof generateJobDescriptionRequestSchema
>['body'];
