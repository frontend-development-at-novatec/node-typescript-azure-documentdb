import { transformAndValidate } from 'class-transformer-validator';
import { QueryError, RetrievedDocument, SqlQuerySpec } from 'documentdb';
import { DbQueryError } from '../errors/DbQueryError';
import { UnexpectedDbError } from '../errors/UnexpectedDbError';
import { BaseCRUDRepository } from './common/BaseCRUDRepository';
import { IRepository } from './common/IRepository';
import { IUserEntity, IUserEntityUpdateProperties, UserEntity } from './entities/UserEntity';

/**
 * The users repository. CRUD operations and more on the UserEntity in the documentdb.
 */
class UsersRepository extends BaseCRUDRepository<IUserEntity, IUserEntityUpdateProperties> {

    constructor() {
        super('users', UserEntity);
    }

    /**
     * Finds an user by given key.
     * Returns the retrieved document or null in case nothing was found.
     * @param key The key to search for.
     * @returns {Promise<IUserEntity | null>}
     * @throws {RepositoryError | UnexpectedDbError}
     */
    public async findByKey(key: string): Promise<IUserEntity | null> {
        try {
            await this.evaluateInit();
            const querySpec: SqlQuerySpec = {
                parameters: [{
                    name: '@key',
                    value: key,
                }],
                query: 'SELECT * FROM root r WHERE r.key=@key',
            };
            const user = await new Promise<RetrievedDocument | null>((resolve, reject) => {
                this.docDbClient.queryDocuments(this.collection!._self, querySpec).toArray((err: QueryError, results: RetrievedDocument[]) => {
                    if (err) {
                        reject(new DbQueryError(err));
                    } else {
                        if (results.length === 0) {
                            resolve(null);
                        } else {
                            resolve(results[0]);
                        }
                    }
                });
            });
            return user !== null ? await transformAndValidate(this.classType, user) : null;
        } catch (e) {
            this.handleRepositoryErrors(e);
        }
        throw new UnexpectedDbError();
    }
}

export default new UsersRepository();
