const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function promptUser() {
    console.log('\n=== ETH 工具选择 ===');
    console.log('1. 购买测试币');
    console.log('2. 批量分发');
    console.log('0. 退出程序');
    console.log('================\n');

    rl.question('请选择功能 (0-2): ', async (choice) => {
        switch (choice) {
            case '1':
                await handleBridge();
                break;
            case '2':
                await handleDistribution();
                break;
            case '0':
                console.log('程序已退出');
                process.exit(0);
                break;
            default:
                console.log('无效的选择，请重试');
                promptUser();
                break;
        }
    });
}

async function handleBridge() {
    rl.question('请输入购买测试币的ETH数量: ', (amount) => {
        if (isNaN(amount) || amount <= 0) {
            console.log('请输入有效的数字！');
            handleBridge();
            return;
        }

        process.env.BRIDGE_AMOUNT = amount;
        console.log(`\n开始购买 ${amount} ETH的测试币...`);
        
        const bridgeProcess = exec('node swapAndBridge.js');

        // 实时显示脚本输出
        bridgeProcess.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        bridgeProcess.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        bridgeProcess.on('close', (code) => {
            console.log('\n执行完成，按回车键继续...');
            rl.question('', () => {
                process.exit(0);
            });
        });
    });
}

async function handleDistribution() {
    rl.question('请输入每个地址分发的ETH数量: ', (amount) => {
        if (isNaN(amount) || amount <= 0) {
            console.log('请输入有效的数字！');
            handleDistribution();
            return;
        }

        rl.question('请输入每组地址的数量 (默认为4): ', (groupSize) => {
            groupSize = parseInt(groupSize) || 4;
            
            if (isNaN(groupSize) || groupSize <= 0) {
                console.log('使用默认组大小: 4');
                groupSize = 4;
            }

            process.env.DISTRIBUTION_AMOUNT = amount;
            process.env.GROUP_SIZE = groupSize;

            console.log(`\n开始分发，每个地址 ${amount} ETH，每组 ${groupSize} 个地址...`);
            
            const distributeProcess = exec('node distribute.js');

            // 实时显示脚本输出
            distributeProcess.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            distributeProcess.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            distributeProcess.on('close', (code) => {
                console.log('\n执行完成，按回车键继续...');
                rl.question('', () => {
                    process.exit(0);
                });
            });
        });
    });
}

console.log('欢迎使用 ETH 工具！');
promptUser();

// 处理程序退出
process.on('SIGINT', () => {
    console.log('\n程序已终止');
    process.exit(0);
}); 