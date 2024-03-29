const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { tweetService } = require('../services');
const paginate = require('../models/plugins/paginate.plugin')

const createTweet = catchAsync(async (req, res, next) => {
    const { content = "", author, replyTo = null, quoteTo = null } = req.body;

    const mentions = content.match(/(@[a-zA-Z0-9_]+)/g) || [];
    const hashtags = content.match(/#\w+/g) || [];

    const data = {
        content,
        author,
        mentions,
        hashtags,
        replyTo,
        quoteTo,
    };

    // Check the tweet type
    // if (replyTo && quoteTo)
    //     return next(new ForbiddenError("Tweet can't be both a reply and a quote!"));

    // if (quoteTo && !(await Tweet.exists({ _id: quoteTo })))
    //     return next(new NotFoundError("Tweet being quoted is not found!"));

    // if (replyTo && !(await Tweet.exists({ _id: replyTo })))
    //     return next(new NotFoundError("Tweet being quoted is not found!"));

    // if (replyTo) {
    //     const originalTweet = await Tweet.findById(replyTo);

    //     if (!originalTweet)
    //         return next(new NotFoundError("Tweet being replied to is not found!"));

    //     await originalTweet.updateRepliesCount();
    // }

    // Attach incoming files
    // if (req.file) {
    //     data.media = {
    //         url: `${process.env.API_URL}/${req.file.path}`,
    //         mediaType: req.file.mimetype.split("/")[0],
    //     };
    // }

    let tweet;

    try {
        tweet = await tweetService.createTweet(data);
        console.log("tweet", tweet)
    } catch (err) {
        let errors = Object.values(err.errors).map(el => el.message);
        let fields = Object.values(err.errors).map(el => el.path);

        console.log(errors, fields);
    }

    return res.status(200).json({
        success: true,
        tweetId: tweet._id  
    });

});

const deleteTweet = catchAsync(async (req, res, next) => {
    const { tweetId } = req.params;

    const tweet = await Tweet.findById(tweetId);
    const tweetAuthorId = tweet.author._id.toString();
    const authUserId = req.user._id.toString();

    if (!tweet)
        return next(new NotFoundError("The tweet couldn't be found in the database!"));

    if (tweetAuthorId !== authUserId)
        return next(new ForbiddenError("You are not authorized to delete this tweet!"));

    await tweet.deleteOne();

    return res.status(200).json({
        isTweetDeleted: true,
    });
});

const deleteRepost = catchAsync(async (req, res, next) => {
    const { _id: userId } = req.user;
    const { tweetId } = req.params;

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) next(new NotFoundError("Tweet not found!"));

    const user = await User.findById(userId);

    await Promise.all([
        tweet.deleteRetweet(userId),
        user.deleteRetweet(tweetId)
    ]);

    return res.status(200).json({
        isReposted: false,
    });
});

const likeTweet = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const tweetId = req.params.tweetId;

    const tweet = await tweetService.createLike(tweetId, userId);

    if (!tweet)
       throw new ApiError(httpStatus.NOT_FOUND, 'The tweet to be liked was not found!');


    return res.status(200).json({
        isLiked: true,
    });
});

const unlikeTweet = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const tweetId = req.params.tweetId;

    const tweet = await tweetService.removeLike(tweetId, userId);

    if (!tweet)
       throw new ApiError(httpStatus.NOT_FOUND, 'The tweet to be unliked was not found!');

    return res.status(200).json({
        isLiked: false,
    });
});

const createRepost = catchAsync(async (req, res, next) => {
    const { _id: userId } = req.user;
    const { tweetId } = req.params;

    const tweet = await Tweet.findById(tweetId);

    if (!tweet)
       throw new ApiError(httpStatus.NOT_FOUND, 'Tweet not found!');

    const user = await User.findById(userId);

    await Promise.all([tweet.addRetweet(userId), user.addRetweet(tweetId)]);

    return res.status(200).json({
        isReposted: true,
    });
});

const getTweetEngagement = catchAsync(async (req, res, next) => {
    const { tweetId } = req.params;

    const query = pick(req.query, ["quotes", "retweets", "likes"]);

    const isQueryEmpty = isObjEmpty(query);

    if (isQueryEmpty)
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid query parameters!')

    if (!(await Tweet.exists({ _id: tweetId })))
        throw new ApiError(httpStatus.BAD_REQUEST, 'Tweet with such ID doesnt exist!')

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
});

const getSearchTweets = catchAsync(async (req, res, next) => {
    const { search } = req.query;
    if (!search)
       throw new ApiError(httpStatus.BAD_REQUEST, 'No query provided!')
    
    const filter = pick(req.query, ['search']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const response = await tweetService.fetchByQuery(filter, options);

    return res.status(200).json(response);

});

const getTrendingTweets = catchAsync(async (req, res, next) => {
    const response = await paginate(
        "Tweet",
        [
            {
                $unwind: {
                    path: "$hashtags",
                    preserveNullAndEmptyArrays: true
                }
            },

            { $match: { hashtags: { $ne: null } } },


            {
                $group: {
                    _id: "$hashtags",
                    count: { $sum: 1 },
                    tweets: { $push: "$$ROOT" }
                }
            },

            { $sort: { count: -1 } },

            {
                $unwind: {
                    path: "$tweets",
                    preserveNullAndEmptyArrays: true
                }
            },

            { $replaceRoot: { newRoot: "$tweets" } },

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
                    preserveNullAndEmptyArrays: true,
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

            { $sort: { "createdAt": -1 } }
        ],
        req.pagination
    )

    return res.status(200).json(response);
});

const getTrendingKeywords = catchAsync(async (req, res, next) => {
    const response = await paginate(
        "Tweet",
        [
            {
                $unwind: {
                    path: "$hashtags",
                    preserveNullAndEmptyArrays: true,
                },
            },

            { $match: { hashtags: { $ne: null } } },
            { $group: { _id: "$hashtags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },

            { $project: { hashtag: "$_id", count: 1, _id: 0 } },
        ],
        req.pagination
    );

    return res.status(200).json(response);
});

const getTweetReplies = catchAsync(async (req, res, next) => {
    const { tweetId } = req.params;

    if (!(await Tweet.exists({ _id: tweetId })))
        return next(new ApiError(httpStatus.NOT_FOUND, 'Tweet with such ID doesnt exist!'));

    const response = await tweetService.fetchReplies(
        new ObjectId(tweetId),
        req.pagination
    );

    return res.status(200).json(response);
});

const getTweet = catchAsync(async (req, res, next) => {
    const { tweetId } = req.params;

    if (!(await Tweet.exists({ _id: tweetId })))
        return next(new ApiError(httpStatus.NOT_FOUND, 'The requested tweet couldnt be found!'));

    const tweet = await tweetService.fetchById(tweetId);

    return res.status(200).json({
        tweet,
    });
});

module.exports = {
    createTweet,
    deleteTweet,
    likeTweet,
    unlikeTweet,
    deleteRepost,
    createRepost,
    getSearchTweets,
    getTweetEngagement,
    getTrendingTweets,
    getTrendingKeywords,
    getTweetReplies,
    getTweet
}