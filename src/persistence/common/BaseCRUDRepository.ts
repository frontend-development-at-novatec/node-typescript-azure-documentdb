import { ClassType, transformAndValidate } from 'class-transformer-validator';
import { ValidationError } from 'class-validator';
import {
    AbstractMeta, CollectionMeta, DatabaseMeta, DocumentClient, NewDocument, ProcedureMeta, QueryError,
    RetrievedDocument, SqlQuerySpec,
} from 'documentdb';
import { DATABASE_ID } from '../../common/config';
import { DbQueryError } from '../../errors/DbQueryError';
import { RepositoryError } from '../../errors/RepositoryError';
import { UnexpectedDbError } from '../../errors/UnexpectedDbError';
import { DatabaseUtils } from './DatabaseUtils';
import DocumentDbClient from './DocumentClientFactory';
import { IRepository } from './IRepository';
import { bulkDeleteProc } from './stored-procedures/BulkDeleteStoredProcedure';
import { IUpdateCommands, updateProc } from './stored-procedures/UpdateStoredProcedure';

/**
 * The Base class for all Repositories.
 * Each Repository should extend this class and call its' constructor first.
 * @param <T> Defines the entity type and should therefore extend AbstractMeta.
 * @param <U> Defines the updateable properties of this entity.
 */
export abstract class BaseCRUDRepository<T extends AbstractMeta, U> implements IRepository<T, U> {

    /**
     * The database this service is running against.
     * Should not be manipulated in common cases. Is public for testing reasons.
     */
    public database: DatabaseMeta | undefined;

    /**
     * The collection of this repository.
     * Should not be manipulated in common cases. Is public for testing reasons.
     */
    public collection: CollectionMeta | undefined;

    /**
     * The stored procedure reference for updating documents.
     */
    protected updateProcedure: ProcedureMeta | undefined;

    /**
     * The stored procedure reference for cleaning the collection.
     */
    protected bulkDeleteProcedure: ProcedureMeta | undefined;

    /**
     * The DocumentClient to work with the documentdb.
     */
    protected docDbClient: DocumentClient;

    /**
     * The class constructor of the entity that the repository handles.
     */
    protected classType: new (...args: any[]) => T;

    /**
     * The collectionId that is set initially.
     */
    private collectionId: string;

    /**
     * Constructor of the BaseCRUDRepository. Is used to initialize the database and the collection.
     * It is setting up the connect and creates or gets both.
     * @param collectionId The collection id.
     * @param classType The class constructor of the entity that the repository handles.
     */
    constructor(collectionId: string, classType: new (...args: any[]) => T) {
        this.docDbClient = DocumentDbClient;
        this.collectionId = collectionId;
        this.classType = classType;
    }

    /**
     * Creates a new object.
     * @param obj The object to create.
     * @returns {Promise<T>}
     * @throws {RepositoryError | UnexpectedDbError}
     */
    public async create(obj: T): Promise<T> {
        try {
            await this.evaluateInit();
            const retrieved = await new Promise<RetrievedDocument>((resolve, reject) => {
                this.docDbClient.createDocument(this.collection!._self, obj, (err: QueryError, result: RetrievedDocument) => {
                    if (err) {
                        reject(new DbQueryError(err));
                    } else {
                        resolve(result);
                    }
                });
            });
            return await transformAndValidate(this.classType, retrieved);
        } catch (e) {
            await this.handleRepositoryErrors(e);
        }
        throw new UnexpectedDbError();
    }

