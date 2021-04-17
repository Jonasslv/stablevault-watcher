require('dotenv').config()
const Web3 = require('web3');
const Discord = require('discord.js');
const stableVaultAbi = require('./stablevault-abi.json');
const utils = require('./utils');
const rtrim = require('rtrim');

const discord = new Discord.Client();
const web3 = new Web3(process.env.WS_URL);
const stableVaultContract = new web3.eth.Contract(stableVaultAbi, process.env.STABLEVAULT_CONTRACT_ADDRESS);

const subscribeToSwaps = async () => {
    stableVaultContract.events.TokenSwap(null, async (error, event) => {
        const message = await buildMessage(utils.operationTypes.swap, event.transactionHash, event.returnValues);
        await notifyDiscord(message);
    });
}

const subscribeToAdds = async () => {
    stableVaultContract.events.AddLiquidity(null, async (error, event) => {
        const message = await buildMessage(utils.operationTypes.add, event.transactionHash, event.returnValues);
        await notifyDiscord(message);
    });
}

const subscribeToRemoves = async () => {
    stableVaultContract.events.RemoveLiquidity(null, async (error, event) => {
        const message = await buildMessage(utils.operationTypes.remove, event.transactionHash, event.returnValues);
        await notifyDiscord(message);
    });

    stableVaultContract.events.RemoveLiquidityOne(null, async (error, event) => {
        const message = await buildMessage(utils.operationTypes.remove, event.transactionHash, {
            tokenAmounts: {
                [event.returnValues.boughtId]: event.returnValues.tokensBought,
            }
        });
        await notifyDiscord(message);
    });
}

const buildMessage = async (type, transactionHash, data) => {
    let message = `\`\`\`${type}`;

    if (type === utils.operationTypes.swap) {
        message += ` ${utils.normalizeFloat(web3.utils.fromWei(data.tokensSold, utils.getTokenUnitById(data.soldId)), 2)} ${utils.getTokenById(data.soldId)} for ${utils.normalizeFloat(web3.utils.fromWei(data.tokensBought, utils.getTokenUnitById(data.boughtId)), 2)} ${utils.getTokenById(data.boughtId)}`;
    } else {
        for (const [tokenId, amount] of Object.entries(data.tokenAmounts)) {
            if (amount !== '0') {
                message += ` ${utils.normalizeFloat(Web3.utils.fromWei(amount, utils.getTokenUnitById(tokenId)), 2)} ${utils.getTokenById(tokenId)} +`;
            }
        }

        message = rtrim(message, '+');
    }

    message += `\nTransaction: ${transactionHash}`;

    message += `\nReserves:`;
    const reserves = await getReserves();
    let tvl = 0;

    for (const [tokenId, reserve] of Object.entries(reserves)) {
        const reserveWithDecimals = Web3.utils.fromWei(reserve, utils.getTokenUnitById(tokenId));
        message += ` ${utils.normalizeFloat(reserveWithDecimals, 2)} ${utils.getTokenById(tokenId)} +`;
        tvl +=  parseInt(reserveWithDecimals);
    }

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    message = rtrim(message, '+');
    message += `\nTVL: ${currencyFormatter.format(tvl)}`;
    message += '```';

    return message;
}

const notifyDiscord = async (message) => {
    const channel = await discord.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    await channel.send(message);
}

const getReserves = async () => {
    const reserves = {};

    for (const [id] of Object.entries(utils.tokens)) {
        reserves[id] = await stableVaultContract.methods.getTokenBalance(id).call();
    }

    return reserves;
}

const start = async () => {
    await discord.login(process.env.DISCORD_BOT_TOKEN);
    await discord.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    subscribeToSwaps();
    subscribeToAdds();
    subscribeToRemoves();
}

start();
