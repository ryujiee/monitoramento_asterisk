const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const AMI = require('asterisk-manager');
const mongoose = require('mongoose');
<<<<<<< HEAD
const axios = require('axios'); // Importar o módulo axios


const repoOwner = 'ryujiee';
const repoName = 'monitoramento_asterisk';
const appVersion = 'v0.0.0-alpha'; // Versão da sua aplicação
=======
>>>>>>> 430d7b4b885b69c312ea1155d9b9776e902ecc9b


const amiConfig = {
  host: 'localhost',
  port: 5038,
  username: 'ixcsoft',
  password: 'opasuite'
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
  

// Função para obter a quantidade de chamadas ativas
const getQuantidadeChamadasAtivas = async () => {
  return new Promise((resolve, reject) => {
    ami.action({
      action: 'command',
      command: 'core show channels'
    }, function (err, res) {
      if (err) {
        reject(err);
        return;
      }

      const outputLines = res.output;

      let activeCalls = 0;

      for (let i = 0; i < outputLines.length; i++) {
        if (outputLines[i].includes(' active call')) {
          const match = outputLines[i].match(/(\d+) active call/);
          if (match) {
            activeCalls = parseInt(match[1]);
            break; // We found the count, so exit the loop
          }
        } else if (outputLines[i].includes(' active calls')) {
          const match = outputLines[i].match(/(\d+) active calls/);
          if (match) {
            activeCalls = parseInt(match[1]);
            break; // We found the count, so exit the loop
          }
        }
      }
      resolve(activeCalls);
    });
  });
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
                
                  const content = `
                    <div class="info-block-onlineRamais">
                      <div class="ramal">${ramal} <span class="ms">(${ms} ms)</span></div>
                      <div class="callerid">${callerid}</div>
                    </div>
                  `;
                  
                  const ramalData = {
                    ramal: ramal,
                    ms: ms,
                    callerid: callerid
                  };
                
                  online.push(ramalData);
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
          const outputLines = res.output;

          // Ensure outputLines is an array
          const linhas = Array.isArray(outputLines) ? outputLines : [outputLines];

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

              const mensagem = `O ramal <span class="ramal-chamador">${ramal}</span> está ligando para <span class="ramal-chamado">${chamado}</span> através do tronco <span class="ramal-tronco">${tronco}</span>.`;
              mensagens.push(mensagem);
            } else if (chamada.tipo === 'departamento' || chamada.tipo === 'transbordo' || chamada.tipo === 'macro-agi') {
              const regex = /^SIP\/(\d+)-/;
              const match = chamada.canal.match(regex);
              const tronco = match[1];
              const chamador = chamada.chamador
              const mensagem_entrada = `<span class="ligacao-chamador">${chamador}</span> está em uma ligação ativa através do tronco <span class="ligacao-tronco">${tronco}</span>.`;
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
              const content = fs.readFileSync(`/etc/asterisk/sip/trunk/${file}`, 'utf8');
              const matches = content.match(/\[(.*?)\]/); // Correspondência entre colchetes
              if (matches) {
                const usuario = matches[1].trim();

                const { offline, online } = await isTroncoOnline(usuario);
                if (online.length > 0) {
                  troncosOnline.push(...online);
                } else {
                  troncosOffline.push(...offline);
                }
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

const getAtendimentosRecebidosUltimas24Horas = async () => {
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000); // Obtém a data de um dia atrás

  try {
    const atendimentos = await mongoose.connection.db.collection('atendimentos').find({
      abertoPor: 'contato',
      inicio: { $gte: umDiaAtras },
      canal: 'pabx'
    }).toArray();

    const quantidadeAtendimentos = atendimentos.length
    return quantidadeAtendimentos;
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    return [];
  }
};

const getAtendimentosFinalizadoUltimas24Horas = async () => {
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000); // Obtém a data de um dia atrás

  try {
    const atendimentos = await mongoose.connection.db.collection('atendimentos').find({
      status: 'F',
      inicio: { $gte: umDiaAtras },
      canal: 'pabx'
    }).toArray();

    const quantidadeAtendimentos = atendimentos.length
    return quantidadeAtendimentos;
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    return [];
  }
};

const getAtendimentosAbertosUltimas24Horas = async () => {
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000); // Obtém a data de um dia atrás

  try {
    const atendimentos = await mongoose.connection.db.collection('atendimentos').find({
      abertoPor: 'atendente',
      inicio: { $gte: umDiaAtras },
      canal: 'pabx'
    }).toArray();

    const quantidadeAtendimentos = atendimentos.length
    return quantidadeAtendimentos;
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    return [];
  }
};

