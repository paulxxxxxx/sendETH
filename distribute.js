const { ethers } = require('ethers');
const fs = require('fs');

// 读取合约数据
const contractData = JSON.parse(fs.readFileSync('./contract.json', 'utf8'));
const abi = contractData.abi;
const bytecode = contractData.bytecode;

// 参数
const amountPerAddress = process.env.DISTRIBUTION_AMOUNT || 0.2; // 每个地址获得的ETH数量
const addressGroupSize = parseInt(process.env.GROUP_SIZE) || 4; // 每个地址组的数量

function getAddressGroups() {
    const addresses = fs.readFileSync('./address.txt', 'utf8')
        .split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0);

    // 钱包地址分组
    const groups = [];
    for (let i = 0; i < addresses.length; i += addressGroupSize) {
        const group = addresses.slice(i, Math.min(i + addressGroupSize, addresses.length));
        if (group.length > 0) {
            groups.push(group);
        }
    }
    
    groups.forEach((group, index) => {
        console.log(`第 ${index + 1} 组地址数量: ${group.length}`);
    });
    
    return groups;
}

function getPrivateKeys() {
    const keys = fs.readFileSync('./pk.txt', 'utf8')
        .split('\n')
        .map(key => key.trim())
        .filter(key => key.length > 0);
    
    console.log(`读取到 ${keys.length} 个私钥`);
    return keys;
}

async function deployAndDistribute(privateKey, recipients, amountPerAddress) {
    let wallet;
    try {
        // 连接到Sepolia网络
        const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/f4b6a411058a463082a46bbb9a5f3d9a');
        wallet = new ethers.Wallet(privateKey, provider);
        
        // 获取钱包余额
        const balance = await provider.getBalance(wallet.address);
        
        console.log('\n开始处理钱包:', wallet.address);
        console.log('钱包余额:', ethers.formatEther(balance), 'ETH');
        console.log('本组接收地址数量:', recipients.length);
        console.log('接收地址:', recipients);
        
        // 为每个接收地址准备相同金额
        const amount = ethers.parseEther(amountPerAddress.toString());
        const amounts = recipients.map(() => amount);
        
        // 计算总金额
        const totalAmount = amount * BigInt(recipients.length);
        
        console.log('每个地址金额:', amountPerAddress, 'ETH');
        console.log('总金额:', ethers.formatEther(totalAmount), 'ETH');

        // 检查余额是否足够
        if (balance < totalAmount) {
            console.log('余额不足，跳过此钱包');
            return {
                success: false,
                error: '余额不足',
                from: wallet.address,
                recipientCount: recipients.length
            };
        }

        // 部署合约
        console.log('开始部署合约...');
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const contract = await factory.deploy();
        await contract.waitForDeployment();
        
        const contractAddress = await contract.getAddress();
        console.log('合约已部署到地址:', contractAddress);

        // 发送分发交易
        const tx = await contract.distributeEth(recipients, amounts, {
            value: totalAmount,
            gasLimit: 500000n
        });
        
        console.log('交易已发送，Hash:', tx.hash);
        
        // 等待交易确认
        const receipt = await tx.wait();
        console.log('交易已确认，区块号:', receipt.blockNumber);
        
        return {
            success: true,
            hash: tx.hash,
            contractAddress,
            from: wallet.address,
            recipientCount: recipients.length
        };
        
    } catch (error) {
        console.error('操作失败:', error);
        return {
            success: false,
            error: error.message,
            from: wallet?.address,
            recipientCount: recipients.length
        };
    }
}

async function processAllWallets(amountPerAddress) {
    try {
        const privateKeys = getPrivateKeys();
        const addressGroups = getAddressGroups();

        console.log(`\n准备处理 ${addressGroups.length} 组地址`);
        
        if (privateKeys.length < addressGroups.length) {
            throw new Error(`私钥数量(${privateKeys.length})小于地址组数量(${addressGroups.length})！`);
        }

        for (let i = 0; i < addressGroups.length; i++) {
            const result = await deployAndDistribute(
                privateKeys[i],
                addressGroups[i],
                amountPerAddress
            );

            if (result.success) {
                console.log(`钱包 ${result.from} 成功部署合约 ${result.contractAddress} 并分发给 ${result.recipientCount} 个地址，交易哈希: ${result.hash}`);
            } else {
                console.log(`钱包 ${result.from} 操作失败: ${result.error}`);
            }

            // 添加随机延迟
            if (i < addressGroups.length - 1) {
                const delay = Math.floor(Math.random() * 30000) + 1000; // 1-30秒随机延迟
                console.log(`等待 ${Math.floor(delay/1000)} 秒后处理下一组...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    } catch (error) {
        console.error('程序执行错误:', error);
    }
}

console.log(`\n开始执行分发任务，每个地址将收到 ${amountPerAddress} ETH`);

processAllWallets(amountPerAddress)
    .then(() => console.log('\n所有分发任务完成'))
    .catch(error => console.error('\n程序执行出错:', error)); 