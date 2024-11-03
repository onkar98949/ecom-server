const mongoose = require('mongoose')

const memberSchema = new mongoose.Schema({
    email: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    pincode: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    cover: { type: String },
})

module.exports = mongoose.model("account", memberSchema)