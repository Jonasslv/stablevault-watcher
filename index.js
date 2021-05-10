require('dotenv').config()
const Web3 = require('web3');
const { Client,MessageEmbed } = require('discord.js');
const stableVaultAbi = require('./stablevault-abi.json');
const rtrim = require('rtrim');
const config = require('./config');

const discord = new Client();
const web3 = new Web3(process.env.WS_URL);
const cchainExplorer = process.env.CCHAIN_EXPLORER; 

const start = async () => {
    await discord.login(process.env.DISCORD_BOT_TOKEN);
    await discord.channels.fetch(process.env.DISCORD_CHANNEL_ID); 

    config.vaults.forEach(async (vault) => {
        const contract = new web3.eth.Contract(stableVaultAbi, vault.contractAddress);

        contract.events.TokenSwap(null, async (error, event) => {
            const message = await buildMessage(vault, 'Swap', event.transactionHash, event.returnValues);
            await notifyDiscord(message);
        });

        contract.events.AddLiquidity(null, async (error, event) => {
            const message = await buildMessage(vault, 'Add', event.transactionHash, event.returnValues);
            await notifyDiscord(message);
        });

        contract.events.RemoveLiquidity(null, async (error, event) => {
            const message = await buildMessage(vault, 'Remove', event.transactionHash, event.returnValues);
            await notifyDiscord(message);
        });

        contract.events.RemoveLiquidityOne(null, async (error, event) => {
            const message = await buildMessage(vault, 'Remove', event.transactionHash, {
                tokenAmounts: {
                    [event.returnValues.boughtId]: event.returnValues.tokensBought,
                }
            });
            await notifyDiscord(message);
        });
    });
}

const buildMessage = async (vault, type, transactionHash, data) => {
    let newEmbed = {
        Thumbnail: vault.image,
        Color: vault.embedColor
    };

    const findTokenByIndex = (i) => {
        return vault.tokens.find(t => t.index == i);
    };

    newEmbed.Title = `${type} Token Transaction`;
    newEmbed.URL = `${cchainExplorer}/tx/${transactionHash}`;
    let message = '**Tokens:** ';

    if (type === 'Swap') {
        message += ` ${normalizeFloat(Web3.utils.fromWei(data.tokensSold, findTokenByIndex(data.soldId).unit), 2)} **${findTokenByIndex(data.soldId).ticker}** for ${normalizeFloat(Web3.utils.fromWei(data.tokensBought, findTokenByIndex(data.boughtId).unit), 2)} **${findTokenByIndex(data.boughtId).ticker}**`;
    } else {
        for (const [tokenId, amount] of Object.entries(data.tokenAmounts)) {
            if (amount !== '0') {
                message += ` ${normalizeFloat(Web3.utils.fromWei(amount, findTokenByIndex(tokenId).unit), 2)} **${findTokenByIndex(tokenId).ticker}** +`;
            }
        }

        message = rtrim(message, '+');
    }

    let reserveFields = [];

    message += `\n\n**Reserves:**`;
    const reserves = await getReserves(vault);
    let tvl = 0;

    for (const [tokenId, reserve] of Object.entries(reserves)) {
        const reserveWithDecimals = Web3.utils.fromWei(reserve, findTokenByIndex(tokenId).unit);
        reserveFields.push({value:normalizeFloat(reserveWithDecimals, 2), name:findTokenByIndex(tokenId).ticker});
        tvl += parseInt(reserveWithDecimals);
    }

    newEmbed.Fields = reserveFields;

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    newEmbed.Footer = `TVL: ${currencyFormatter.format(tvl)}`;

    newEmbed.Description = message;
    return makeEmbed(newEmbed);
}

const notifyDiscord = async (message) => {
    const channel = await discord.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    await channel.send(message);
}

const getReserves = async (vault) => {
    const reserves = {};
    const contract = new web3.eth.Contract(stableVaultAbi, vault.contractAddress);

    for (const [index] of Object.entries(vault.tokens)) {
        reserves[index] = await contract.methods.getTokenBalance(index).call();
    }

    return reserves;
}

const normalizeFloat = (numberStr, decimals) => {
    const indexOfDot = numberStr.indexOf('.');
    let normalized = numberStr;

    if (indexOfDot !== -1) {
        normalized = `${numberStr.substring(0, indexOfDot)}.${numberStr.substr(indexOfDot + 1, decimals)}`;
    }

    return normalized;
}

const  makeEmbed = (embedObject) => {
    let embed = new MessageEmbed()
        .setTitle(embedObject.Title)
        .setColor(embedObject.Color)
        .setTimestamp()
        .setDescription(embedObject.Description);
    if (embedObject.Fields != undefined) {
        embedObject.Fields.forEach( (element) => {
            embed.addField(element.name,element.value,true)
        });
    };
    if (embedObject.Thumbnail != undefined) {
        embed.setThumbnail(embedObject.Thumbnail);
    };
    if (embedObject.Footer != undefined) {
        embed.setFooter(embedObject.Footer);
    }
    if (embedObject.URL != undefined) {
        embed.setURL(embedObject.URL);
    }
    return embed;
}


start();
