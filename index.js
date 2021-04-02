require('dotenv').config()
const Web3 = require('web3');
const rtrim = require('rtrim');
const Discord = require('discord.js');

const discord = new Discord.Client();
const web3 = new Web3(process.env.WS_URL);

const subscribeToSwaps = function () {
    web3.eth.subscribe('logs', {
        address: process.env.STABLEVAULT_CONTRACT_ADDRESS,
        topics: [
            web3.eth.abi.encodeEventSignature('TokenSwap(address,uint256,uint256,uint128,uint128)')
        ]
    }, function (error, result) {
        const transactionHash = result.transactionHash;
        const {tokensSold, tokensBought, soldId, boughtId} = web3.eth.abi.decodeLog(
            [
                {
                    type: 'address',
                    name: 'buyer',
                    indexed: true,
                },
                {
                    type: 'uint256',
                    name: 'tokensSold'
                },
                {
                    type: 'uint256',
                    name: 'tokensBought'
                },
                {
                    type: 'uint128',
                    name: 'soldId'
                },
                {
                    type: 'uint128',
                    name: 'boughtId'
                },
            ],
            result.data,
            result.topics.slice(1),
        );

        const message = `\`\`\`Swap ${normalizeFloat(web3.utils.fromWei(tokensSold, getTokenUnitById(soldId)), 2)} ${getTokenById(soldId)} for ${normalizeFloat(web3.utils.fromWei(tokensBought, getTokenUnitById(tokensBought)), 2)} ${getTokenById(boughtId)} \nTransaction: ${transactionHash}\`\`\``;
        notifyDiscord(message);
    });
}

const subscribeToAdds = function () {
    web3.eth.subscribe('logs', {
        address: process.env.STABLEVAULT_CONTRACT_ADDRESS,
        topics: [
            web3.eth.abi.encodeEventSignature('AddLiquidity(address,uint256[],uint256[],uint256,uint256)')
        ]
    }, function (error, result) {
        const transactionHash = result.transactionHash;
        const {tokenAmounts} = web3.eth.abi.decodeLog(
            [
                {
                    type: 'address',
                    name: 'provider',
                    indexed: true,
                },
                {
                    type: 'uint256[]',
                    name: 'tokenAmounts'
                },
                {
                    type: 'uint256[]',
                    name: 'fees'
                },
                {
                    type: 'uint256',
                    name: 'invariant'
                },
                {
                    type: 'uint256',
                    name: 'lpTokenSupply'
                },
            ],
            result.data,
            result.topics.slice(1),
        );

        let message = '```Add';

        for (const [tokenId, amount] of Object.entries(tokenAmounts)) {
            if (amount !== '0') {
                message += ` ${normalizeFloat(web3.utils.fromWei(amount, getTokenUnitById(tokenId)), 2)} ${getTokenById(tokenId)} +`;
            }
        }

        message = rtrim(message, '+');
        message += `\nTransaction: ${transactionHash}\`\`\``;

        notifyDiscord(message);
    });
}

const subscribeToRemoves = function () {
    web3.eth.subscribe('logs', {
        address: process.env.STABLEVAULT_CONTRACT_ADDRESS,
        topics: [
            web3.eth.abi.encodeEventSignature('RemoveLiquidity(address,uint256[],uint256)')
        ]
    }, function (error, result) {
        const transactionHash = result.transactionHash;
        const {tokenAmounts} = web3.eth.abi.decodeLog(
            [
                {
                    type: 'address',
                    name: 'provider',
                    indexed: true,
                },
                {
                    type: 'uint256[]',
                    name: 'tokenAmounts'
                },
                {
                    type: 'uint256',
                    name: 'lpTokenSupply'
                },
            ],
            result.data,
            result.topics.slice(1),
        );

        let message = '```Remove';

        for (const [tokenId, amount] of Object.entries(tokenAmounts)) {
            if (amount !== '0') {
                message += ` ${normalizeFloat(web3.utils.fromWei(amount, getTokenUnitById(tokenId)), 2)} ${getTokenById(tokenId)} +`;
            }
        }

        message = rtrim(message, '+');
        message += `\nTransaction: ${transactionHash}\`\`\``;

        notifyDiscord(message);
    });
}

notifyDiscord = async function (message) {
    const channel = await discord.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    await channel.send(message);
}

getTokenUnitById = function (id) {
    const idToUnitMapping = {
        0: 'mwei', // USDT
        1: 'ether', // BUSD
        2: 'ether', // DAI
    };

    return idToUnitMapping[id];
}

getTokenById = function (id) {
    const idToTokenMapping = {
        0: 'USDT',
        1: 'BUSD',
        2: 'DAI',
    };

    return idToTokenMapping[id];
}

normalizeFloat = function (numberStr, decimals) {
    const indexOfDot = numberStr.indexOf('.');
    let normalized = numberStr;

    if (indexOfDot !== -1) {
        normalized = `${numberStr.substring(0, indexOfDot)}.${numberStr.substr(indexOfDot + 1, decimals)}`;
    }

    return normalized;
}

const start = async function () {
    await discord.login(process.env.DISCORD_BOT_TOKEN);
    await discord.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    subscribeToSwaps();
    subscribeToAdds();
    subscribeToRemoves();
}

start();
