import {AbstractMeta, NewDocument} from 'documentdb';

/**
 * The user.
 */
export class UserEntity implements IUserEntity {
    public id: string;
    public key: string;
    public text: string;
    public date: Date;
    public _self: string;
    public _ts: string;
    public _rid?: string;
    public _etag?: string;
    public _attachments?: string;
    public ttl?: number;

    public toString(): string {
        return `UserEntity{id: ${this.id}, key: ${this.key}, text: ${this.text}, date: ${this.date}}`;
    }
}

/**
 * The user entity interface.
 */
export interface IUserEntity extends AbstractMeta, NewDocument {
    key: string;
    text: string;
    date: Date;
    toString(): string;
}
