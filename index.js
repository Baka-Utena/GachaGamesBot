const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
require('dotenv').config();

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, {polling: true});

let today = new Date();

let user = {};

/*class MyBot extends TelegramBot(token, {polling: true}) {

}*/


bot.onText(/\/start/, (msg, match) => {
    user.chatId = msg.chat.id;
    user.firstName = msg.chat.first_name;
});
bot.onText(/\/genshin/, (msg, match) => {
    user.chatId = msg.chat.id;
    user.firstName = msg.chat.first_name;
    genshin(user.chatId);
});
bot.onText(/\/sdorica/, (msg, match) => {
    user.chatId = msg.chat.id;
    user.firstName = msg.chat.first_name;
    sdorica(user.chatId);
});

bot.onText(/\/info/, (msg, match) => {
    bot.sendMessage(user.chatId, 'Информация')
});

function fillDateTemplate(hour = '0', weekday = '*') {
    let dateTemplate = '';
    dateTemplate = `0 0 ${hour} * * ${weekday}`;
    return dateTemplate;
}

function getTime(userid) {          // TO DO - дописать обработку ввода (ошибочные значения и т д)
    return new Promise((resolve, reject) => {
        let time = 0;
        let regexp = /\d\d/;
        bot.onText(regexp, (msg, text) => {
            let result = (text && (text >= 0) && (text < 24));
            if (result) {
                time = text;
                console.log('0 '+ time)
                bot.sendMessage(userid, 'Выбрано время: ' + time + ' ч.');
                bot.removeTextListener(regexp);
                resolve(time);
            } else {
                bot.sendMessage(userid, 'Введено некорректное значение');
                bot.removeTextListener(regexp);
                sdorica(user.chatId);
                reject();
            }
        })
    })
}

function genshin(userid) {
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
            bot.on('callback_query', (query) => {
                transmutationDay = Number(query.data);
                bot.editMessageText('Выберите день для оповещений об элементальном модификаторе: выбрано "' + weekdays[transmutationDay].toLowerCase() + '"', {
                    chat_id: user.chatId,
                    message_id: query.message.message_id
                });

                resolve(true);
            })
        });
        bot.sendMessage(userid, 'В котором часу вам удобнее получать оповещения? (введите от 0 до 23): ');
        time = await getTime(userid);
        await new Promise((resolve, reject) => {
            dateTemplateGenshin = fillDateTemplate(time, transmutationDay);
            user.timeGenshin = fillDateTemplate(time, transmutationDay);
            resolve(true);
        })
    }
    bot.sendMessage(userid, 'Выберите день для оповещений об элементальном модификаторе:', {
        reply_markup: {
            inline_keyboard: keyboardWeekday
        },
    });
    getChosenDate().then(setJobGenshin);
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
            console.log('3 '+dateTemplateSdorica)
            resolve(true);
        })
    }
    bot.sendMessage(userid, 'В котором часу вам удобнее получать оповещения? (введите от 0 до 23): ');
    getChosenTime().then(setJobSdorica);
}
