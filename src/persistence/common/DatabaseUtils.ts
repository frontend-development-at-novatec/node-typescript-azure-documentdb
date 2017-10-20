import { CollectionMeta, DatabaseMeta, DocumentClient, ProcedureMeta, QueryError, SqlQuerySpec, UniqueId } from 'documentdb';
import { bulkDeleteProc } from './stored-procedures/BulkDeleteStoredProcedure';
import { updateProc } from './stored-procedures/UpdateStoredProcedure';

/**
 * Offers some basic database utils.
 */
export class DatabaseUtils {

    public static async getOrCreateDatabase(client: DocumentClient, databaseId: string): Promise<DatabaseMeta> {
        const querySpec: SqlQuerySpec = {
            parameters: [{
                name: '@id',
                value: databaseId,
            }],
            query: 'SELECT * FROM root r WHERE r.id= @id',
        };
        return new Promise<DatabaseMeta>((resolve, reject) => {
            client.queryDatabases(querySpec).toArray((queryErr: QueryError, results: DatabaseMeta[]) => {
                if (queryErr) {
                    reject(queryErr);
                } else {
                    if (results.length === 0) {
                        const databaseSpec: UniqueId = {
                            id: databaseId,
                        };
                        client.createDatabase(databaseSpec, (createErr: QueryError, result: DatabaseMeta) => {
                            if (createErr) {
                                reject(createErr);
                            } else {
                                resolve(result);
                            }
                        });
                    } else {
                        resolve(results[0]);
                    }
                }
            });
        });
    }

    public static async getOrCreateCollection(client: DocumentClient, databaseLink: string, collectionId: string): Promise<CollectionMeta> {
        const querySpec: SqlQuerySpec = {
            parameters: [{
                name: '@id',
                value: collectionId,
            }],
            query: 'SELECT * FROM root r WHERE r.id=@id',
        };
        return new Promise<CollectionMeta>((resolve, reject) => {
            client.queryCollections(databaseLink, querySpec).toArray((queryErr: QueryError, results: CollectionMeta[]) => {
                if (queryErr) {
                    reject(queryErr);
                } else {
                    if (results.length === 0) {
                        const collectionSpec: UniqueId = {
                            id: collectionId,
                        };
                        client.createCollection(databaseLink, collectionSpec, (createErr: QueryError, result: CollectionMeta) => {
                            if (createErr) {
                                reject(createErr);
                            } else {
                                resolve(result);
                            }
                        });
                    } else {
                        resolve(results[0]);
                    }
                }
            });
        });
    }

    public static async getOrCreateUpdateStoredProcedure(client: DocumentClient, collectionLink: string): Promise<ProcedureMeta> {
        const querySpec: SqlQuerySpec = {
            parameters: [{
                name: '@id',
                value: updateProc.id,
            }],
            query: 'SELECT * FROM root r WHERE r.id=@id',
        };

        return await new Promise<ProcedureMeta>((resolve, reject) => {
            client.queryStoredProcedures(collectionLink, querySpec).toArray((queryErr: QueryError, resources: ProcedureMeta[]) => {
                if (queryErr) {
                    reject(queryErr);
                } else {
                    if (resources.length === 0) {
                        client.createStoredProcedure(collectionLink, updateProc, (err: QueryError, result: ProcedureMeta) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(result);
                            }
                        });
                    } else {
                        resolve(resources[0]);
                    }
                }
            });
        });
    }

    public static async getOrCreateBulkDeleteStoredProcedure(client: DocumentClient, collectionLink: string): Promise<ProcedureMeta> {
        const querySpec: SqlQuerySpec = {
            parameters: [{
                name: '@id',
                value: bulkDeleteProc.id,
            }],
            query: 'SELECT * FROM root r WHERE r.id=@id',
        };

        return await new Promise<ProcedureMeta>((resolve, reject) => {
            client.queryStoredProcedures(collectionLink, querySpec).toArray((queryErr: QueryError, resources: ProcedureMeta[]) => {
                if (queryErr) {
                    reject(queryErr);
                } else {
                    if (resources.length === 0) {
                        client.createStoredProcedure(collectionLink, bulkDeleteProc, (err: QueryError, result: ProcedureMeta) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(result);
                            }
                        });
                    } else {
                        resolve(resources[0]);
                    }
                }
            });
        });
    }
}