const getAtendimentosAguardandoUltimas24Horas = async () => {
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000); // Obtém a data de um dia atrás

  try {
    const atendimentos = await mongoose.connection.db.collection('atendimentos').find({
      status: 'AG',
      inicio: { $gte: umDiaAtras },
      canal: 'pabx'
    }).toArray();

    const quantidadeAtendimentos = atendimentos.length
    return quantidadeAtendimentos;
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    return [];
  }
};

async function getLatestGitHubVersion() {
  try {
    const response = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}/tags`);
    const data = response.data;
    if (data.length > 0) {
      return data[0].name;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter informações do GitHub:', error);
    return null;
  }
}

async function checkForUpdates() {
  const latestGitHubVersion = await getLatestGitHubVersion();
  console.log(latestGitHubVersion);
  return latestGitHubVersion && latestGitHubVersion !== appVersion;
}


const getAtendimentosRecebidosUltimas24Horas = async () => {
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000); // Obtém a data de um dia atrás

  try {
    const atendimentos = await mongoose.connection.db.collection('atendimentos').find({
      abertoPor: 'contato',
      inicio: { $gte: umDiaAtras },
      canal: 'pabx'
    }).toArray();

    const quantidadeAtendimentos = atendimentos.length
    return quantidadeAtendimentos;
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    return [];
  }
};

const getAtendimentosFinalizadoUltimas24Horas = async () => {
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000); // Obtém a data de um dia atrás

  try {
    const atendimentos = await mongoose.connection.db.collection('atendimentos').find({
      status: 'F',
      inicio: { $gte: umDiaAtras },
      canal: 'pabx'
    }).toArray();

    const quantidadeAtendimentos = atendimentos.length
    return quantidadeAtendimentos;
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    return [];
  }
};

const getAtendimentosAbertosUltimas24Horas = async () => {
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000); // Obtém a data de um dia atrás

  try {
    const atendimentos = await mongoose.connection.db.collection('atendimentos').find({
      abertoPor: 'atendente',
      inicio: { $gte: umDiaAtras },
      canal: 'pabx'
    }).toArray();

    const quantidadeAtendimentos = atendimentos.length
    return quantidadeAtendimentos;
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    return [];
  }
};

const getAtendimentosAguardandoUltimas24Horas = async () => {
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000); // Obtém a data de um dia atrás

  try {
    const atendimentos = await mongoose.connection.db.collection('atendimentos').find({
      status: 'AG',
      inicio: { $gte: umDiaAtras },
      canal: 'pabx'
    }).toArray();

    const quantidadeAtendimentos = atendimentos.length
    return quantidadeAtendimentos;
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    return [];
  }
};



module.exports = {
    getTotalRamais,
    getQuantidadeChamadasAtivas,
    checkAsteriskStatus,
    getAsteriskUptime,
    getOfflineAndOnlinePeers,
    getChamadasEmAndamento,
    getSIPPeersInUse,
    getPeerOwner,
    getTotalTroncos,
<<<<<<< HEAD
    getAtendimentosRecebidosUltimas24Horas,
    getAtendimentosFinalizadoUltimas24Horas,
    getAtendimentosAbertosUltimas24Horas,
    getAtendimentosAguardandoUltimas24Horas,
    checkForUpdates
=======
    getLogs,
    getAtendimentosRecebidosUltimas24Horas,
    getAtendimentosFinalizadoUltimas24Horas,
    getAtendimentosAbertosUltimas24Horas,
    getAtendimentosAguardandoUltimas24Horas
>>>>>>> 430d7b4b885b69c312ea1155d9b9776e902ecc9b
  };