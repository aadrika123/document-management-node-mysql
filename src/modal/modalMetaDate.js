const executeQuery = require("../components/executeQuery")



// exports.modalMetaDataInsert = async (documentId, fileDetails) => {

//     const { originalname, encoding, mimetype, destination, filename, path, size, ipAddress, tags, token, computedDigest } = fileDetails;

//     const result = await executeQuery('insert into meta_data (document_id, attribute, attribute_value) VALUES (?,?,?)', [documentId, attribute, attributeValue])
//     return result;
// }

exports.modalMetaDataInsert = async (documentId, fileDetails) => {
    try {
        const { originalname, encoding, mimetype, destination, filename, path, size, ipAddress, tags, token, computedDigest } = fileDetails;

        const attributes = [
            { attribute: 'originalname', attributeValue: originalname },
            { attribute: 'encoding', attributeValue: encoding },
            { attribute: 'mimetype', attributeValue: mimetype },
            { attribute: 'destination', attributeValue: destination },
            { attribute: 'filename', attributeValue: filename },
            { attribute: 'path', attributeValue: path },
            { attribute: 'size', attributeValue: size },
            { attribute: 'ipAddress', attributeValue: ipAddress },
            { attribute: 'tags', attributeValue: tags },
            { attribute: 'token', attributeValue: token },
            { attribute: 'computedDigest', attributeValue: computedDigest }
        ];

        const insertPromises = attributes?.map(({ attribute, attributeValue }) => {
            return executeQuery('INSERT INTO meta_data (document_id, attribute, attribute_value) VALUES (?, ?, ?)', [documentId, attribute, attributeValue]);
        });

        const results = await Promise.all(insertPromises);
        return results;
    } catch (error) {
        throw new Error({ status: false, message: "Error in Inserting Digest", error: error })
    }
};
