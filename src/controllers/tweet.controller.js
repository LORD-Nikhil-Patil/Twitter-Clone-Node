const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { tweetService } = require('../services');

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

const likeTweet = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const tweetId = req.params.tweetId;

    const tweet = await tweetService.createLike(tweetId, userId);

    if (!tweet)
        return next(new NotFoundError("The tweet to be liked was not found!"));

    return res.status(200).json({
        isLiked: true,
    });
});

module.exports = {
    createTweet,
    likeTweet
}