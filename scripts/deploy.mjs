import { spawn } from 'child_process';
import path from 'path';

const API_TOKEN = 'rYrxlHBykZpSiWl5c5xMcgrL21Msl136LfRldiKp329f8de8';
const DOMAIN = 'aicontentstudio.net';
const ZIP_PATH = path.resolve('deploy.zip');

async function callTool() {
    const child = spawn('npx', ['-y', 'hostinger-api-mcp@latest', '--stdio'], {
        env: { ...process.env, API_TOKEN }
    });

    let id = 1;
    const request = {
        jsonrpc: '2.0',
        id: id++,
        method: 'tools/call',
        params: {
            name: 'hosting_deployStaticWebsite',
            arguments: {
                domain: DOMAIN,
                archivePath: ZIP_PATH
            }
        }
    };

    return new Promise((resolve, reject) => {
        let output = '';
        child.stdout.on('data', (data) => {
            output += data.toString();
            try {
                const response = JSON.parse(output);
                if (response.id === request.id) {
                    resolve(response);
                    child.kill();
                }
            } catch (e) {
                // Wait for more data
            }
        });

        child.stderr.on('data', (data) => {
            console.error('STDERR:', data.toString());
        });

        child.on('error', reject);
        child.on('exit', (code) => {
            if (code !== 0 && !output) reject(new Error('Process exited with code ' + code));
        });

        child.stdin.write(JSON.stringify(request) + '\n');
    });
}

callTool().then(console.log).catch(console.error);
