const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const debug = require('debug')('dice');

const router = express.Router();
const {Decision} = require('../Models/Decision');

mongoose.Promise = global.Promise;

// (GET) return all dice
router.get('/', (req, res) => {
	Decision
    .find()
    .exec()
    .then((decisions) => {
			res.json(decisions);
		})
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error at get all dice'})
    });
});

// router.options('/', (req, res) => {
// 	res
// 		.set('Access-Control-Allow-Origin', '*')
// 		.end()
// })

// (POST) create new dice
router.post('/new', jsonParser, (req, res) => {
	Decision
		.create({
			decision: req.body.decision,
			description: req.body.description,
			options: req.body.options
		})
    .then((decisions) => {
			debug('created new dice')
			res.status(201).json(decisions);
		})
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error at creating new dice'})
    });
});

// (GET) return individual dice
router.get('/:id', (req, res) => {
	Decision
    .findById(req.params.id)
    .exec()
    .then((decision) => {
			res.json(decision);
		})
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error at get /:id'})
    });
});

// (PATCH) return individual dice
router.patch('/:id', jsonParser, (req, res) => {
	debug('calling update dice')
	debug('see request body')
	debug(req.body)
	const toUpdate = {};
	const updateableFields = ['decision', 'description', 'options'];
	updateableFields.forEach(field => {
		if (field in req.body) {
			toUpdate[field] = req.body[field];
		}
	});
	debug('see update data')
	debug(toUpdate);
	Decision
    .findByIdAndUpdate(req.params.id, {$set: toUpdate})
    .exec()
    .then((payload) => {
			debug('finishing update')
			debug(payload)
			debug("Updating successful");
			res.status(204).end()
		})
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error at update /:id'})
    });
});

// (DELETE) return individual dice
router.delete('/:id', (req, res) => {
	Decision
		.findByIdAndRemove(req.params.id)
    .exec()
    .then(() => {
			res.status(204).end();
			debug(`Deleted item \`${req.params.id}\``);
		})
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error at delete /:id'})
    });
});

module.exports = router;
