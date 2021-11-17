const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
let mongoose = require('mongoose');
const UserService = require('./userService');
require('dotenv').config();

const SteamAPI = require('steamapi');
const steam = new SteamAPI(process.env.STEAM_TOKEN);

/*const GenshinKit = require('@genshin-kit/core/lib').GenshinKit;
const genshinKit = new GenshinKit();
genshinKit.loginWithCookie('process.env.MHY_COOKIE')*/

let questions = require('./questions.json');
let gachaImages = require('./gacha.json');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});
bot.on("polling_error", (m) => console.log(m));

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zboym.mongodb.net/gachagames?retryWrites=true&w=majority`;
const database = 'gachagames';
const imagesSource = 'https://gachabot.utena.su/';

let today = new Date();

const userService = new UserService;

/*class MyBot extends TelegramBot(token, {polling: true}) {
}*/


async function steamSearch(userid, userInput) {
	await mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});
	let users = await userService.getSteamIDs(); // [76561198012301100, 76561198033285023, 76561198033285020]
	console.log(users);
	/*	await bot.onText(/^.+$/, (msg, match) => {
			userInputId = msg.text;
		});*/
	let allGames = await steam.getAppList();

	function regexpFilter(query) {
		let regFilter = /[\u2000-\u206F\u2E00-\u2E7F\\'!'"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/;
		let regFilterSp = /\s+/g;
		return query.replace(regFilter, '').replace(regFilterSp, ' ');
	}

	function searchResults(query) {
		let strQuery = regexpFilter(query);
		let regQuery = new RegExp(`${strQuery}`, 'i');
		return allGames.filter(app => regQuery.test(regexpFilter(app.name)));
	}

	async function filterByProperty(arr, property, value) {
		let results = [];
		for (let app of arr) {
			try {
				let game = await (steam.getGameDetails(app.appid));
				if (game[property] === value) {
					results.push(game);
				}
			} catch (err) {
				console.log(err)
			}
		}
		return results;
	}

	async function filterUsers(arr, query) {
		let usersResults = [];
		for (user of arr) {
			try {
				console.log(user);
				//let details = await steam.getUserSummary(id).then(console.log);
				let games = await steam.getUserOwnedGames(user);
				let playedGames = games.filter(item => item.playTime > 0);

				if (playedGames.some(game => game.name === query)) {
					usersResults.push(user)
				}
			} catch (err) {
				console.log(err)
			}
		}
		//usersResults.forEach(item => console.log(item));
		return usersResults;
	}

	// await filterUsers(users, 'fault - milestone');

	async function filterResultsFormatted(query) {
		let filterResults = await filterByProperty(searchResults(query), 'type', 'game').catch(err => console.log(err));
		return filterResults.map(
			item => '<a href="https://store.steampowered.com/app/' + item.appid + '">' + item.name + '</a>'
		).join('\n')
	}

	let src = await searchResults('armello');
	console.log(userInput);
	console.log(userInput === 'armello');
	console.log(src);

/*	await bot.sendMessage(userid, `Введите название`, {
		reply_markup: JSON.stringify({force_reply: true}),
	})
		.then(async sentMessage => {
			const replyListenerId = bot.onReplyToMessage(
				sentMessage.chat.id,
				sentMessage.message_id,
				async reply => {
					let userInputQuery = reply.text;
					console.log(userInputQuery);
					console.log(userInput);
					await bot.sendMessage(sentMessage.chat.id,
						await filterResultsFormatted(userInputQuery) ?
							await filterResultsFormatted(userInputQuery) :
							'Ничего не найдено!'
							+ '',
						{parse_mode: 'HTML'});
					bot.removeReplyListener(replyListenerId)
				}
			)
		})*/

	await bot.sendMessage(userid,
		await filterResultsFormatted(userInput) ?
			await filterResultsFormatted(userInput) :
			'Ничего не найдено!'
			+ userInput,
		{parse_mode: 'HTML'});
}

bot.onText(/\/steam_register/, async (msg, match) => {
	if (isCalledInGroup(msg.chat.id)) {
		await mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});
		await bot.sendMessage(msg.chat.id,
			`Введите свой ID в стиме (ID можно увидеть в адресе вашей страницы, после "https://steamcommunity.com/id/")`,
			{ 'disable_web_page_preview': true,
			reply_markup: JSON.stringify({force_reply: true}),
		})
			.then(async sentMessage => {
				const replyListenerId = bot.onReplyToMessage(
					sentMessage.chat.id,
					sentMessage.message_id,
					async reply => {
						let userInputID = reply.text;
						let id = await (steam.resolve('https://steamcommunity.com/id/' + userInputID)).catch(err => console.log(err));
						if (id) {
							await bot.sendMessage(msg.chat.id,
								'Подтверждаете регистрацию? https://steamcommunity.com/id/' + userInputID,
								{
									reply_markup: {
										"one_time_keyboard": true,
										inline_keyboard: [
											[
												{
													text: 'Да',
													callback_data: JSON.stringify({
														'confirm': true
													})
												},
												{
													text: 'Нет',
													callback_data: JSON.stringify({
														'confirm': false
													})
												},
											]
										]
									}
								}
							).then(
								bot.on('callback_query', async (callbackQuery) => {
									let result = await callbackQuery.data;
									console.log(JSON.parse(result).confirm);

									if (JSON.parse(result).confirm) {
										await userService.updateProperty(msg.chat, 'steamID', id).catch(err => console.log(err));
										bot.sendMessage(msg.chat.id,
											'Ваш Steam ID был добавлен в список!'

										)
									} else {
										bot.sendMessage(msg.chat.id,
											'Регистрация отменена'
										)
									}
									bot.removeAllListeners('callback_query');
								}))
							bot.removeReplyListener(replyListenerId)
						} else {
							bot.sendMessage(msg.chat.id,
								'Пользователь не найден! Убедитесь, что вы ввели правильные данные.')
						}
					}
				)
			})
	} else {
		bot.sendMessage(msg.chat.id, 'Команда работает только в приватном режиме')
	}
});

function getInputAfterCommand(str) {
	let hasText = str.indexOf(' ') !== -1;
	return hasText ? str.slice(str.indexOf(' ')+1) : 'пустой запрос';
}

bot.onText(/\/steamsearch/, async (msg, match) => {
	bot.sendMessage(msg.chat.id, msg.text ? getInputAfterCommand(msg.text) : 'пустой запрос');
});

bot.onText(/\/steam_search/, async (msg, match) => {
	let userInput = getInputAfterCommand(msg.text);
	await mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});
	await steamSearch(msg.chat.id, userInput).catch(err => console.log(err));

	/*    const db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.on('open', function() {
			console.log('We are live on ');
		});*/
});

bot.onText(/\/genshin/, (msg, match) => {
	genshin(msg.chat.id);
});

bot.onText(/\/gacha/, (msg, match) => {
	gacha(msg.chat.id);
});
bot.onText(/\/sdorica/, (msg, match) => {
	sdorica(msg.chat.id);
});

bot.onText(/\/info/, (msg, match) => {
	bot.sendMessage(msg.chat.id, 'Информация')
});

function fillDateTemplate(hour = '0', weekday = '*') {
	let dateTemplate = '';
	dateTemplate = `0 0 ${hour} * * ${weekday}`;
	console.log(dateTemplate);
	return dateTemplate;
}

function writeToDB(userid) {
	usersRef.set({
		userid: {
			timeSdorica: '0 0 19 * * *'
		}
	})
}

function isCalledInGroup(userid) {
	return (userid.toString()[0] !== '-');
}

function getTime(userid, question) {          // TO DO - дописать обработку ввода (ошибочные значения и т д)
	return new Promise((resolve, reject) => {
		let time = 0;
		let regexp = /^\d+$/;
		bot.sendMessage(userid, question);
		bot.onText(/^.+$/, (msg, text) => {
			let result = (text && regexp.test(text) && (text >= 0) && (text < 24));
			if (result) {
				time = text;
				console.log('gen ' + time)
				bot.sendMessage(userid, 'Выбрано время: ' + time + ' ч.');
				bot.removeTextListener(/^.+$/);
				resolve(time);
			} else {
				bot.sendMessage(userid, 'Введено некорректное значение');
				bot.removeTextListener(/^.+$/);
				setTimeout(genshin, 300, user.chatId);
				reject();
			}
		})
	})
}

async function genshin(userid) {

	const TEXT_GENSHIN = 'День элементального модификатора! Не забудьте зайти в геншин';
	let dateTemplateGenshin = '';
	let transmutationDay;
	let time;
	let weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
	let keyboardWeekday = [
		[
			{
				text: weekdays[0],
				callback_data: '0'
			},
			{
				text: weekdays[1],
				callback_data: '1'
			},
			{
				text: weekdays[2],
				callback_data: '2'
			},
			{
				text: weekdays[3],
				callback_data: '3'
			},
		],
		[
			{
				text: weekdays[4],
				callback_data: '4'
			},
			{
				text: weekdays[5],
				callback_data: '5'
			},
			{
				text: weekdays[6],
				callback_data: '6'
			},
		]
	]

	function checkTransmutationDay(weekday) {
		if (today.getDay() === (weekday + 1)) {
			return true;
		}
	}

	function jobGenshin() {
		cron.schedule(dateTemplateGenshin, () => {
			if (checkTransmutationDay(transmutationDay)) {
				bot.sendMessage(userid, TEXT_GENSHIN);
			}
		});
	}

	function setJobGenshin() {
		if (checkTransmutationDay(transmutationDay)) {
			jobGenshin(userid);
			bot.sendMessage(userid, TEXT_GENSHIN);
		} else {
			jobGenshin(userid);
		}
	}

	let getChosenDate = async () => {
		bot.removeAllListeners('callback_query');

		await new Promise((resolve, reject) => {
			bot.sendMessage(userid, 'Выберите день для оповещений об элементальном модификаторе:', {
				reply_markup: {
					inline_keyboard: keyboardWeekday
				},
			});
			bot.on('callback_query', (query) => {
				transmutationDay = Number(query.data);
				bot.editMessageText('Выберите день для оповещений об элементальном модификаторе: выбрано "' + weekdays[transmutationDay].toLowerCase() + '"', {
					chat_id: user.chatId,
					message_id: query.message.message_id
				});

				bot.removeAllListeners('callback_query');
				resolve(true);
			})
		});

		time = await getTime(userid, '(G) В котором часу вам удобнее получать оповещения? (введите от 0 до 23): ');

		await new Promise((resolve, reject) => {
			dateTemplateGenshin = fillDateTemplate(time, transmutationDay);
			user.timeGenshin = dateTemplateGenshin;
			resolve(true);
		})
	}

	if (isCalledInGroup(userid)) {
		await mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});
		console.log('записан ли геншин' + await userService.isExistingTimeGenshin(userid));
		userService.saveUser(userid).then(
			getChosenDate().then(setJobGenshin));
	} else {
		bot.sendMessage(userid, 'Команда работает только в приватном режиме')
	}
}

function gacha(userid) {
	function getRandomNumber(count) {
		let rand = 1 + Math.random() * (count);
		return Math.floor(rand);
	}

	function pull(userid) {
		let questionNumber = getRandomNumber(questions.length) - 1;
		let photoNumber = getRandomNumber(gachaImages.length) - 1;
		bot.sendMessage(userid,
			questions[questionNumber],
			{ 'disable_web_page_preview': true,
				reply_markup: JSON.stringify({force_reply: true}),
			}).then(
			async sentMessage => {
				const replyListenerId = bot.onReplyToMessage(
					sentMessage.chat.id,
					sentMessage.message_id,
					async reply => {
						bot.sendMessage(userid, "ВЖЖЖЖЖУХ!..").then(
							setTimeout(() => bot.sendPhoto(userid, imagesSource + gachaImages[photoNumber]).then(
								bot.removeTextListener(/^\*.+$/)
								).catch(err => {
									console.log(err);
									bot.sendMessage(userid, "Что-то пошло не так...")
								}), 150
							)
						)
					}
				)
			}
		);
	}

	pull(userid);
}

function sdorica(userid) {
	const TEXT_SDORICA = 'Последний день наград за логин! Не забудьте зайти в Сидорику';
	const REWARDS_DATE = new Date(2021, 2, 27, 0, 0);
	const days = 1000 * 60 * 60 * 24;

	let time;

	function getKeyboardTime(time) {
		return [
			[
				{
					text: '^',
					callback_data: 'up'
				}
			],
			[
				{
					text: (time < 10) ? '0' + time + ':00' : time + ':00',
					callback_data: 'time'
				}
			],
			[
				{
					text: 'V',
					callback_data: 'down'
				}
			],
			[
				{
					text: 'Ok',
					callback_data: 'ok'
				}
			]
		]
	}

	let diff_date = Math.round((today.getTime() - REWARDS_DATE.getTime()) / days);
	let isLastLoginDay = (diff_date % 28 === 0);

	let dateTemplateSdorica = '0 0 0 * * *';

	function jobSdorica(userid) {
		let job = cron.schedule(dateTemplateSdorica, () => {
			if (isLastLoginDay) {
				if (isLastLoginDay) {
					bot.sendMessage(userid, TEXT_SDORICA);
				}
			}
		})
	}

	function setJobSdorica() {
		if (isLastLoginDay) {
			bot.sendMessage(userid, TEXT_SDORICA);
			jobSdorica(userid);
		} else {
			jobSdorica(userid);
		}
	}

	let getChosenTime = async () => {
		time = await getTime(userid);
		await new Promise((resolve, reject) => {
			dateTemplateSdorica = fillDateTemplate(time);
			user.timeSdorica = dateTemplateSdorica;
			console.log('sdo ' + dateTemplateSdorica)
			resolve(true);
		})
	}
	if (isCalledInGroup(userid)) {
		bot.sendMessage(userid, 'Ведутся технические работы!')
	} else {
		bot.sendMessage(userid, 'Команда работает только в приватном режиме')
	}
	// bot.sendMessage(userid, 'В котором часу вам удобнее получать оповещения? (введите от 0 до 23): ');
	//getChosenTime().then(setJobSdorica);
}