    /**
     * Finds an object by id.
     * Returns the retrieved document or null in case nothing was found.
     * @param id The id to search for.
     * @returns {Promise<T | null>}
     * @throws {RepositoryError | UnexpectedDbError}
     */
    public async findOne(id: string): Promise<T | null> {
        try {
            await this.evaluateInit();
            const querySpec: SqlQuerySpec = {
                parameters: [{
                    name: '@id',
                    value: id,
                }],
                query: 'SELECT * FROM root r WHERE r.id=@id',
            };
            const retrieved = await new Promise<RetrievedDocument | null>((resolve, reject) => {
                this.docDbClient.queryDocuments(this.collection!._self, querySpec).toArray(async (err: QueryError, results: RetrievedDocument[]) => {
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
            return retrieved !== null ? await transformAndValidate(this.classType, retrieved) : null;
        } catch (e) {
            await this.handleRepositoryErrors(e);
        }
        throw new UnexpectedDbError();
    }

    /**
     * Finds all objects.
     * Returns array of result if retrieved at least one document or null if nothing was found.
     * @returns {Promise<T[]| null>}
     * @throws {RepositoryError | UnexpectedDbError}
     */
    public async findAll(): Promise<T[] | null> {
        try {
            await this.evaluateInit();
            const querySpec: SqlQuerySpec = {
                parameters: [],
                query: 'SELECT * FROM root r',
            };
            const retrieved = await new Promise<RetrievedDocument[] | null>((resolve, reject) => {
                this.docDbClient.queryDocuments(this.collection!._self, querySpec).toArray((err: QueryError, results: RetrievedDocument[]) => {
                    if (err) {
                        reject(new DbQueryError(err));
                    } else {
                        if (results.length === 0) {
                            resolve(null);
                        } else {
                            resolve(results);
                        }
                    }
                });
            });
            return retrieved !== null ? await transformAndValidate(this.classType, retrieved) : null;
        } catch (e) {
            await this.handleRepositoryErrors(e);
        }
        throw new UnexpectedDbError();
    }

    /**
     * Updates an object.
     * @param obj The new object.
     * @returns {Promise<T>}
     * @throws {RepositoryError | UnexpectedDbError}
     */
    public async update(objOrId: T | string, updateCommands: IUpdateCommands<U>): Promise<T> {
        try {
            await this.evaluateInit();
            let id: string;
            if (typeof objOrId === 'object') {
                id = objOrId.id;
            } else if (typeof objOrId === 'string') {
                id = objOrId;
            } else {
                throw new TypeError('The given type got no id field nor is it a id itself.');
            }
            const retrieved = await new Promise<RetrievedDocument>((resolve, reject) => {
                this.docDbClient.executeStoredProcedure(this.updateProcedure!._self, [id, updateCommands], (err: QueryError, result: RetrievedDocument) => {
                    if (err) {
                        reject(new DbQueryError(err));
                    } else {
                        resolve(result);
                    }
                });
            });
            return await transformAndValidate(this.classType, retrieved);
        } catch (e) {
            await this.handleRepositoryErrors(e);
        }
        throw new UnexpectedDbError();
    }

    /**
     * Deletes an object.
     * @param objOrId The object or id of the object.
     * @returns {Promise<void>}
     * @throws {RepositoryError | UnexpectedDbError}
     */
    public async remove(objOrId: T | string): Promise<void> {
        try {
            await this.evaluateInit();
            let documentLink: string;
            if (typeof objOrId === 'object') {
                documentLink = objOrId._self;
            } else if (typeof objOrId === 'string') {
                documentLink = `${this.collection!._self}/docs/${objOrId}`;
            } else {
                throw new TypeError('The given type is not possible to remove.');
            }
            return await new Promise<void>((resolve, reject) => {
                this.docDbClient.deleteDocument(documentLink, (err: QueryError, result) => {
                    if (err) {
                        reject(new DbQueryError(err));
                    } else {
                        resolve();
                    }
                });
            });
        } catch (e) {
            await this.handleRepositoryErrors(e);
        }
        throw new UnexpectedDbError();
    }

    /**
     * Deletes all objects.
     * @returns {Promise<void>}
     * @throws {RepositoryError | UnexpectedDbError}
     */
    public async removeAll(): Promise<void> {
        try {
            await this.evaluateInit();
            return await new Promise<void>((resolve, reject) => {
                this.docDbClient.executeStoredProcedure(this.bulkDeleteProcedure!._self, [], (err: QueryError, result: RetrievedDocument) => {
                    if (err) {
                        reject(new DbQueryError(err));
                    } else {
                        resolve();
                    }
                });
            });
        } catch (e) {
            await this.handleRepositoryErrors(e);
        }
        throw new UnexpectedDbError();
    }

    /**
     * Encapsulates all possible errors.
     * @param e Any object mainly a error or array of errors.
     */
    protected async handleRepositoryErrors(e: any) {
        if (e instanceof TypeError) {
            console.error('TypeError occured.', e);
            throw new RepositoryError(e.message);
        } else if (e instanceof DbQueryError) {
            console.error('DbQueryError occured.', e);
            throw new RepositoryError(e.message);
        } else if (await this.checkForValidationErrors(e)) {
            console.error('Validation Error(s) occured.', e);
            throw new RepositoryError('Validation error(s) occured during transformation from database document into entity.');
        } else {
            console.error('Any not specifically caught and handled error occured.', e);
            throw new UnexpectedDbError();
        }
    }

    /**
     * Checks if the asynchronous initialization has already happened, or if it should be ran.
     * Should be considered to be placed in front of each repository method.
     */
    protected async evaluateInit(): Promise<void> {
        if (this.database === undefined || this.collection === undefined || this.updateProcedure === undefined || this.bulkDeleteProcedure === undefined) {
            await this.initDatabaseCollectionAndStoredProcedures();
        }
    }

    /**
     * Checks if the input contains only ValidationErrors.
     * @param e Any object mainly a error or array of errors.
     */
    private async checkForValidationErrors(e: any): Promise<boolean> {
        return (Array.isArray(e) && e.every((error) => error instanceof ValidationError));
    }

    /**
     * Initializes the database and the collection for the respective repository, as wells as the stored procedures needed.
     * Only public, that it can be used in integration testing to reinitialize the database and the collection.
     * @throws Error when getting or creating db or collection is not successful
     */
    private async initDatabaseCollectionAndStoredProcedures(): Promise<void> {
        try {
            this.database = await DatabaseUtils.getOrCreateDatabase(this.docDbClient, DATABASE_ID);
            this.collection = await DatabaseUtils.getOrCreateCollection(this.docDbClient, this.database._self, this.collectionId);
            this.updateProcedure = await DatabaseUtils.getOrCreateUpdateStoredProcedure(this.docDbClient, this.collection._self);
            this.bulkDeleteProcedure = await DatabaseUtils.getOrCreateBulkDeleteStoredProcedure(this.docDbClient, this.collection._self);
        } catch (e) {
            // Error in getting or creating database, collection or stored procedures.
            throw e;
        }
    }
}
