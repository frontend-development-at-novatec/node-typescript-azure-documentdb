import { IUpdateCommands } from './UpdateStoredProcedure';

/**
 * Update stored procedure functions.
 * @param id The document id for the document that should be updated.
 * @param updateCommands The updateCommands.
 */
export function updateFunc<T>(id: string, updateCommands: IUpdateCommands) {
    const collection: ICollection = getContext().getCollection();
    const collectionLink: string = collection.getSelfLink();
    const response: IResponse = getContext().getResponse();

    // Validate input.
    if (!id) {
        throw new Error('The id is undefined or null.');
    }
    if (!updateCommands) {
        throw new Error('The update command is undefined or null.');
    }

    tryQueryAndUpdate();

    /**
     * Recursively queries for a document by id.
     * Calls tryUpdate(document) as soon as the query returns a document.
     */
    function tryQueryAndUpdate() {
        const query: IParameterizedQuery = { query: 'SELECT * FROM root r WHERE r.id = @id', parameters: [{ name: '@id', value: id }] };

        const isAccepted: boolean = collection.queryDocuments(
            collectionLink, query, (err: IFeedCallbackError, documents: any[]) => {
                if (err) {
                    throw err;
                }

                if (documents.length > 0) {
                    // If the document is found, update it.
                    // There is no need to check for a continuation token since we are querying for a single document.
                    tryUpdate(documents[0]);
                } else {
                    // Else a document with the given id does not exist..
                    throw new Error('Document not found.');
                }
            });

        // If we hit execution bounds - throw an exception.
        // This is highly unlikely given that this is a query by id; but is included to serve as an example for larger queries.
        if (!isAccepted) {
            throw new Error('The stored procedure timed out.');
        }
    }

    /**
     * Updates the supplied document according to the update object passed in to the sproc.
     */
    function tryUpdate(document: IDocumentMeta) {

        // DocumentDB supports optimistic concurrency control via HTTP ETag.
        const requestOptions: IReplaceOptions = { etag: document._etag };

        // Update operators.
        set(document, updateCommands);
        pop(document, updateCommands);
        push(document, updateCommands);
        unshift(document, updateCommands);

        // Update the document.
        const isAccepted: boolean = collection.replaceDocument(document._self, document, requestOptions, (err, updatedDocument, responseOptions) => {
            if (err) {
                throw err;
            }
            // If we have successfully updated the document - return it in the response body.
            response.setBody(updatedDocument);
        });

        // If we hit execution bounds - throw an exception.
        if (!isAccepted) {
            throw new Error('The stored procedure timed out.');
        }
    }

    /**
     * The $set operator sets the value of a field.
     */
    function set(document: any, update: any) {
        let fields: string[];
        let i: number;

        if (update.$set) {
            fields = Object.keys(update.$set);
            for (i = 0; i < fields.length; i++) {
                document[fields[i]] = update.$set[fields[i]];
            }
        }
    }

    /**
     * The $pop operator removes the first or last item of an array.
     * Pass $pop a value of -1 to remove the first element of an array and 1 to remove the last element in an array.
     */
    function pop(document: any, update: any) {
        let fields: string[];
        let i: number;

        if (update.$pop) {
            fields = Object.keys(update.$pop);

            for (i = 0; i < fields.length; i++) {
                if (!Array.isArray(document[fields[i]])) {
                    // Validate the document field; throw an exception if it is not an array.
                    throw new Error('Bad $pop parameter - field in document must be an array.');
                } else {
                    // Otherwise, remove the last element from the array (have 0 default to javascript's pop()).
                    document[fields[i]].pop();
                }
            }
        }
    }

    /**
     * The $push operator adds an item to an array at the end.
     * @param document The document.
     * @param update The commands.
     */
    function push(document: any, update: any) {
        let fields: string[];
        let i: number;

        if (update.$push) {
            fields = Object.keys(update.$push);

            for (i = 0; i < fields.length; i++) {
                if (!Array.isArray(document[fields[i]])) {
                    // Validate the document field; throw an exception if it is not an array.
                    throw new Error('Bad $push parameter - field in document must be an array.');
                } else {
                    // Push the element in to the array.
                    document[fields[i]].push(update.$push[fields[i]]);
                }
            }
        }
    }

    /**
     * The $unshift operator adds an item to an array at the beginning.
     * @param document The document.
     * @param update The commands.
     */
    function unshift(document: any, update: any) {
        let fields: string[];
        let i: number;

        if (update.$unshift) {
            fields = Object.keys(update.$unshift);

            for (i = 0; i < fields.length; i++) {
                if (!Array.isArray(document[fields[i]])) {
                    // Validate the document field; throw an exception if it is not an array.
                    throw new Error('Bad $unshift parameter - field in document must be an array.');
                } else {
                    // Unshift the element in to the array.
                    document[fields[i]].unshift(update.$unshift[fields[i]]);
                }
            }
        }
    }
}
