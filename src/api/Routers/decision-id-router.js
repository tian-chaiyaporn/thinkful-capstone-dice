const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const router = express.Router();
const {Decision} = require('../Models/Decision');

mongoose.Promise = global.Promise;

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
      res.status(500).json({message: 'Internal server error'})
    });
});

module.exports = router;
