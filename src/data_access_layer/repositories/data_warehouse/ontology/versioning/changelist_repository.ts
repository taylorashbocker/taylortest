import RepositoryInterface, {QueryOptions, Repository} from '../../../repository';
import ChangelistRecord, {ChangelistApproval} from '../../../../../domain_objects/data_warehouse/ontology/versioning/changelistRecord';
import Result from '../../../../../common_classes/result';
import ChangelistMapper from '../../../../mappers/data_warehouse/ontology/versioning/changelist_mapper';
import {User} from '../../../../../domain_objects/access_management/user';
import {PoolClient} from 'pg';
import ChangelistApprovalMapper from '../../../../mappers/data_warehouse/ontology/versioning/changelist_approval_mapper';

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

    constructor() {
        super(ChangelistMapper.tableName);
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
        return super.findAll(options, {
            transaction,
            resultClass: ChangelistRecord,
        });
    }
}
