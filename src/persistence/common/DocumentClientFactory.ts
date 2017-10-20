import { DocumentClient } from 'documentdb';
import { DATABASE_MASTER_KEY, DATABASE_URL } from '../../common/config';

/**
 * Returns the documentdb document client.
 */
class DocumentClientFactory {

    public documentClient: DocumentClient;

    constructor() {
        this.documentClient = new DocumentClient(DATABASE_URL,
            { masterKey: DATABASE_MASTER_KEY });
    }
}

export default new DocumentClientFactory().documentClient;
