const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const AMI = require('asterisk-manager');

const amiConfig = {
  host: 'localhost',
  port: 5038,
  username: 'test',
  password: 'test'
};

// Criar a instância do AMI fora das funções
const ami = new AMI(amiConfig.port, amiConfig.host, amiConfig.username, amiConfig.password, false);

// Obter o total de ramais
const getTotalRamais = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const { stdout } = await exec('ls /etc/asterisk/sip/peers/');
        const files = stdout.split('\n').filter((file) => file !== '' && file !== 'opasuite.conf');
        const totalRamais = files.length;
  
        const ramaisOnline = [];
        const ramaisOffline = [];


  
        for (const file of files) {
          const ramal = file.replace('.conf', '');
  
          ami.action({
            action: 'command',
            command: `sip show peer ${ramal}`
            }, function (err, res) {
            if (err) {
              reject(err);
              return;
            }
            const outputLines = res.output;
            let status = '';

            for (const line of outputLines) {
              if (line.includes('Status       :')) {
                status = line.trim().split(':')[1].trim();
                break;
              }
            }        
            if (status.includes('OK')) {
              ramaisOnline.push(ramal);
            } else {
              if (ramal !== 'opasuite') {
                ramaisOffline.push(ramal);
              }
              }
  
          resolve({
            totalRamais,
            ramaisOnline,
            ramaisOffline
          });
        });
    }} catch (err) {
        console.log('Erro ao obter os ramais:', err);
        reject(err);
      }
    });
  };
  

// Função para obter a quantidade de ligações simultâneas
const getQuantidadeLigacoes = async () => {
    return new Promise((resolve, reject) => {

        ami.action({
            action: 'command',
            command: `core show channels concise`
            }, function (err, res) {
            if (err) {
              reject(err);
              return;
            }
            const outputLines = res.output;

            const lines = outputLines.length
            const quantidadeLigacoes = Math.ceil(lines / 2);
            resolve(quantidadeLigacoes);
    });
})
};

// Verificar o status do serviço Asterisk
const checkAsteriskStatus = async () => {
    return new Promise((resolve, reject) => {
        exec('service asterisk status', (error, stdout, stderr) => {
            if (error) {
                console.error('Erro ao verificar o status do Asterisk:', error);
                reject(error);
                return;
            }

            if (stdout.includes('Active: active')) {
                resolve('OK');
            } else if (stdout.includes('Active: inactive')) {
                resolve('OFF');
            } else {
                console.error('Resposta inválida:', stdout);
                reject(new Error('Resposta inválida'));
            }
        });
    });
};


// Obter o tempo de execução do Asterisk
const getAsteriskUptime = async () => {
    return new Promise((resolve, reject) => {
        ami.action({
            action: 'command',
            command: `core show uptime`
            }, function (err, res) {
            if (err) {
              reject(err);
              return;
            }
            const outputLines = res.output[0];
            const uptimeRegex = /System uptime:\s*(.*)/;
            const matches = outputLines.match(uptimeRegex);

            if (matches && matches.length > 1) {
                const uptimeFormatted = matches[1].trim();
                resolve(uptimeFormatted);
            } else {
                console.error('Resposta inválida:', err);
                reject(new Error('Resposta inválida'));
            }
    });
})
};

// Obter a lista de ramais registrados e identificar os ramais online
const getOfflineAndOnlinePeers = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const peersDirectory = '/etc/asterisk/sip/peers/';
        const files = await fs.promises.readdir(peersDirectory);
  
        const offline = [];
        const online = [];
  
        const promises = files.map(async (file) => {
          const ramal = file.replace('.conf', '');
  
          return new Promise((resolve, reject) => {
            ami.action(
              {
                action: 'command',
                command: `sip show peer ${ramal}`,
              },
              function (err, res) {
                if (err) {
                  reject(err);
                  return;
                }
  
                const outputLines = res.output;
                let status = '';
  
                for (const line of outputLines) {
                  if (line.includes('Status       :')) {
                    status = line.trim().split(':')[1].trim();
                    break;
                  }
                }
  
                if (status.includes('OK')) {
                  const msMatch = status.match(/OK\s+\((\d+)\s+ms\)/);
                  const ms = msMatch ? parseInt(msMatch[1]) : null;
  
                  const calleridMatch = outputLines[28].match(/Callerid\s+:\s+"([^"]+)"/);
                  const callerid = calleridMatch ? calleridMatch[1] : '';
  
                  online.push(`${ramal} - ${callerid} - (${ms} ms)`);
                } else {
                  if (ramal !== 'opasuite') {
                    offline.push(ramal);
                  }
                }
  
                resolve();
              }
            );
          });
        });
  
        await Promise.all(promises);
  
        resolve({
          offline,
          online,
        });
      } catch (err) {
        console.log('Erro ao obter os ramais:', err);
        reject(err);
      }
    });
  };

