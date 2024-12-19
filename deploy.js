const { ethers } = require('ethers');
const fs = require('fs');

async function deployContract() {
    try {
        // 读取编译后的合约数据
        const contractData = JSON.parse(fs.readFileSync('./contract.json', 'utf8'));
        
        // 从文件读取部署用的私钥
        const deployerPrivateKey = fs.readFileSync('./deployer-pk.txt', 'utf8').trim();
        
        // 连接到Sepolia网络
        const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/f4b6a411058a463082a46bbb9a5f3d9a');
        const wallet = new ethers.Wallet(deployerPrivateKey, provider);
        
        console.log('使用钱包地址:', wallet.address);
        
        // 创建合约工厂
        const factory = new ethers.ContractFactory(
            contractData.abi,
            contractData.bytecode,
            wallet
        );
        
        console.log('开始部署合约...');
        
        // 部署合约
        const contract = await factory.deploy();
        await contract.waitForDeployment();
        
        const contractAddress = await contract.getAddress();
        console.log('合约已部署到地址:', contractAddress);
        
        // 将合约地址保存到文件
        fs.writeFileSync('./contract-address.txt', contractAddress);
        console.log('合约地址已保存到 contract-address.txt');
        
    } catch (error) {
        console.error('部署失败:', error);
    }
}

deployContract()
    .then(() => console.log('部署完成'))
    .catch(console.error); 