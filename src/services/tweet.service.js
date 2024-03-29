const { Tweet } = require('../models');
const {
    userInfoSelector,
    userTweetSelector,
    postDetailSelector
} = require("../helpers/selectors");
const paginate = require('../models/plugins/paginate.plugin')

const createTweet = async (data) => {
    const newTweet = await new Tweet(data).save()
    return newTweet;
}

const createLike = async (tweetId, userId) => {
    return await Tweet.findByIdAndUpdate(tweetId, {
        $addToSet: { likes: userId },
    });
};

const removeLike = async (tweetId, userId) => {
    return await Tweet.findByIdAndUpdate(tweetId, {
        $pull: { likes: userId },
    });
};

const fetchById = async (tweetId) => {
    const tweet = await Tweet.findById(tweetId).populate({
        path: "author",
        select: userInfoSelector,
    }).populate({
        path: "replyTo",
        select: postDetailSelector,
        populate: {
            path: "author",
            select: userInfoSelector,
        }
    }).populate({
        path: "quoteTo",
        select: postDetailSelector,
        populate: {
            path: "author",
            select: userInfoSelector,
        }
    });

    return tweet;
};

const fetchByQuery = async (filter, options) => {
    const tweets = await Tweet.paginate(filter, options);
    return tweets;
}

const fetchReplies = async (tweetId, options) => {
    return await paginate(
        "Tweet",
        [
            { $match: { replyTo: tweetId } },

            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "_id",
                    as: "author",
                },
            },
            {
                $unwind: {
                    path: "$author",
                },
            },
            {
                $lookup: {
                    from: "tweets",
                    localField: "quoteTo",
                    foreignField: "_id",
                    as: "quoteTo",
                },
            },
            {
                $unwind: {
                    path: "$quoteTo",
                    preserveNullAndEmptyArrays: true,
                },
            },

            {
                $lookup: {
                    from: "users",
                    localField: "quoteTo.author",
                    foreignField: "_id",
                    as: "quoteTo.author",
                },
            },
            {
                $unwind: {
                    path: "$quoteTo.author",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "tweets",
                    localField: "replyTo",
                    foreignField: "_id",
                    as: "replyTo",
                },
            },
            {
                $unwind: {
                    path: "$replyTo",
                    preserveNullAndEmptyArrays: true,
                },
            },

            {
                $lookup: {
                    from: "users",
                    localField: "replyTo.author",
                    foreignField: "_id",
                    as: "replyTo.author",
                },
            },
            {
                $unwind: {
                    path: "$replyTo.author",
                    preserveNullAndEmptyArrays: true,
                },
            },

            { $project: { document: "$$ROOT", ...userTweetSelector } },
            { $replaceRoot: { newRoot: "$document" } },
        ],
        options
    );
};

const fetchEngagement = async (req, res, next) => {
    const parsedId = new ObjectId(tweetId);

    const field = query.likes ? "likes" : query.retweets ? "retweets" : "quotes";
    const filter = field === "quotes" ? { quoteTo: parsedId } : { _id: parsedId };

    const response = await paginate(
        "Tweet",
        [
            { $match: filter },

            {
                $lookup: {
                    from: "users",
                    localField: `${field}`,
                    foreignField: "_id",
                    as: `${field}`,
                },
            },
            {
                $unwind: {
                    path: `$${field}`,
                },
            },

            { $replaceRoot: { newRoot: `$${field}` } },
            { $project: { ...engagementSelector } },
        ],
        req.pagination
    );

    return res.status(200).json(response);
};




module.exports = {
    createTweet,
    createLike,
    removeLike,
    fetchById,
    fetchByQuery,
    fetchReplies,
    fetchEngagement
}