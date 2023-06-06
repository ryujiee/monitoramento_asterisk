const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const bodyParser = require("body-parser");

const {
    getLogs,
    getTotalTroncos,
    getTotalRamais,
    getQuantidadeLigacoes,
    checkAsteriskStatus,
    getAsteriskUptime,
    getOfflineAndOnlinePeers,
    getChamadasEmAndamento,
    getSIPPeersInUse,
    getPeerOwner,
    //lastCalls
} = require('./service');

// Configuração do Express
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

    app.get('/', async (req, res) => {
        let ramaisOnline = null;
        let ramaisOffline = null;
        let totalTroncos = null;
        let mensagemChamadasEmAndamentoEntrada = null;
        let totalRamaisData = null;
        let quantidadeLigacoes = null;
        let asteriskStatus = null;
        let asteriskUptime = null;
        let ramaisData = null;
        let totalOffline = null;
        let totalOnline = null;
        let totalRamais = null;
        let mensagemChamadasEmAndamento = null;
        let peersInUse = null;
        let logs = null;
       // let lastCalls = null;

        try {
            totalRamaisData = await getTotalRamais();
            quantidadeLigacoes = await getQuantidadeLigacoes();
            asteriskStatus = await checkAsteriskStatus();
            asteriskUptime = await getAsteriskUptime();
            ramaisData = await getOfflineAndOnlinePeers();
            ramaisOffline = ramaisData.offline;
            ramaisOnline = ramaisData.online;
            totalRamais = totalRamaisData.totalRamais;
            totalOnline = ramaisOnline.length;
            totalOffline = ramaisOffline.length;
            chamadasEmAndamento = await getChamadasEmAndamento();
            mensagemChamadasEmAndamento = chamadasEmAndamento.mensagens;
            mensagemChamadasEmAndamentoEntrada = chamadasEmAndamento.mensagens_entrada;
            peersInUse = await getSIPPeersInUse();
            totalTroncos = await getTotalTroncos();
            logs = getLogs();
            //lastCalls = lastCalls()

            // Adicionar o detentor do ramal para cada peer em uso
            for (const peer of peersInUse) {
                if (peer.inUse !== '0/0/0') {
                    const owner = await getPeerOwner(peer.peerName);
                    const ownerWithoutTags = owner.replace(/<[^>]+>/g, '');
                    peer.owner = ownerWithoutTags;
                }
            }
        } catch (error) {
            console.log('Erro ao enviar o comando:', error);
        }

        res.render('dashboard', {
            ramaisOnline,
            ramaisOffline,
            totalTroncos,
            mensagemChamadasEmAndamentoEntrada,
            totalRamaisData,
            quantidadeLigacoes,
            asteriskStatus,
            asteriskUptime,
            ramaisData,
            totalOffline,
            totalOnline,
            totalRamais,
            mensagemChamadasEmAndamento,
            peersInUse,
            logs,
          //  lastCalls
        });
    });

    const updateData = async () => {
        try {
            const totalRamaisData = await getTotalRamais();
            const quantidadeLigacoes = await getQuantidadeLigacoes();
            const asteriskStatus = await checkAsteriskStatus();
            const asteriskUptime = await getAsteriskUptime();
            const ramaisData = await getOfflineAndOnlinePeers();
            const ramaisOffline = ramaisData.offline;
            const ramaisOnline = ramaisData.online;
            const totalRamais = totalRamaisData.totalRamais; // Atualizado para utilizar diretamente o valor retornado
            const totalOnline = ramaisOnline.length; // Quantidade de ramais online
            const totalOffline = ramaisOffline.length; // Quantidade de ramais offline
            const chamadasEmAndamento = await getChamadasEmAndamento();
            const mensagemChamadasEmAndamento = chamadasEmAndamento.mensagens;
            const mensagemChamadasEmAndamentoEntrada = chamadasEmAndamento.mensagens_entrada;
            const peersInUse = await getSIPPeersInUse();
            const totalTroncos = await getTotalTroncos();
            logs = getLogs();
          //  lastCalls = lastCalls()



            // Adicionar o detentor do ramal para cada peer em uso
            for (const peer of peersInUse) {
                if (peer.inUse !== '0/0/0') {
                    const owner = await getPeerOwner(peer.peerName);

                    // Remover caracteres entre "<>"
                    const ownerWithoutTags = owner.replace(/<[^>]+>/g, '');
                    peer.owner = ownerWithoutTags;
                }
            }

            // Emitir os dados atualizados para os clientes conectados
            io.emit('dataUpdated', {
                totalRamaisData,
                quantidadeLigacoes,
                asteriskStatus,
                asteriskUptime,
                ramaisData,
                ramaisOffline,
                totalOffline,
                totalOnline,
                totalRamais,
                peersInUse,
                totalTroncos,
                logs,
              //  lastCalls
            });
            // Emitir os dados atualizados dos ramais online para os clientes conectados
            io.emit('ramaisOnlineUpdated', {
                ramaisOnline: ramaisOnline
            });
            // Emitir os dados atualizados dos ramais offline para os clientes conectados
            io.emit('ramaisOfflineUpdated', {
                ramaisOffline: ramaisOffline
            });
            // Emitir os dados atualizados das ligações para os clientes conectados
            io.emit('chamadasAndamentoUpdated', {
                mensagemChamadasEmAndamento: mensagemChamadasEmAndamento
            });
            // Emitir os dados atualizados das ligações de entrada para os clientes conectados
            io.emit('chamadasAndamentoEntradaUpdated', {
                mensagemChamadasEmAndamentoEntrada: mensagemChamadasEmAndamentoEntrada
            });
            // Emitir os dados atualizados das ligações de entrada para os clientes conectados
            io.emit('totalTroncosUpdated', {
                totalTroncos: totalTroncos
            });
            // Emitir os dados atualizados dos ramais em ligação ou livre
            io.emit('peersInUse', {
              peersInUse: peersInUse
            });
            // Emitir os dados atualizados dos logs
            io.emit('logsUpdated', {
              logs: logs
            });
        } catch (error) {
            console.log('Erro ao enviar o comando:', error);
        }
    }
    let interval;

    app.post("/updateInterval", (req, res) => {
        const selectedValue = req.body.interval;
        updateInterval(selectedValue);
        console.log(selectedValue);
        res.sendStatus(200);
    });

    function updateInterval(selectedValue) {
        clearInterval(interval);
        const intervalMilliseconds = selectedValue * 1000;
        interval = setInterval(updateData, intervalMilliseconds);
    }

    // Atualizar os dados a cada 5 segundos inicialmente
    updateInterval(5);

// Iniciar o servidor
const port = 7000;
server.listen(port, () => {
    console.log(`Servidor rodando em http://181.215.215.190:${port}`);
});