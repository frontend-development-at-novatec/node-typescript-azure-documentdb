import { Procedure } from 'documentdb';

export const bulkDeleteProc: Procedure = {
    id: 'bulkDelete',
    serverScript: () => {
        const collection: ICollection = getContext().getCollection();
        const collectionLink: string = collection.getSelfLink();
        const response: IResponse = getContext().getResponse();
        const responseBody: any = {
            deleted: 0,
        };
        const query = 'SELECT * FROM root';

        tryQueryAndDelete();

        function tryQueryAndDelete(continuation?: string) {
            const requestOptions: IFeedOptions = { continuation };

            const isAccepted: boolean = collection.queryDocuments(
                collectionLink, query, requestOptions, (err: IFeedCallbackError, retrievedDocs: any[], responseOptions: IFeedCallbackOptions) => {
                    if (err) {
                        throw err;
                    }

                    if (retrievedDocs.length > 0) {
                        // Begin deleting documents as soon as documents are returned form the query results.
                        // tryDelete() resumes querying after deleting; no need to page through continuation tokens.
                        //  - this is to prioritize writes over reads given timeout constraints.
                        tryDelete(retrievedDocs);
                    } else {
                        response.setBody(responseBody);
                    }
                });

            // If we hit execution bounds - return continuation: true.
            if (!isAccepted) {
                response.setBody(responseBody);
            }
        }

        function tryDelete(documents: IDocumentMeta[]) {
            if (documents.length > 0) {
                // Delete the first document in the array.
                const isAccepted: boolean = collection.deleteDocument(documents[0]._self, {}, (err, responseOptions) => {
                    if (err) {
                        throw err;
                    }
                    responseBody.deleted++;
                    documents.shift();
                    // Delete the next document in the array.
                    tryDelete(documents);
                });

                // If we hit execution bounds - return continuation: true.
                if (!isAccepted) {
                    response.setBody(responseBody);
                }
            }
        }
    },
};
