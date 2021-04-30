const firebase = require('firebase');
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');

//const ref = firebase.database().ref();
//const usersRef = ref.child("users/");

let Schema = mongoose.Schema;
let UserSchema = new Schema({
        telegramId: String
    }, {
    collection: "users"
});
let userModel = mongoose.model('user', UserSchema);

module.exports = class UserService {
/*    id: '',
    name: '',
    timeSdorica: '',
    timeGenshin: '',*/

/*const app = firebase.initializeApp({
    apiKey: "AIzaSyBwDCFDJQetTqCv26e-f3l8F9ar4E7txY0",
    authDomain: "gachagamesbot.firebaseapp.com",
    databaseURL: "https://gachagamesbot-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gachagamesbot",
    storageBucket: "gachagamesbot.appspot.com",
    messagingSenderId: "1010486935152",
    appId: "1:1010486935152:web:f2abb4012ac890c2ab3eb5"
})*/

    isNewUser(userid) {
        userModel.exists({'telegramId': userid})
        console.log(!!(userModel.exists({'telegramId': userid})));
        return true;
    };

    saveUser(userid) {
        if (this.isNewUser()) {
            console.log('это новый пользователь');
            const user = new userModel({'telegramId': userid});
        }
/*        const user = new userModel({'telegramId': userid});
        user.save();
        userModel.findOne({'telegramId': userid}, function (err, user) {
                if (err) return console.error(err);
            console.log(user.telegramId);
        })*/

    }
};
