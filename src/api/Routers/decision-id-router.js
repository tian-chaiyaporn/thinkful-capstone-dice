const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const router = express.Router();
const {Decision} = require('../Models/Decision');

mongoose.Promise = global.Promise;

router.use('/decisions', Decision);

// // (GET) return all blog posts
// router.get('/', (req, res) => {
// 	Article
//     .find()
//     .limit(10)
//     .exec()
//     .then(articles => {
// 		  res.render(path.join(__dirname, '../views/blog_list_page.pug'), {
// 		  	articles: articles
// 		  });
//     })
//     .catch(
//       err => {
//         console.error(err);
//         res.status(500).json({message: 'Internal server error'});
//     });
// });

// (GET) return individual dice
router.get('/:id', (req, res) => {
	Decision
    .findById(req.params.id)
    .exec()
    .then(decision => {
			res.json(decision)
		})
    .catch(err => {
      console.error(err);
        res.status(500).json({message: 'Internal server error'})
    });
});

// // (POST) validate if request has the body params, if yes, add item to blog list
// router.use('/', validateReq(["title", "content", "authorFirst", "authorLast"]));
// router.post('/', (req, res) => {
// 	Article
// 		.create({
// 			title: req.body.title,
// 			content: req.body.content,
// 			author: {
// 				firstName: req.body.authorFirst,
// 				lastName: req.body.authorLast
// 			}})
// 		.then(() => {
// 			res.redirect('/blog');
// 		})
// 		.catch(err => {
// 			console.error(err);
// 			res.status(500).json({message: 'Internal server error'});
// 		});
// });

module.exports = router;
