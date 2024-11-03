const mongoose = require('mongoose');

const cmtSchema = new mongoose.Schema({
    itemId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    comment: { type: String, required: true },
    createdAt: {
        type: Date,
        default: Date.now
    },
})

module.exports = mongoose.model("addComment", cmtSchema)