// Função para obter as chamadas em andamento
const getChamadasEmAndamento = async () => {
    return new Promise((resolve, reject) => {
      try {
        ami.action(
          {
            action: 'command',
            command: `core show channels concise`,
          },
          function (err, res) {
            if (err) {
              reject(err);
              return;
            }
            const linhas = res.output;
  
            if (!Array.isArray(linhas)) {
              resolve({
                chamadas: [],
                mensagens: [],
                mensagens_entrada: [],
              });
              return;
            }
  
            const chamadas = [];
            const mensagens = [];
            const mensagens_entrada = [];
  
            linhas.forEach((linha) => {
              const campos = linha.split('!');
  
              const chamada = {
                canal: campos[0],
                tipo: campos[1],
                identificadorChamada: campos[2],
                estado: campos[3],
                status: campos[4],
                acao: campos[5],
                detalhes: campos[6],
                chamador: campos[7],
                chamado: campos[8],
                campo1: campos[9],
                campo2: campos[10],
                campo3: campos[11],
                campo4: campos[12],
                campo5: campos[13],
              };
  
              if (chamada.tipo === 'outbound' && chamada.acao === 'Dial') {
                const identificadorChamadaArray = chamada.identificadorChamada.split('/');
                const tronco = identificadorChamadaArray[0];
                const chamado = identificadorChamadaArray[1];
                const ramal = chamada.chamador;
  
                const mensagem = `O ramal ${ramal} está ligando para ${chamado} através do tronco ${tronco}.`;
                mensagens.push(mensagem);
              } if ( chamada.tipo == 'departamento' || chamada.tipo == 'transbordo') {
                const regex = /^SIP\/(\d+)-/;
                const match = chamada.canal.match(regex);
                const tronco = match[1];
                const mensagem_entrada = `Ligação de entrada ativa através do tronco ${tronco}.`;
                mensagens_entrada.push(mensagem_entrada);
              }
  
              chamadas.push(chamada);
            });  
            resolve({
              chamadas,
              mensagens,
              mensagens_entrada,
            });
          }
        );
      } catch (err) {
        console.log('Erro ao obter as chamadas em andamento:', err);
        reject(err);
      }
    });
  };
  

 const getSIPPeersInUse = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      ami.action(
        {
          action: 'command',
          command: `sip show inuse`,
        },
        function (err, res) {
          if (err) {
            reject(err);
            return;
          }
          
          const linhas = res.output;
          const peers = [];
    
          for (const linha of linhas) {
            const campos = linha.trim().split(/\s+/);
            const peer = {
              peerName: campos[0],
              inUse: campos[1],
              limit: campos[2],
              status: '',
              owner: '',
            };
            const ramal = parseInt(peer.peerName);
            if (ramal >= 1000 && ramal <= 6999) {
              ami.action(
                {
                  action: 'command',
                  command: `sip show peer ${ramal}`,
                },
                function (err, res) {
                  if (err) {
                    reject(err);
                    return;
                  }                  
                  const peerInfo = res.output.join('\n'); // Transforma o array de strings em uma única string
    
                  if (typeof peerInfo.includes === 'function' && peerInfo.includes('Status') && peerInfo.includes('OK')) {
                    peer.status = 'Online';
    
                    const callerIdMatch = peerInfo.match(/Callerid\s+:\s+"(.*)"/);
                    if (callerIdMatch) {
                      peer.owner = callerIdMatch[1].trim();
                    }
                  } else {
                    peer.status = 'Offline';
                  }
    
                  peers.push({ ...peer, owner: peer.owner });
                }
              );
            }
          }
    
          resolve(peers);
        }
      );
    } catch (error) {
      console.error('Erro ao obter os peers SIP em uso:', error);
      reject(error);
    }
  });
};

