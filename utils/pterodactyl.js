const axios = require('axios');
require('dotenv').config();

const api = axios.create({
    baseURL: `${process.env.PTERODACTYL_URL}/api/application`,
    headers: {
        'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

async function getNests() {
    const response = await api.get('/nests');
    return response.data.data;
}

async function getEggs(nestId) {
    const response = await api.get(`/nests/${nestId}/eggs`);
    return response.data.data;
}

async function findNodeJsEgg() {
    const nests = await getNests();
    
    for (const nest of nests) {
        if (nest.attributes.name.toLowerCase().includes('other') || nest.attributes.name.toLowerCase().includes('generic')) {
            const eggs = await getEggs(nest.attributes.id);
            const nodeEgg = eggs.find(egg => 
                egg.attributes.name.toLowerCase().includes('node') || 
                egg.attributes.name.toLowerCase().includes('nodejs')
            );
            if (nodeEgg) {
                return {
                    nestId: nest.attributes.id,
                    eggId: nodeEgg.attributes.id,
                    egg: nodeEgg.attributes
                };
            }
        }
    }
    
    const nests2 = await getNests();
    for (const nest of nests2) {
        const eggs = await getEggs(nest.attributes.id);
        const nodeEgg = eggs.find(egg => 
            egg.attributes.name.toLowerCase().includes('node') || 
            egg.attributes.name.toLowerCase().includes('nodejs')
        );
        if (nodeEgg) {
            return {
                nestId: nest.attributes.id,
                eggId: nodeEgg.attributes.id,
                egg: nodeEgg.attributes
            };
        }
    }
    
    throw new Error('Could not find Node.js egg');
}

async function getNodes() {
    const response = await api.get('/nodes');
    return response.data.data;
}

async function getLocations() {
    const response = await api.get('/locations');
    return response.data.data;
}

async function createServer(botToken, clientId, serverId, botName, serverName) {
    try {
        const eggInfo = await findNodeJsEgg();
        const nodes = await getNodes();
        
        if (nodes.length === 0) {
            throw new Error('No nodes available');
        }
        
        const node = nodes[0];
        const locations = await getLocations();
        const location = locations[0];

        const userId = await findUserByEmail('Buyers@stacyapp.com');
        if (!userId) {
            throw new Error('Owner user not found');
        }

        const pterodactylServerName = `${botName} | ${serverName}`;
        
        const allocations = await getNodeAllocations(node.attributes.id);
        if (allocations.length === 0) {
            throw new Error('No allocations available on the node');
        }
        
        const serverData = {
            name: pterodactylServerName,
            user: userId,
            egg: eggInfo.eggId,
            docker_image: 'ghcr.io/parkervcp/yolks:nodejs_21',
            startup: 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/node /home/container/{{JS_FILE}}',
            environment: {
                MAIN_FILE: 'Buyer.js',
                USER_UPLOAD: '0',
                JS_FILE: 'Buyer.js',
                AUTO_UPDATE: '1',
                NODE_PACKAGES: '',
                UNNODE_PACKAGES: '',
                GIT_ADDRESS: 'https://github.com/ashes2007/Stacy-Bot.git',
                BRANCH: 'Buyers',
                USERNAME: 'ashes2007',
                ACCESS_TOKEN: process.env.GITHUB_TOKEN || ''
            },
            limits: {
                memory: 512,
                swap: 0,
                disk: 1024,
                io: 500,
                cpu: 100
            },
            feature_limits: {
                databases: 0,
                backups: 0,
                allocations: 1
            },
            allocation: {
                default: allocations[0].attributes.id
            },
            start_on_completion: false
        };

        console.log('Creating server with data:', JSON.stringify(serverData, null, 2));
        const response = await api.post('/servers', serverData);
        const pterodactylServerId = response.data.attributes.id;
        const serverUuid = response.data.attributes.uuid;
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await updateEnvFile(serverUuid, botToken);
        
        return {
            pterodactylId: pterodactylServerId,
            uuid: serverUuid,
            name: pterodactylServerName
        };
    } catch (error) {
        if (error.response) {
            console.error('Pterodactyl API Error:', JSON.stringify(error.response.data, null, 2));
            throw new Error(`Pterodactyl API Error: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

async function updateEnvFile(serverUuid, botToken) {
    const clientApi = axios.create({
        baseURL: `${process.env.PTERODACTYL_URL}/api/client`,
        headers: {
            'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    try {
        const fileContent = `DISCORD_TOKEN=${botToken}\n`;
        
        await clientApi.post(`/servers/${serverUuid}/files/write?file=%2F.env`, fileContent, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });
    } catch (error) {
        console.error('Error updating .env file:', error.response?.data || error.message);
        throw new Error('Failed to update .env file');
    }
}

async function startServer(serverUuid) {
    const clientApi = axios.create({
        baseURL: `${process.env.PTERODACTYL_URL}/api/client`,
        headers: {
            'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    await clientApi.post(`/servers/${serverUuid}/power`, { signal: 'start' });
}

async function suspendServer(pterodactylId) {
    await api.post(`/servers/${pterodactylId}/suspend`);
}

async function deleteServer(pterodactylId) {
    await api.delete(`/servers/${pterodactylId}/force`);
}

async function getServers() {
    const response = await api.get('/servers');
    return response.data.data;
}

async function unsuspendServer(pterodactylId) {
    await api.post(`/servers/${pterodactylId}/unsuspend`);
}

async function getUsers() {
    const response = await api.get('/users');
    return response.data.data;
}

async function findUserByEmail(email) {
    const users = await getUsers();
    const user = users.find(u => u.attributes.email === email);
    return user ? user.attributes.id : null;
}

async function getNodeAllocations(nodeId) {
    const response = await api.get(`/nodes/${nodeId}/allocations`);
    return response.data.data.filter(alloc => !alloc.attributes.assigned);
}

module.exports = {
    createServer,
    suspendServer,
    unsuspendServer,
    deleteServer,
    getServers,
    startServer
};