import { AbstractMeta, CollectionMeta, DatabaseMeta } from 'documentdb';
import { IUpdateCommands } from './stored-procedures/UpdateStoredProcedure';

/**
 * Common Repository
 * @param <T> Defines the entity type and should therefore extend AbstractMeta.
 * @param <U> Defines the updateable properties of this entity.
 */
export interface IRepository<T extends AbstractMeta, U> {
    create(obj: T): Promise<T>;
    findOne(id: string): Promise<T | null>;
    findAll(): Promise<T[] | null>;
    update(objOrId: T | string, updateCommands: IUpdateCommands<U>): Promise<T>;
    remove(obj: T): Promise<void>;
    removeAll(): Promise<void>;
}
