const Joi = require('joi');

exports.validateTokenId = Joi.object({
    id: Joi.string().required(),
    token: Joi.number().required()
}).unknown();

exports.validateToken = Joi.object({
    token: Joi.string().min(3).required()
}).unknown();

exports.fileUpload = Joi.object({
    // file: Joi.object({
    //     originalName: Joi.string().required(),
    //     size: Joi.number().required(),
    //     mimeType: Joi.string().valid('image/jpeg', 'image/png', 'application/pdf').required()
    //     // Add more validation rules specific to the file if needed
    // }).required(),
    tags: Joi.string().required(),
    token: Joi.number().required()
}).unknown();