// Função para obter o detentor do ramal
const getPeerOwner = async (peerName) => {
  return new Promise((resolve, reject) => {
    try {
      ami.action(
        {
          action: 'command',
          command: `sip show peer ${peerName}`,
        },
        function (err, res) {
          if (err) {
            reject(err);
            return;
          }

          const linhas = res.output

          // Obter a linha que contém o campo "Callerid"
          const callerIdLine = linhas.find((linha) => linha.includes('Callerid'));
          if (!callerIdLine) {
            console.error('Erro ao obter o detentor do ramal:', peerName);
            resolve(null);
            return;
          }

          // Extrair o nome do detentor do ramal
          const owner = callerIdLine.split(':')[1].trim();
          resolve(owner);
        }
      );
    } catch (error) {
      console.error('Erro ao obter os peers SIP em uso:', error);
      reject(error);
    }
  });
};

// Validar troncos online
const isTroncoOnline = async (usuario) => {
  return new Promise((resolve, reject) => {
    try {
      const offline = [];
      const online = [];
      ami.action(
        {
          action: 'command',
          command: `sip show peer ${usuario}`,
        },
        function (err, res) {
          if (err) {
            reject(err);
            return;
          }

          const linhas = res.output;
          if (linhas[66].includes('Status') && linhas[66].includes('OK')) {
            const msMatch = linhas[66].match(/Status\s+:\s+OK\s+\((\d+)\s+ms\)/);
            const ms = msMatch ? parseInt(msMatch[1]) : null;

            const troncoOnlineText = ms ? `${usuario} - (${ms} ms)` : usuario;
            online.push(troncoOnlineText);
          } else {
            if (usuario !== 'opasuite') {
              offline.push(usuario);
            }
          }

          resolve({
            offline,
            online,
          });
        }
      );
    } catch (error) {
      console.error('Erro ao obter os peers SIP em uso:', error);
      reject(error);
    }
  });
};

const getTotalTroncos = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const {
                stdout
            } = await exec('ls /etc/asterisk/sip/trunk/');
            const files = stdout.split('\n').filter((file) => file !== '' && file !== 'opasuite.conf');
            const totalTroncos = files.length;

            const troncosOnline = [];
            const troncosOffline = [];

            for (const file of files) {
                const {
                    stdout
                } = await exec(`grep -E 'username' /etc/asterisk/sip/trunk/${file}`);
                const matches = stdout.match(/username\s*=\s*(.*)/);
                const usuario = matches[1].trim();

                const {
                    offline,
                    online
                } = await isTroncoOnline(usuario);
                if (online.length > 0) {
                    troncosOnline.push(...online);
                } else {
                    troncosOffline.push(...offline);
                }
            }

            resolve({
                totalTroncos,
                troncosOnline,
                troncosOffline
            });
        } catch (err) {
            console.log('Erro ao obter os troncos:', err);
            reject(err);
        }
    });
};

const getLogs = () => {
    const logFilePath = '/var/log/asterisk/full';
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const logLines = logContent.split('\n').slice(-300);
    return logLines;
}

/*

const lastCalls = () => {
  const fs = require('fs');
  const readline = require('readline');

  // Arquivo de log
  const logFile = '/var/log/asterisk/full';

  // Palavra a ser procurada
  const wordToSearch = 'End MixMonitor Recording';

  // Data/hora atual
  const now = new Date();

  // Data/hora de 24 horas atrás
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Variável para armazenar a contagem de linhas
  let lineCount = 0;

  // Criando interface de leitura
  const rl = readline.createInterface({
    input: fs.createReadStream(logFile),
    crlfDelay: Infinity
  });

  // Evento disparado a cada linha lida
  rl.on('line', (line) => {
    // Verifica se a linha contém a palavra procurada
    if (line.includes(wordToSearch)) {
      lineCount++;
    }
  });
 

  // Evento disparado quando a leitura do arquivo é concluída
  rl.on('close', () => {
    console.log(`Número de linhas com a palavra "${wordToSearch}": ${lineCount}`);
  });

}
 */


module.exports = {
    getTotalRamais,
    getQuantidadeLigacoes,
    checkAsteriskStatus,
    getAsteriskUptime,
    getOfflineAndOnlinePeers,
    getChamadasEmAndamento,
    getSIPPeersInUse,
    getPeerOwner,
    getTotalTroncos,
    getLogs,
    //lastCalls
};