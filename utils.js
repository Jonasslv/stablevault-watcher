const tokens = {
    0: 'USDT',
    1: 'BUSD',
    2: 'DAI',
}

const operationTypes = {
    swap: 'Swap',
    add: 'Add',
    remove: 'Remove',
};

const getTokenUnitById = (id) => {
    return {
        0: 'mwei', // USDT
        1: 'ether', // BUSD
        2: 'ether', // DAI
    }[id];
}

const getTokenById = (id) => {
    return tokens[id];
}

const normalizeFloat = (numberStr, decimals) => {
    const indexOfDot = numberStr.indexOf('.');
    let normalized = numberStr;

    if (indexOfDot !== -1) {
        normalized = `${numberStr.substring(0, indexOfDot)}.${numberStr.substr(indexOfDot + 1, decimals)}`;
    }

    return normalized;
}

module.exports = {
    tokens,
    operationTypes,
    getTokenUnitById,
    getTokenById,
    normalizeFloat,
};
