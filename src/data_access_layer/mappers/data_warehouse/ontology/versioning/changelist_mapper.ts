import ChangelistRecord from '../../../../../domain_objects/data_warehouse/ontology/versioning/changelistRecord';
import Mapper from '../../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../../../common_classes/result';

const format = require('pg-format');
const resultClass = ChangelistRecord;

export default class ChangelistMapper extends Mapper {
    public static tableName = 'changelists';

    private static instance: ChangelistMapper;

    public static get Instance(): ChangelistMapper {
        if (!ChangelistMapper.instance) {
            ChangelistMapper.instance = new ChangelistMapper();
        }

        return ChangelistMapper.instance;
    }

    public async Create(userID: string, input: ChangelistRecord, transaction?: PoolClient): Promise<Result<ChangelistRecord>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, m: ChangelistRecord[], transaction?: PoolClient): Promise<Result<ChangelistRecord[]>> {
        return super.run(this.createStatement(userID, ...m), {
            transaction,
            resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<ChangelistRecord>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass});
    }

    public async SetStatus(
        id: string,
        userID: string,
        status: 'pending' | 'approved' | 'rejected' | 'applied' | 'deprecated' | 'ready',
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return super.runStatement(this.setStatusStatement(id, userID, status), {transaction});
    }

    public async Update(userID: string, m: ChangelistRecord, transaction?: PoolClient): Promise<Result<ChangelistRecord>> {
        const r = await super.run(this.fullUpdateStatement(userID, m), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, m: ChangelistRecord[], transaction?: PoolClient): Promise<Result<ChangelistRecord[]>> {
        return super.run(this.fullUpdateStatement(userID, ...m), {
            transaction,
            resultClass,
        });
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...changelists: ChangelistRecord[]): string {
        const text = `INSERT INTO changelists(
                        name,
                        container_id,
                        status,
                        changelist,
                        base_ontology_version_id,
                        created_by,
                        modified_by
        ) VALUES %L RETURNING *`;
        const values = changelists.map((changelist) => [
            changelist.name,
            changelist.container_id,
            changelist.status,
            changelist.changelist,
            changelist.base_ontology_version_id,
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...changelists: ChangelistRecord[]): string {
        const text = `UPDATE changelists AS c SET
                        name = u.name,
                        container_id = u.container_id::bigint,
                        status = u.status,
                        changelist = u.changelist::jsonb,
                        base_ontology_version_id = u.base_ontology_version_id::bigint,    
                        modified_by = u.modified_by,
                        modified_at = NOW()
                       FROM(VALUES %L) AS u(id, name, container_id, status, changelist, base_ontology_version_id, modified_by)
                       WHERE u.id::bigint = c.id RETURNING c.*`;
        const values = changelists.map((changelist) => [
            changelist.id,
            changelist.name,
            changelist.container_id,
            changelist.status,
            changelist.changelist,
            changelist.base_ontology_version_id,
            userID,
        ]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM changelists WHERE id = $1`,
            values: [id],
        };
    }

    private setStatusStatement(id: string, userID: string, status: 'pending' | 'approved' | 'rejected' | 'applied' | 'deprecated' | 'ready'): QueryConfig {
        return {
            text: `UPDATE changelists SET status = $2, modified_at = NOW(), modified_by = $3 WHERE id = $1`,
            values: [id, status, userID],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM changelists WHERE id = $1`,
            values: [id],
        };
    }
}
