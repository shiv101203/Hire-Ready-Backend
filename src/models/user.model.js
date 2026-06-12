const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: [true, "username is already taken"],
        required: true,
    }, 

    email: {
        type: String,
        unique: [true, "Account already exists with this email address"],
        required: true
    },

    password: {
        type: String,
        required: true
    }
});

// model ye batata hai ki user ka data kis collection me store hoga
const userModel = mongoose.model("users", userSchema);

module.exports = userModel;