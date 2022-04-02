const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');


exports.getPosts = (req, res, next) => {

    const currentPage = req.query.page || 1;
    const perPage = 2;

    let totalItems;
    Post.find()
        .countDocuments()
        .then(count => {
            totalItems = count;
            return Post.find().skip((currentPage - 1) * perPage).limit(perPage);
        })

        .then(posts => {
            res.status(200).json({
                message: "Posts fetched successfully",
                posts,
                totalItems,


            });

        })

        .catch(err => {
            console.error("Error getting post from DB ", err);
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        })

    /* Post.find()
         .then(posts => {
             res.status(200).json({
                 message: "Posts fetched successfully",
                 posts,
 
             });
 
 
             // [{
             //     _id: 1,
             //     title: "First post",
             //     content: "This is the first post!",
             //     imageUrl: 'images/path.jpeg',
             //     creator: {
             //         name: "Darshan"
             //     },
             //     createdAt: new Date()
             // }]
         })
         .catch(err => {
             console.error("Error getting post from DB ", err);
             if (!err.statusCode) {
                 err.statusCode = 500
             }
             next(err);
         })
 
 */

};


exports.createPost = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        const error = new Error("Validation Failed, entered data is incorrect.");
        error.statusCode = 422;
        throw error;

        // return res.status(422).json({
        //     message: "Validation failed, entered data is incorrect",
        //     errors: errors.array()
        // })
    }

    if (!req.file) {
        const error = new Error("No Image provided");
        error.statusCode = 422;
        throw error
    }

    const imageUrl = req.file.path;
    const title = req.body.title;
    const content = req.body.content;
    console.log({ title, content }, "Will be undefined if content type not application/json in header and body not stringfied");
    let creator;
    let savedPost;
    const post = new Post({
        title,
        content,
        imageUrl,
        creator: req.userId
    })

    post.save()
        .then(result => {
            savedPost = result;
            return User.findById(req.userId)
        })
        .then(user => {
            creator = user;
            user.posts.push(post);
            return user.save();

        })
        .then(result => {
            console.log("Successfully created post entry in DB", res);
            res.status(201).json({
                message: "Post created successfully!",
                post: savedPost,
                creator: { _id: creator._id, name: creator.name }
            })
        })
        .catch(err => {
            console.error("Error saving post to DB ", err);
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        });

}

exports.getPost = (req, res, next) => {


    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not find post for given id.');
                error.statusCode = 404;
                throw error;
            }

            res.status(200).json({ message: "Post fetched.", post })
        }).catch(err => {
            console.error("Error saving post to DB ", err);
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        });


}


exports.updatePost = (req, res, next) => {
    const postId = req.params.postId;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        const error = new Error("Validation Failed, entered data is incorrect.");
        error.statusCode = 422;
        throw error;

    }

    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;

    if (req.file) {
        imageUrl = req.file.path;
    }

    if (!imageUrl) {
        const error = new Error("No Image file picked.");
        error.statusCode = 422;
        throw error;

    }

    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not find post for given id.');
                error.statusCode = 404;
                throw error;
            }
            console.log("The post object ", post);
            if (post.creator.toString() !== req.userId) {
                const error = new Error("Nnot authorized!");
                error.statusCode = 403;
                throw error
            }

            if (imageUrl !== post.imageUrl) {
                clearImage(post.imageUrl)
            }
            post.title = title;
            post.content = content;
            post.imageUrl = imageUrl;
            return post.save();

        })
        .then(result => {
            res.status(200).json({ message: "Post Updated !", post: result })
        })
        .catch(err => {
            console.error("Error saving post to DB ", err);
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        });
};

exports.deletePost = (req, res, next) => {

    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {

            if (!post) {
                const error = new Error('Could not find post for given id.');
                error.statusCode = 404;
                throw error;
            }
            if (post.creator.toString() !== req.userId) {
                const error = new Error("Nnot authorized!");
                error.statusCode = 403;
                throw error
            }

            // check logged in user
            clearImage(post.imageUrl);
            return Post.findByIdAndRemove(postId)
        })
        .then(result => {

            return User.findById(req.userId);
        })
        .then(user => {
            user.posts.pull(postId);
            return user.save();

        })
        .then(result => {

            res.status(200).json({ message: "Post Deleted !!" })

        })
        .catch(err => {
            console.error("Error saving post to DB ", err);
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        });
}


const clearImage = filePath => {
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, err => console.log(err))
}