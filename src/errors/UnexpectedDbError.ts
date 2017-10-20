/**
 * This Error indicates that a unexpected error in a db method occured.
 */
export class UnexpectedDbError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = new.target.name;
    }
}
