module.exports = {
    vaults: [
        {
            name: 'S3D',
            tokens: [
                {
                    index: 0,
                    ticker: 'USDT',
                    unit: 'mwei',
                },
                {
                    index: 1,
                    ticker: 'BUSD',
                    unit: 'ether',
                },
                {
                    index: 2,
                    ticker: 'DAI',
                    unit: 'ether',
                },
            ],
            contractAddress: '0x6B41E5c07F2d382B921DE5C34ce8E2057d84C042'
        },
        {
            name: 'S3F',
            tokens: [
                {
                    index: 0,
                    ticker: 'FRAX',
                    unit: 'ether',
                },
                {
                    index: 1,
                    ticker: 'TUSD',
                    unit: 'ether',
                },
                {
                    index: 2,
                    ticker: 'USDT',
                    unit: 'mwei',
                },
            ],
            contractAddress: '0x05c5DB43dB72b6E73702EEB1e5b62A03a343732a'
        }
    ],
};