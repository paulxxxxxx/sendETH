const { ethers } = require('ethers');
const fs = require('fs');

// 更新合约 ABI
const contractData = JSON.parse(fs.readFileSync('./contract.json', 'utf8'));
const abi = contractData.abi;

// 从文件读取地址并按4个一组进行分组，允许最后一组不足4个
function getAddressGroups() {
    const addresses = fs.readFileSync('./address.txt', 'utf8')
        .split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0);

    // 钱包地址分组
    const groups = [];
    for (let i = 0; i < addresses.length; i += 4) { // 每组4个地址，增加单组地址数量修改 +=4，数字为单组地址数量
        const group = addresses.slice(i, Math.min(i + 4, addresses.length));
        if (group.length > 0) {  // 只要有地址就添加为一组
            groups.push(group);
        }
    }
    
    // 输出每组地址的数量统计
    groups.forEach((group, index) => {
        console.log(`第 ${index + 1} 组地址数量: ${group.length}`);
    });
    
    return groups;
}

// 从文件读取私钥
function getPrivateKeys() {
    const keys = fs.readFileSync('./pk.txt', 'utf8')
        .split('\n')
        .map(key => key.trim())
        .filter(key => key.length > 0);
    
    console.log(`读取到 ${keys.length} 个私钥`);
    return keys;
}

async function distributeEth(privateKey, recipients, amountPerAddress) {
    try {
        // 读取合约地址
        const contractAddress = fs.readFileSync('./contract-address.txt', 'utf8').trim();
        
        // 连接到Sepolia网络
        const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/f4b6a411058a463082a46bbb9a5f3d9a');
        const wallet = new ethers.Wallet(privateKey, provider);
        
        // 连接到合约
        const contract = new ethers.Contract(contractAddress, abi, wallet);
        
        // 为每个接收地址准备相同金额
        const amount = ethers.parseEther(amountPerAddress.toString());
        const amounts = recipients.map(() => amount);
        
        // 计算总金额
        const totalAmount = amount * BigInt(recipients.length);
        
        console.log('\n开始处理钱包:', wallet.address);
        console.log('本组接收地址数量:', recipients.length);
        console.log('接收地址:', recipients);
        console.log('每个地址金额:', amountPerAddress, 'ETH');
        console.log('总金额:', ethers.formatEther(totalAmount), 'ETH');

        // 发送交易
        const tx = await contract.distributeEth(recipients, amounts, {
            value: totalAmount,
            gasLimit: 500000
        });
        
        console.log('交易已发送，Hash:', tx.hash);
        
        // 等待交易确认
        const receipt = await tx.wait();
        console.log('交易已确认，区块号:', receipt.blockNumber);
        
        return {
            success: true,
            hash: tx.hash,
            from: wallet.address,
            recipientCount: recipients.length
        };
        
    } catch (error) {
        console.error('分发失败:', error);
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
            const result = await distributeEth(
                privateKeys[i],
                addressGroups[i],
                amountPerAddress
            );

            if (result.success) {
                console.log(`钱包 ${result.from} 成功分发给 ${result.recipientCount} 个地址，交易哈希: ${result.hash}`);
            } else {
                console.log(`钱包 ${result.from} 分发失败: ${result.error}`);
            }

            // 添加随机延迟
            if (i < addressGroups.length - 1) {  // 最后���组不需要延迟
                const delay = Math.floor(Math.random() * 30000) + 1000; // 1-30秒随机延迟
                console.log(`等待 ${Math.floor(delay/1000)} 秒后处理下一组...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    } catch (error) {
        console.error('程序执行错误:', error);
    }
}

// 设置每个地址获得的ETH数量
const amountPerAddress = 0.2; // 每个地址获得0.01 ETH
console.log(`\n开始执行分发任务，每个地址将收到 ${amountPerAddress} ETH`);

processAllWallets(amountPerAddress)
    .then(() => console.log('\n所有分发任务完成'))
    .catch(error => console.error('\n程序执行出错:', error)); 