const request = require('request-promise');
const Buffer = require('safe-buffer').Buffer;

const NEW_DIRECT_MESSAGE_ENDPOINT = "https://api.twitter.com/1.1/direct_messages/events/new.json";

// subscribe is the main function called by Cloud Functions.
module.exports.subscribe = async (data, context, callback) => {
    const parsedMessage = parseMessage(data.data);

    console.log(JSON.stringify(parsedMessage));

    await directMessageInTwitter(`Test message: ${JSON.stringify(parsedMessage)}`);

    callback();
};

const directMessageInTwitter = async (messageText) => {
    const message = {
        "event": {
            "type": "message_create",
            "message_create": {
                "target": {
                    "recipient_id": 1
                },
                "message_data": {
                    "text": messageText,
                }
            }
        }
    };
    const response = await request({
        url: NEW_DIRECT_MESSAGE_ENDPOINT,
        oauth: {
            consumer_key: process.env.APP_KEY,
            consumer_secret: process.env.APP_SECRET,
            token: process.env.TOKEN,
            token_secret: process.env.TOKEN_SECRET
        },
        method: "POST",
        json: message
    });
    console.log(response);
};

const formatAmount = (num) => {
    if (num) {
        return num.toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    } else {
        return num;
    }
};

const formatEtherValue = (value) => {
    const adjustedValue = value / Math.pow(10, 18);
    const formattedValue = formatAmount(adjustedValue);
    return formattedValue;
};

const parseMessage = (data) => {
    return JSON.parse(new Buffer(data, 'base64').toString());
};

