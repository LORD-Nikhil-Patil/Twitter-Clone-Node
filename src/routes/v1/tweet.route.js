const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const tweetValidation = require('../../validations/tweet.validation');
const tweetController = require('../../controllers/tweet.controller');
const paginate = require('../../models/plugins/paginate.plugin')

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Tweets
 *   description: Tweet management and retrieval
 */

router
  .route('/')
  .post(auth('createTweets'), validate(tweetValidation.createTweet), tweetController.createTweet);

/**
* @swagger
* /tweets:
*   post:
*     summary: Create a tweet
*     description: Create a new tweet.
*     tags:
*       - Tweets
*     security:
*       - bearerAuth: []
*     consumes:
*       - application/json
*     produces:
*       - application/json
*     parameters: []  # Add any query parameters if needed
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required: 
*               - tweetId
*               - content
*             properties:
*               content:
*                 type: string
*               author:
*                 type: string
*               media:
*                 type: array
*                 items:
*                   type: object
*                   properties:
*                     url:
*                       type: string
*                     mediaType:
*                       type: string
*                       enum: ['image', 'gif']
*                       message: 'Invalid media type.'
*               mentions:
*                 type: array
*                 items:
*                   type: string
*               hashtags:
*                 type: array
*                 items:
*                   type: string
*               visibility:
*                 type: string
*                 enum: ['EVERYONE', 'FOLLOWED', 'MENTIONED']
*                 default: 'EVERYONE'
*               replyTo:
*                 type: string
*                 format: email
*               quoteTo:
*                 type: string
*                 format: email
*               repliesCount:
*                 type: number
*               likes:
*                 type: array
*               retweets:
*                 type: array
*             example:
*                content: 'This is a tweet!'
*                author: '657d3980f756aa0a1ceb5e13'
*                media:
*                  - url: 'https://example.com/image.jpg'
*                    mediaType: 'image'
*                mentions: []
*                hashtags: []
*                visibility: 'EVERYONE'
*                replyTo: ' '  # tweetId of the tweet being replied to
*                quoteTo: ' '  # tweetId of the tweet being quoted
*                repliesCount: 10
*                likes:
*                  - id: 123
*                    email: 'user@example.com'
*                    name: 'John Doe'
*                    role: 'user'
*                retweets:
*                  - id: 456
*                    email: 'anotheruser@example.com'
*                    name: 'Jane Doe'
*                    role: 'user'
*     responses:
*       '201':
*         description: Tweet created successfully
*         schema:
*            $ref: '#/definitions/Twitter'
*       '401':
*         $ref: '#/components/responses/Unauthorized'
*       '403':
*         $ref: '#/components/responses/Forbidden'
*
*/

router
  .route('/search/recent')
  .get(auth('createTweets'), validate(tweetValidation.getTweets), tweetController.getSearchTweets);

/**
* @swagger
* /tweets/search/recent:
*   get:
*     summary: Get Tweets
*     description: Search all tweet.
*     tags:
*       - Tweets
*     security:
*       - bearerAuth: []
*     consumes:
*       - application/json
*     produces:
*       - application/json
*     parameters:  
*       - in: query
*         name: search
*         schema:
*           type: string
*         description: Query string
*       - in: query
*         name: sortBy
*         schema:
*           type: string
*         description: sort by query in the form of field:desc/asc (ex. name:asc)
*       - in: query
*         name: limit
*         schema:
*           type: integer
*           minimum: 1
*         default: 10
*         description: Maximum number of users
*       - in: query
*         name: page
*         schema:
*           type: integer
*           minimum: 1
*           default: 1
*         description: Page number  
*     
*/


router
  .route('/trending/keywords')
  .get(auth('createTweets'), paginate, tweetController.getTrendingKeywords);

router
  .route('/trending/content')
  .get(auth('createTweets'), paginate, tweetController.getTrendingTweets);

router
  .route('/:tweetId')
  .get(auth('createTweets'), tweetController.getTweet)
  .delete(auth('createTweets'), tweetController.deleteTweet);

router
  .route("/:tweetId/engagement")
  .get(auth('createTweets'), paginate, tweetController.getTweetEngagement);

router
  .route("/:tweetId/repost")
  .post(auth('createTweets'), paginate, tweetController.createRepost);

router
  .route("/:tweetId/like")
  .post(auth('createTweets'), paginate, tweetController.likeTweet);

router
  .route("/:tweetId/repost")
  .delete(auth('createTweets'), paginate, tweetController.deleteRepost);

router
  .route("/:tweetId/like")
  .delete(auth('createTweets'), paginate, tweetController.unlikeTweet);



module.exports = router;
