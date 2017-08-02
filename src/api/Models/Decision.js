const mongoose = require('mongoose');

// this is our schema to represent a restaurant
const decisionSchema = mongoose.Schema({
  id: {type: Number},
  decision: {type: String, required: true},
  options: [
    {face: {type: String}, content: {type: String}}
  ]
});

decisionSchema.virtual('castId').get(function() {
  return this._id;
});

const Decision = mongoose.model('Decision', decisionSchema);

module.exports = {Decision};
