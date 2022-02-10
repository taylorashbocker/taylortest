import {BaseDomainClass, NakedDomainClass} from '../../../../common_classes/base_domain_class';
import {IsDate, IsIn, IsObject, IsOptional, IsString} from 'class-validator';
import {Type} from 'class-transformer';
import Metatype, {MetatypeChangelist} from '../metatype';
import MetatypeRelationship, {MetatypeRelationshipChangelist} from '../metatype_relationship';
import MetatypeRelationshipPair, {MetatypeRelationshipPairChangelist} from '../metatype_relationship_pair';

export class Changelist {
    @Type(() => MetatypeChangelist)
    metatypes: MetatypeChangelist[] = [];

    @Type(() => MetatypeRelationshipChangelist)
    metatype_relationships: MetatypeRelationshipChangelist[] = [];

    @Type(() => MetatypeRelationshipPairChangelist)
    metatype_relationship_pairs: MetatypeRelationshipPairChangelist[] = [];

    constructor(input: {metatypes?: Metatype[]; metatypeRelationships?: MetatypeRelationship[]; metatypeRelationshipPairs?: MetatypeRelationshipPair[]}) {
        if (input) {
            if (input.metatypes) this.metatypes = input.metatypes as MetatypeChangelist[];
            if (input.metatypeRelationships) this.metatype_relationships = input.metatypeRelationships as MetatypeRelationshipChangelist[];
            if (input.metatypeRelationshipPairs) this.metatype_relationship_pairs = input.metatypeRelationshipPairs as MetatypeRelationshipPairChangelist[];
        }
    }
}

/*
    ChangelistRecord represents a list of changes to be applied, or already applied to the
    existing ontology. It is used to help manage ontology versions
 */
export default class ChangelistRecord extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    container_id?: string;

    @IsString()
    name?: string;

    @IsString()
    @IsIn(['pending', 'approved', 'rejected', 'applied', 'deprecated', 'ready'])
    status = 'pending';

    @IsOptional()
    @IsObject()
    @Type(() => Changelist)
    changelist?: Changelist = new Changelist({
        metatypes: [],
        metatypeRelationships: [],
        metatypeRelationshipPairs: [],
    });

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    applied_at?: Date;

    @IsOptional()
    base_ontology_version_id?: string;

    constructor(input: {container_id: string; name: string; changelist?: Changelist; status?: string; applied_at?: Date; baseOntologyVersionID?: string}) {
        super();

        if (input) {
            this.container_id = input.container_id;
            this.name = input.name;
            if (input.changelist) this.changelist = input.changelist;
            if (input.status) this.status = input.status;
            if (input.applied_at) this.applied_at = input.applied_at;
            if (input.baseOntologyVersionID) this.base_ontology_version_id = input.baseOntologyVersionID;
        }
    }
}

export class ChangelistApproval extends NakedDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    changelist_id?: string;

    @IsString()
    approved_by?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    approved_at?: Date;

    constructor(input: {changelist_id: string; approver_id: string; approved_at?: Date}) {
        super();

        if (input) {
            this.changelist_id = input.changelist_id;
            this.approved_by = input.approver_id;
            if (input.approved_at) this.approved_at = input.approved_at;
        }
    }
}
