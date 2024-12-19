const { ethers, providers, utils } = require('ethers');
const fs = require('fs');

async function deployContract() {
    try {
        // 读取编译后的合约数据
        const contractData = JSON.parse(fs.readFileSync('./contract.json', 'utf8'));
        
        // 从文件读取部署用的私钥
        const deployerPrivateKey = fs.readFileSync('./deployer-pk.txt', 'utf8').trim();
        
        // 连接到Sepolia网络
        const provider = new providers.JsonRpcProvider('https://sepolia.infura.io/v3/f4b6a411058a463082a46bbb9a5f3d9a');
        const wallet = new ethers.Wallet(deployerPrivateKey, provider);
        
        console.log('部署钱包地址:', wallet.address);
        
        // 创建合约工厂
        const factory = new ethers.ContractFactory(
            contractData.abi,
            contractData.bytecode,
            wallet
        );
        
        // 部署合约
        console.log('开始部署合约...');
        const contract = await factory.deploy();
        await contract.deployed();
        
        console.log('合约已部署到地址:', contract.address);
        
        // 保存合约地址到文件
        fs.writeFileSync('./contract-address.txt', contract.address);
        console.log('合约地址已保存到 contract-address.txt');
        
    } catch (error) {
        console.error('部署失败:', error);
    }
}

deployContract()
    .then(() => console.log('部署完成'))
    .catch(console.error); 