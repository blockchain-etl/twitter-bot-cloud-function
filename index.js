const request = require('request-promise');
const Buffer = require('safe-buffer').Buffer;

const NEW_DIRECT_MESSAGE_ENDPOINT = "https://api.twitter.com/1.1/direct_messages/events/new.json";
const POST_TWEET_ENDPOINT = "https://api.twitter.com/1.1/statuses/update.json";
const TYPE_ETHEREUM_ANOMALOUS_VALUE = "ethereum_anomalous_value";
const TYPE_ETHEREUM_ANOMALOUS_GAS_COST = "ethereum_anomalous_gas_cost";
const TYPE_BITCOIN_ANOMALOUS_VALUE = "bitcoin_anomalous_value";

// subscribe is the main function called by Cloud Functions.
module.exports.subscribe = async (data, context, callback) => {
    const parsedMessage = parseMessage(data.data);

    console.log(JSON.stringify(parsedMessage));

    const message = buildTwitterMessage(parsedMessage);

    if (message) {
        const directMessageRecipientId = getEnvVar('DIRECT_MESSAGE_RECIPIENT_ID', '');
        if (directMessageRecipientId) {
            console.log(`Sending direct message to Twitter ${message}.`);
            await directMessageInTwitter(message, parseInt(directMessageRecipientId));
        } else {
            console.log(`Sending post to Twitter ${message}.`);
            await postInTwitter(message)
        }
    } else {
        console.log("message was null.")
    }

    callback();
};

const buildTwitterMessage = (parsedMessage) => {
    if (!validateParsedMessage(parsedMessage)) {
        return null;
    }

    const type = parsedMessage.type;

    let message = null;

    if (type === TYPE_ETHEREUM_ANOMALOUS_VALUE) {
        const value = formatEtherValue(parsedMessage.transaction.value);
        message = `Transaction with an unusually high value of ${value} ETH: https://etherscan.io/tx/${parsedMessage.transaction.hash}. ` +
            `Only one transaction had a comparable value in the last 7 days.`;
    } else if (type === TYPE_ETHEREUM_ANOMALOUS_GAS_COST) {
        const gasCost = formatEtherValue(parsedMessage.gas_cost);
        message = `Transaction with an unusually high gas cost of ${gasCost} ETH: https://etherscan.io/tx/${parsedMessage.transaction.hash}. ` +
            `Only one transaction had a comparable value in the last 7 days.`;
    } else if (type === TYPE_BITCOIN_ANOMALOUS_VALUE) {
        const value = formatBitcoinValue(parsedMessage.transaction.input_value);
        message = `Transaction with an unusually high value of ${value} BTC: https://www.blockchain.com/btc/tx/${parsedMessage.transaction.hash}. ` +
            `Only one transaction had a comparable value in the last 7 days.`;
    }

    return message;
};

const validateParsedMessage = (parsedMessage) => {
    if (typeof parsedMessage.type === "undefined") {
        console.log("type is undefined in parsedMessage");
        return false;
    }
    if (parsedMessage.type === TYPE_ETHEREUM_ANOMALOUS_VALUE) {
        if (typeof parsedMessage.transaction === "undefined" || typeof parsedMessage.transaction.value === "undefined") {
            console.log("transaction.value is undefined in parsedMessage");
            return false;
        }
    } else if (parsedMessage.type === TYPE_ETHEREUM_ANOMALOUS_GAS_COST) {
        if (typeof parsedMessage.gas_cost === "undefined") {
            console.log("transaction.gas_cost is undefined in parsedMessage");
            return false;
        }
    } else if (parsedMessage.type === TYPE_BITCOIN_ANOMALOUS_VALUE) {
        if (typeof parsedMessage.transaction === "undefined" || typeof parsedMessage.transaction.input_value === "undefined") {
            console.log("transaction.input_value is undefined in parsedMessage");
            return false;
        }
    }

    return true;
};

const postInTwitter = async (messageText) => {
    const response = await request({
        url: POST_TWEET_ENDPOINT,
        oauth: {
            consumer_key: process.env.APP_KEY,
            consumer_secret: process.env.APP_SECRET,
            token: process.env.TOKEN,
            token_secret: process.env.TOKEN_SECRET
        },
        method: "POST",
        qs: {
            "status": messageText
        }
    });
    console.log(response);
};

const directMessageInTwitter = async (messageText, recipientId) => {
    const message = {
        "event": {
            "type": "message_create",
            "message_create": {
                "target": {
                    "recipient_id": recipientId
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
    return formatAmount(adjustedValue);
};

const formatBitcoinValue = (value) => {
    const adjustedValue = value / Math.pow(10, 8);
    return formatAmount(adjustedValue);
};

const parseMessage = (data) => {
    return JSON.parse(new Buffer(data, 'base64').toString());
};

const getEnvVar = (varName, defaultVal) => {
    if (typeof process.env[varName] === 'undefined') {
        if (typeof defaultVal === 'undefined') {
            throw `${varName} environment variable is not defined - lol.`;
        } else {
            return defaultVal
        }
    } else {
        return process.env[varName];
    }
};


