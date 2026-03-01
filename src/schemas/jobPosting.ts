import { object, string, z } from 'zod';
import { JobPostingStatus } from '../models/enums';

/**
 * Schema para validar el request de creación de job posting
 */
export const createJobPostingRequestSchema = object({
    body: object({
        title: string({ message: 'title is required' }).min(1, 'title is required'),
        department: string({ message: 'department is required' }).min(1, 'department is required'),
        description: string({ message: 'description is required' }).min(1, 'description is required'),
        location: string({ message: 'location is required' }).min(1, 'location is required'),
        salaryRange: string().optional(),
        status: z.enum([JobPostingStatus.OPEN, JobPostingStatus.CLOSED, JobPostingStatus.DRAFT]).optional(),
    }),
});

// Tipos TypeScript derivados del schema
export type CreateJobPostingRequest = z.infer<typeof createJobPostingRequestSchema>['body'];

/**
 * Schema para validar el parámetro ID de job posting
 */
export const getApplicationsByJobPostingSchema = object({
    params: object({
        id: z.uuid({ message: 'Job posting ID must be a valid UUID' }),
    }),
});

export type GetApplicationsByJobPostingParams = z.infer<typeof getApplicationsByJobPostingSchema>['params'];

/**
 * Schema para validar el request de actualización de estado de job posting
 */
export const updateJobPostingStatusSchema = object({
    params: object({
        id: z.uuid({ message: 'Job posting ID must be a valid UUID' }),
    }),
    body: object({
        status: z.enum([JobPostingStatus.OPEN, JobPostingStatus.CLOSED, JobPostingStatus.DRAFT], {
            message: 'status must be one of: OPEN, CLOSED, DRAFT',
        }),
    }),
});

export type UpdateJobPostingStatusParams = z.infer<typeof updateJobPostingStatusSchema>['params'];
export type UpdateJobPostingStatusBody = z.infer<typeof updateJobPostingStatusSchema>['body'];
