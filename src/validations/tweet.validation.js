const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createTweet = {
    body: Joi.object().keys({
        content: Joi.string().required().trim().max(280)
            .custom((value) => {
                if (value.trim().length === 0) {
                    throw new Error("The tweet can't be empty.");
                }
                return value;
            }),
        author: Joi.string().required(),
        media: Joi.array().items(Joi.object({
            url: Joi.string().required(),
            mediaType: Joi.string().valid('image', 'gif').required()
        })),
        mentions: Joi.array().items(Joi.string().trim().allow(null).optional()),
        hashtags: Joi.array().items(Joi.string().trim().allow(null).optional()),
        visibility: Joi.string().valid('EVERYONE', 'FOLLOWED', 'MENTIONED').default('EVERYONE'),
        replyTo: Joi.string().allow(null, '').optional(),
        quoteTo: Joi.string().allow(null, '').optional(),
        repliesCount: Joi.number().integer().default(0),
        likes: Joi.array().items(Joi.object().allow(null).optional()),
        retweets: Joi.array().items(Joi.object().allow(null).optional())
    }),
};

module.exports = {
    createTweet
}