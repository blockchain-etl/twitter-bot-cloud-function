const request = require('request-promise');
const Buffer = require('safe-buffer').Buffer;

const NEW_DIRECT_MESSAGE_ENDPOINT = "https://api.twitter.com/1.1/direct_messages/events/new.json";

// subscribe is the main function called by Cloud Functions.
module.exports.subscribe = async (data, context, callback) => {
    const parsedMessage = parseMessage(data.data);

    console.log(JSON.stringify(parsedMessage));

    const message = buildTwitterMessage(parsedMessage);

    if (message) {
        const directMessageRecipientId = getEnvVar('DIRECT_MESSAGE_RECIPIENT_ID', '');
        if (directMessageRecipientId) {
            await directMessageInTwitter(message, parseInt(directMessageRecipientId));
        } else {
            await postInTwitter(message)
        }
    }

    callback();
};

const buildTwitterMessage = (parsedMessage) => {
    if (!validateParsedMessage(parsedMessage)) {
        return null;
    }

    const type = parsedMessage.type;

    let message = null;

    if (type === "anomalous_ether_value") {
        const value = formatEtherValue(parsedMessage.transaction.value);
        message = `Transaction with an unusually high value of ${value} ETH: https://etherscan.io/tx/${parsedMessage.transaction.hash}. ` +
            `Only one transaction had a higher value in the last 7 days.`
    } else if (type === "anomalous_gas_cost") {
        const gasCost = formatEtherValue(parsedMessage.gas_cost);
        message = `Transaction with an unusually high gas cost of ${gasCost} ETH: https://etherscan.io/tx/${parsedMessage.transaction.hash}. ` +
            `Only one transaction had a higher value in the last 7 days.`
    }

    return message;
};

const validateParsedMessage = (parsedMessage) => {
    if (typeof parsedMessage.type === "undefined") {
        console.log("type is undefined in parsedMessage");
        return false;
    }
    if (parsedMessage.type === "anomalous_ether_value") {
        if (typeof parsedMessage.transaction === "undefined" || typeof parsedMessage.transaction.value === "undefined") {
            console.log("transaction.value is undefined in parsedMessage");
            return false;
        }
    }
    if (parsedMessage.type === "anomalous_gas_cost") {
        if (typeof parsedMessage.gas_cost === "undefined") {
            console.log("transaction.gas_cost is undefined in parsedMessage");
            return false;
        }
    }

    return true;
};

const postInTwitter = async (messageText) => {
    // TODO:
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


