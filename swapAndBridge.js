const { ethers } = require('ethers');
const fs = require('fs');

const ethAmount = 0.00005; // 跨链金额
const layerZeroFee = '0.000008879862610065'; // LayerZero 固定费用

async function swapAndBridge(privateKey, ethAmount) {
    let wallet;
    try {
        // 读取ABI
        const abi = JSON.parse(fs.readFileSync('./abi.json', 'utf8'));

        // 设置provider和wallet
        const provider = new ethers.JsonRpcProvider('https://arbitrum-mainnet.infura.io/v3/f4b6a411058a463082a46bbb9a5f3d9a');
        wallet = new ethers.Wallet(privateKey.trim(), provider);

        const contractAddress = '0xfca99f4b5186d4bfbdbd2c542dca2eca4906ba45';
        
        // 验证ABI
        if (!Array.isArray(abi)) {
            throw new Error('Invalid ABI format');
        }

        // 创建合约接口
        const contractInterface = new ethers.Interface(abi);
        
        // 创建合约实例
        const contract = new ethers.Contract(
            contractAddress,
            contractInterface,
            wallet
        );

        const address = wallet.address;
        console.log('正在处理钱包地址:', address);

        // 将ETH金额转换为Wei
        const amountInWei = ethers.parseEther(ethAmount.toString());
        const layerZeroFeeWei = ethers.parseEther(layerZeroFee);
        
        // 使用BigInt进行计算
        const totalAmount = amountInWei + layerZeroFeeWei;

        console.log('交易金额:', ethAmount, 'ETH');
        console.log('LayerZero 费用:', layerZeroFee, 'ETH');
        console.log('总金额:', ethers.formatEther(totalAmount), 'ETH');

        // 使用固定的gas价格 (0.01 Gwei)
        const gasPrice = ethers.parseUnits('0.011', 'gwei');
        const gasLimit = 5000000;

        // 发送交易
        const tx = await contract.swapAndBridge(
            amountInWei,
            '0x0',
            161n,
            wallet.address,
            wallet.address,
            '0x0000000000000000000000000000000000000000',
            '0x',
            {
                gasPrice: gasPrice,
                gasLimit: gasLimit,
                value: totalAmount
            }
        );     
        // 等待交易确认
        const receipt = await tx.wait();
        
        return {
            success: true,
            hash: tx.hash,
            blockNumber: receipt.blockNumber,
            address: address
        };
    } catch (error) {
        console.error('钱包地址处理失败:', wallet?.address);
        return {
            success: false,
            error: error.message,
            details: error,
            address: wallet?.address
        };
    }
}

async function processAllWallets(ethAmount) {
    try {
        // 读取所有私钥
        const privateKeys = fs.readFileSync('./pk.txt', 'utf8')
            .split('\n')
            .map(key => key.trim())
            .filter(key => key.length > 0); // 过滤空行

        console.log(`找到 ${privateKeys.length} 个钱包待处理`);

        // 依次处理每个钱包
        for (const privateKey of privateKeys) {
            try {
                const result = await swapAndBridge(privateKey, ethAmount);
                if (result.success) {
                    console.log(`钱包 ${result.address} 交易成功，交易哈希: ${result.hash}`);
                } else {
                    console.log(`钱包 ${result.address} 交易失败: ${result.error}`);
                }
                // 添加随机延迟
                const delay = Math.floor(Math.random() * 30000) + 1000; // 1-30秒随机延迟
                console.log(`等待 ${delay} 毫秒后继续...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                console.error('处理钱包时发生错误:', error);
            }
        }
    } catch (error) {
        console.error('读取私钥文件失败:', error);
    }
}

async function main() {
    try {        
        // 使用获取到的费用执行跨链操作
        await processAllWallets(ethAmount);
        
        console.log('所有钱包处理完成');
    } catch (error) {
        console.error('程序运行出错:', error);
    }
}

main().catch(console.error);
