const { Tweet } = require('../models');

const createTweet = async (data) => {
    const newTweet = await new Tweet(data).save()
    console.log("createTweet",data, newTweet )
    return newTweet;
}

const createLike = async (tweetId, userId) => {
    return await Tweet.findByIdAndUpdate(tweetId, {
        $addToSet: { likes: userId },
    });
};


module.exports = {
    createTweet,
    createLike
}