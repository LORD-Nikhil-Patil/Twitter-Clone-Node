const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const ObjectId = mongoose.Schema.Types.ObjectId;

const tweetSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
            maxLength: [280, "The tweet can't be longer than 280 characters."],
            validate: {
                validator: (c) => {
                    return c.trim().length > 0;
                },
                message: "The tweet can't be empty.",
            },
        },
        author: {
            type: ObjectId,
            ref: "User",
            required: true,
        },
        media: [
            {
                url: {
                    type: String,
                    required: true,
                },
                mediaType: {
                    type: String,
                    required: true,
                    enum: ["image", "gif"],
                    message: "Invalid media type.",
                },
            },
        ],
        mentions: {
            type: [String],
            default: [],
            set: (mentions) => mentions.map((m) => m.toLowerCase().replace("@", "")),
        },
        hashtags: {
            type: [String],
            default: [],
            set: (hashtags) => hashtags.map((h) => h.toLowerCase().replace("#", "")),
        },
        visibility: {
            type: String,
            enum: ["EVERYONE", "FOLLOWED", "MENTIONED"],
            default: "EVERYONE",
        },
        replyTo: {
            type: String,
            ref: "Tweet",
            default: null,
        },
        quoteTo: {
            type: String,
            ref: "Tweet",
            default: null,
        },
        repliesCount: {
            type: Number,
            default: 0,
        },
        likes: {
            type: Array,
            ref: "User",
            default: [],
        },
        retweets: {
            type: Array,
            ref: "User",
            default: [],
        },
    },
    { timestamps: true }
);

  // add plugin that converts mongoose to json
  tweetSchema.plugin(toJSON);
  tweetSchema.plugin(paginate);

// add plugin that converts mongoose to json
tweetSchema.methods.updateRepliesCount = async function () {
    this.repliesCount = await mongoose.model("Tweet").countDocuments({
        replyTo: this._id,
    });

    return this.save();
};

tweetSchema.methods.addRetweet = function (userId) {
    const isRetweeted = this.retweets.some((id) => id === userId);

    if (!isRetweeted) {
        this.retweets.push(userId);
        return this.save();
    }

    return Promise.resolve(this);
};

tweetSchema.methods.deleteRetweet = function (userId) {
    const isRetweeted = this.retweets.some((id) => id.equals(userId));

    if (isRetweeted) {
        this.retweets.remove(userId);
        return this.save();
    }

    return Promise.resolve(this);
};

const Tweet = mongoose.model("Tweet", tweetSchema);

module.exports = Tweet;