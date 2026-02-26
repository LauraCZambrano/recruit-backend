export enum JobPostingStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    DRAFT = 'DRAFT',
}

export enum ApplicationStatus {
    NEW = 'NEW',
    SCREENED = 'SCREENED',
    INTERVIEWED = 'INTERVIEWED',
    OFFERED = 'OFFERED',
    HIRED = 'HIRED',
    REJECTED = 'REJECTED',
}

export enum InterviewType {
    SCREENING = 'SCREENING',
    TECHNICAL = 'TECHNICAL',
    FINAL = 'FINAL',
}

export enum OnboardingStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
}

export enum ReferralStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
}

export enum RequisitionStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}
