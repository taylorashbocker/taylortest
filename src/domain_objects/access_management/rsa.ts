import {NakedDomainClass} from '../../common_classes/base_domain_class';
import {IsArray, IsBoolean, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import { Type } from 'class-transformer';

export class SubjectCredentials extends NakedDomainClass {
    @IsString()
    methodId?: string = 'SECURID';

    @IsArray()
    @ValidateNested()
    @Type(() => CollectedInput)
    collectedInputs?: CollectedInput[];
}

export class CollectedInput extends NakedDomainClass {
    @IsString()
    name = 'SECURID';

    @IsString()
    value?: string;
}

export class RSAContext extends NakedDomainClass {
    @IsString()
    authnAttemptId?: string;

    @IsOptional()
    @IsString()
    messageId?: string;

    @IsString()
    inResponseTo?: string;
}

// RSARequest encompasses the request body for the initialize
// and verify requests
export class RSARequest extends NakedDomainClass {
    @IsOptional()
    @IsString()
    clientID?: string;

    @IsOptional()
    @IsString()
    subjectName?: string;

    @IsArray()
    @ValidateNested()
    @Type(() => SubjectCredentials)
    subjectCredentials?: SubjectCredentials[];

    @ValidateNested()
    @Type(() => RSAContext)
    context?: RSAContext;

    constructor(input: {
        subjectName?: string;
        secureID?: string;
        authnAttemptId?: string;
        inResponseTo?: string
    }) {
        super();

        if (input) {
            if (input.subjectName) this.subjectName = input.subjectName;
            if (input.secureID) {
                this.subjectCredentials = [new SubjectCredentials()]
                this.subjectCredentials[0].collectedInputs = [new CollectedInput()]
                this.subjectCredentials[0].collectedInputs[0].value = input.secureID
            }
            if (input.authnAttemptId && input.inResponseTo) {
                this.context = new RSAContext()
                this.context.authnAttemptId = input.authnAttemptId;
                this.context.inResponseTo = input.inResponseTo;
            }
        }
    }
}

// RSAResponse encompasses the response for the initialize
// and verify requests
export class RSAResponse extends NakedDomainClass {
    @IsString()
    attemptResponseCode?: string;

    @IsString()
    attemptReasonCode?: string;

    // TODO: Will this work?
    @IsObject()
    challengeMethods: {
        challenges: Challenge[]
    } = {
        challenges: [new Challenge()]
    }

    @IsArray()
    @ValidateNested()
    @Type(() => CredentialValidationResult)
    credentialValidationResults?: CredentialValidationResult[]

    @ValidateNested()
    @Type(() => RSAContext)
    context?: RSAContext
}

export class CredentialValidationResult extends NakedDomainClass {
    @IsString()
    methodId?: string;

    @IsString()
    methodResponseCode?: string;

    @IsOptional()
    @IsString()
    methodReasonCode?: string;

    @IsArray()
    authnAttributes?: string[];
}

export class Challenge extends NakedDomainClass {
    @IsOptional()
    @IsString()
    methodSetId?: string;

    @IsArray()
    @ValidateNested()
    @Type(() => RequiredMethods)
    requiredMethods?: RequiredMethods[];
}

export class RequiredMethods extends NakedDomainClass {
    @IsString()
    methodId?: string;

    @IsOptional()
    @IsString()
    priority?: string;

    @IsArray()
    @ValidateNested()
    @Type(() => Version)
    versions?: Version[];
}

export class Version extends NakedDomainClass {
    @IsString()
    versionId?: string;

    @IsArray()
    methodAttributes?: string[];

    @IsBoolean()
    valueRequired?: boolean;

    @IsOptional()
    @IsString()
    referenceId?: string;

    @ValidateNested()
    @Type(() => Prompt)
    prompt?: Prompt;
}

export class Prompt extends NakedDomainClass {
    @IsString()
    promptResourceId?: string;

    @IsString()
    defaultText?: string;

    @IsOptional()
    @IsString()
    formatRegex?: string;

    @IsOptional()
    @IsString()
    defaultValue?: string;

    @IsBoolean()
    valueBeingDefined?: boolean;

    @IsBoolean()
    sensitive?: boolean;

    @IsOptional()
    @IsString()
    minLength?: string;

    @IsOptional()
    @IsString()
    maxLength?: string;

    @IsArray()
    promptArgs?: string[];
}

