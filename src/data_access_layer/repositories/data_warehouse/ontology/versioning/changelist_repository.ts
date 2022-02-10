import RepositoryInterface, {QueryOptions, Repository} from '../../../repository';
import ChangelistRecord, {Changelist, ChangelistApproval} from '../../../../../domain_objects/data_warehouse/ontology/versioning/changelistRecord';
import Result from '../../../../../common_classes/result';
import ChangelistMapper from '../../../../mappers/data_warehouse/ontology/versioning/changelist_mapper';
import {User} from '../../../../../domain_objects/access_management/user';
import {PoolClient} from 'pg';
import ChangelistApprovalMapper from '../../../../mappers/data_warehouse/ontology/versioning/changelist_approval_mapper';
import MetatypeRepository from '../metatype_repository';
import MetatypeRelationshipRepository from '../metatype_relationship_repository';
import MetatypeRelationshipPairRepository from '../metatype_relationship_pair_repository';

export default class ChangelistRepository extends Repository implements RepositoryInterface<ChangelistRecord> {
    #mapper: ChangelistMapper = ChangelistMapper.Instance;
    #approvalMapper: ChangelistApprovalMapper = ChangelistApprovalMapper.Instance;

    delete(t: ChangelistRecord): Promise<Result<boolean>> {
        if (t.id) return this.#mapper.Delete(t.id);

        return Promise.resolve(Result.Failure('record must have id'));
    }

    findByID(id: string): Promise<Result<ChangelistRecord>> {
        return this.#mapper.Retrieve(id);
    }

    async save(c: ChangelistRecord, user: User): Promise<Result<boolean>> {
        const errors = await c.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`changelist does not pass validation ${errors.join(',')}`));
        }

        // if we have an id, attempt to update the Changelist
        if (c.id) {
            const original = await this.findByID(c.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, c);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            Object.assign(c, updated.value);
            return Promise.resolve(Result.Success(true));
        }

        // build the changelist prior to save, if this fails, fail out the save
        const built = await this.populateChangelist(c);
        if (built.isError) return Promise.resolve(Result.Failure(`unable to populate changelist using provided ontology version ${built.error?.error}`));

        const result = await this.#mapper.Create(user.id!, c);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        Object.assign(c, result.value);
        return Promise.resolve(Result.Success(true));
    }

    setStatus(
        id: string,
        userID: string,
        status: 'pending' | 'approved' | 'rejected' | 'applied' | 'deprecated' | 'ready',
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return this.#mapper.SetStatus(id, userID, status, transaction);
    }

    async approveChangelist(approver: User, changelistID: string): Promise<Result<ChangelistApproval>> {
        await this.#mapper.SetStatus(changelistID, approver.id!, 'approved');

        return this.#approvalMapper.Create(
            approver.id!,
            new ChangelistApproval({
                changelist_id: changelistID,
                approver_id: approver.id!,
            }),
        );
    }

    async revokeApproval(changelistID: string, approver: User): Promise<Result<boolean>> {
        await this.#mapper.SetStatus(changelistID, approver.id!, 'rejected');

        return this.#approvalMapper.DeleteByChangelist(changelistID);
    }

    listApprovals(changelistID: string): Promise<Result<ChangelistApproval[]>> {
        return this.#approvalMapper.ListForChangelist(changelistID);
    }

    async populateChangelist(changelist: ChangelistRecord): Promise<Result<boolean>> {
        let metatypeRepo = new MetatypeRepository();
        let relationshipRepo = new MetatypeRelationshipRepository();
        let pairRepo = new MetatypeRelationshipPairRepository();

        metatypeRepo = metatypeRepo.where().containerID('eq', changelist.container_id);
        relationshipRepo = relationshipRepo.where().containerID('eq', changelist.container_id);
        pairRepo = pairRepo.where().containerID('eq', changelist.container_id);
        if (changelist.base_ontology_version_id) {
            metatypeRepo = metatypeRepo.and().ontologyVersion('eq', changelist.base_ontology_version_id);
            relationshipRepo = relationshipRepo.and().ontologyVersion('eq', changelist.base_ontology_version_id);
            pairRepo = pairRepo.and().ontologyVersion('eq', changelist.base_ontology_version_id);
        } else {
            metatypeRepo = metatypeRepo.and().ontologyVersion('is null');
            relationshipRepo = relationshipRepo.and().ontologyVersion('eq', changelist.base_ontology_version_id);
            pairRepo = pairRepo.and().ontologyVersion('eq', changelist.base_ontology_version_id);
        }

        const metatypes = await metatypeRepo.list(true);
        if (metatypes.isError) return Promise.resolve(Result.Pass(metatypes));

        const relationships = await relationshipRepo.list(true);
        if (relationships.isError) return Promise.resolve(Result.Pass(relationships));

        const pairs = await pairRepo.list();
        if (pairs.isError) return Promise.resolve(Result.Pass(pairs));

        changelist.changelist = new Changelist({
            metatypes: metatypes.value,
            metatypeRelationships: relationships.value,
            metatypeRelationshipPairs: pairs.value,
        });

        return Promise.resolve(Result.Success(true));
    }

    constructor() {
        super(ChangelistMapper.tableName);
        // in order to avoid loading the changelist field we need to select fields explicitly
        // so that this return doesn't get bogged down by the massive amount of json each changelist
        // could potentially be
        this._rawQuery = [
            `SELECT 
        id, 
        name, 
        container_id,
        status,
        created_at,
        modified_at,
        created_by,
        modified_by,
        applied_at,
        base_ontology_version_id FROM ${ChangelistMapper.tableName}`,
        ];
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    status(operator: string, value: any) {
        super.query('status', operator, value);
        return this;
    }

    createdBy(operator: string, value: any) {
        super.query('created_by', operator, value);
        return this;
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<ChangelistRecord[]>> {
        const results = await super.findAll(options, {
            transaction,
            resultClass: ChangelistRecord,
        });

        this._rawQuery = [
            `SELECT 
        id, 
        name, 
        container_id,
        status,
        created_at,
        modified_at,
        created_by,
        modified_by,
        applied_at,
        base_ontology_version_id FROM ${ChangelistMapper.tableName}`,
        ];

        return Promise.resolve(results);
    }
}
