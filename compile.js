const fs = require('fs');
const solc = require('solc');

// 读取 Solidity 文件内容
const source = fs.readFileSync('Distributor.sol', 'utf8');

// 准备编译配置
const input = {
    language: 'Solidity',
    sources: {
        'Distributor.sol': {
            content: source
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*']
            }
        }
    }
};

// 编译合约
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contract = output.contracts['Distributor.sol']['Distributor'];

// 保存编译结果
fs.writeFileSync(
    'contract.json',
    JSON.stringify({
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    }, null, 2)
);

console.log('合约编译完成，结果已保存到 contract.json'); 