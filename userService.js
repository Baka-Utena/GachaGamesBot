const mongoose = require('mongoose');

module.exports = class UserService {
    constructor() {
        this.Schema = mongoose.Schema;
        this.UserSchema = new this.Schema({
            telegramId: String,
            telegramFirstName: String,
            telegramLastName: String,
            telegramUsername: String,
            timeSdorica: String,
            timeGenshin: String,
            steamID: String,

        }, {
            collection: "users"
        });
        this.UserModel = mongoose.model('user', this.UserSchema);
    }

    async isExistingUser(userid) {
        return await this.UserModel.exists({'telegramId': userid})
    };
    async isExistingProperty(userid, property) {
        return await this.UserModel.exists({property: null}).catch(err => console.log(err));
    };

    async getSteamIDs() {
        let users = await this.UserModel.find({}, 'steamID');
        return users
            .filter(item => item.steamID)
            .map(item => item.steamID);
    }

    async saveUser(userData) {
        if (await this.isExistingUser(userData.id)) {
            console.log('это существующий пользователь');
        } else {
            console.log(await this.isExistingUser(userData.id));
            let user = new this.UserModel({
                'telegramId': userData.id,
                'telegramFirstName': userData.first_name,
                'telegramLastName': userData.last_name,
                'telegramUsername': userData.username
            });
            await user.save();
            console.log(await this.isExistingUser(userData.id));
        }
    }

    async updateProperty(userData, property, value) {
        if (await this.isExistingUser(userData.id)) {
            console.log('это существующий пользователь');
        } else {
            await this.saveUser(userData.id);
        }
        let user = await this.UserModel.findOne({'telegramId': userData.id});
        await user.updateOne({ [property]: value });
        console.log(user);
        /*
				userModel.findOne({'telegramId': userData}, function (err, user) {
						if (err) return console.error(err);
					console.log(user.telegramId);
				})*/
    }
};
