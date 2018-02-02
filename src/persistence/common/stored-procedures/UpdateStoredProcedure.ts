import { Procedure } from 'documentdb';
import { updateFunc } from './update';

export const updateProc: Procedure = {
    id: 'update',
    serverScript: updateFunc,
};

/**
 * Possible update commands.
 */
export interface IUpdateCommands {
    $set?: any;
    $pop?: any;
    $push?: any;
    $unshift?: any;
}
