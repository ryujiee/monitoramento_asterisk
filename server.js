const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const https = require('https');
<<<<<<< HEAD
const {getAtendimentosAguardandoUltimas24Horas, checkForUpdates, getAtendimentosAbertosUltimas24Horas, getAtendimentosFinalizadoUltimas24Horas, getAtendimentosRecebidosUltimas24Horas, getTotalTroncos, getTotalRamais, getQuantidadeChamadasAtivas, checkAsteriskStatus, getAsteriskUptime, getOfflineAndOnlinePeers, getChamadasEmAndamento, getSIPPeersInUse, getPeerOwner} = require('./service');
=======
const {getAtendimentosAguardandoUltimas24Horas, getAtendimentosAbertosUltimas24Horas, getAtendimentosFinalizadoUltimas24Horas, getAtendimentosRecebidosUltimas24Horas, getLogs, getTotalTroncos, getTotalRamais, getQuantidadeChamadasAtivas, checkAsteriskStatus, getAsteriskUptime, getOfflineAndOnlinePeers, getChamadasEmAndamento, getSIPPeersInUse, getPeerOwner} = require('./service');
>>>>>>> 430d7b4b885b69c312ea1155d9b9776e902ecc9b
const sslConfig = require('./SSL/sslConfig');

// Criação do servidor HTTPS
const httpsServer = https.createServer(sslConfig.credentials, app);

// Configuração do socket.io
const io = require('socket.io')(httpsServer);

// Configuração do Express
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuração do express-session
app.use(session({
    secret: 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTY4NjE2NDkwNywiaWF0IjoxNjg2MTY0OTA3fQ.GlQEwXVAzX3M3E_DBKsX--UtiL2VFOEZny430YFIpdY',
    resave: false,
    saveUninitialized: false
  }));

// Configuração do Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        return done(null, false);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});


// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  };

  app.post('/check-updates', isAuthenticated, async (req, res) => {
    const updateAvailable = await checkForUpdates();
    let updateMessage;
    
    if (updateAvailable) {
      updateMessage = 'Há uma atualização disponível.';
    } else {
      updateMessage = 'Você está utilizando a versão mais recente.';
    }
    const user = req.user
    const usuario = user.username
    const totalRamaisData = await getTotalRamais();
    const quantidadeLigacoes = await getQuantidadeChamadasAtivas();
    const asteriskStatus = await checkAsteriskStatus();
    const asteriskUptime = await getAsteriskUptime();
    const ramaisData = await getOfflineAndOnlinePeers();
    const ramaisOffline = ramaisData.offline;
    const ramaisOnline = ramaisData.online;
    const totalRamais = totalRamaisData.totalRamais;
    const totalOnline = ramaisOnline.length;
    const totalOffline = ramaisOffline.length;
    const chamadasEmAndamento = await getChamadasEmAndamento();
    const mensagemChamadasEmAndamento = chamadasEmAndamento.mensagens;
    const mensagemChamadasEmAndamentoEntrada = chamadasEmAndamento.mensagens_entrada;
    const peersInUse = await getSIPPeersInUse();
    const totalTroncos = await getTotalTroncos();
    const atendimentosRecebidosUltimas24Horas = await getAtendimentosRecebidosUltimas24Horas()
    const atendimentosFinalizadosUltimas24Horas = await getAtendimentosFinalizadoUltimas24Horas()
    const atendimentosAbertosUltimas24Horas = await getAtendimentosAbertosUltimas24Horas()
    const atendimentosAguardandoUltimas24Horas = await getAtendimentosAguardandoUltimas24Horas()
          for (const peer of peersInUse) {
              if (peer.inUse !== '0/0/0') {
                  const owner = await getPeerOwner(peer.peerName);
                  const ownerWithoutTags = owner.replace(/<[^>]+>/g, '');
                  peer.owner = ownerWithoutTags;
              }
          }
    
    res.render('dashboard', {hash: 'update', updateMessage , atendimentosAguardandoUltimas24Horas, atendimentosAbertosUltimas24Horas, atendimentosFinalizadosUltimas24Horas, atendimentosRecebidosUltimas24Horas, usuario, ramaisOnline, ramaisOffline, totalTroncos, mensagemChamadasEmAndamentoEntrada, totalRamaisData, quantidadeLigacoes, asteriskStatus, asteriskUptime, ramaisData, totalOffline, totalOnline, totalRamais, mensagemChamadasEmAndamento, peersInUse});
  });
  
  // Rota para atualizar o aplicativo
app.post('/update', isAuthenticated, (req, res) => {
  // Executar comandos para atualizar o aplicativo
  exec('cd /monitoramento_asterisk && git pull && npm install && pm2 restart "Dashboard Telefonia"', (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao atualizar: ${error}`);
      return res.status(500).send('Erro ao atualizar.');
    }

    console.log(`Atualização concluída:\n${stdout}`);
    res.redirect('/login');
  });
});
  
  
  
  

      
// Rota para criar usuário e senha na primeira vez que a plataforma é acessada
app.get('/setup', async (req, res) => {
    try {
      const usersCount = await User.countDocuments();
      if (usersCount > 0) {
        res.redirect('/login');
        return;
      }
  
      res.render('setup');
    } catch (error) {
      console.log('Erro ao verificar usuários:', error);
      res.status(500).send('Erro ao verificar usuários');
    }
  });
  
  // Rota para processar o formulário de criação de usuário e senha
  app.post('/setup', async (req, res) => {
    try {
      const { username, password } = req.body;
      const usersCount = await User.countDocuments({});
  
      if (usersCount > 0) {
        res.redirect('/login');
        return;
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      await User.create({
        username,
        password: hashedPassword
      });
  
      res.redirect('/login');
    } catch (error) {
      console.log('Erro ao criar usuário:', error);
      res.status(500).send('Erro ao criar usuário');
    }
  });

// Rota para trocar a senha
app.get('/change-password', isAuthenticated, async (req, res) => {
    res.render('change-password');
});
  
  app.get('/login', async (req, res) => {
    try {
      const count = await User.countDocuments({}).exec();
  
      if (count === 0) {
        return res.redirect('/setup');
      }
  
      res.render('login');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });

  // Rota para atualizar a senha
app.post('/change-password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!req.user) {
      res.status(401).send('Usuário não autenticado');
      return;
    }

    // Verificar se a senha atual do usuário corresponde à senha armazenada (pode variar dependendo da implementação do seu sistema de autenticação)
    const isMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isMatch) {
      res.status(401).send('Senha atual incorreta');
      return;
    }

    // Gerar o hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar a senha do usuário
    req.user.password = hashedPassword;
    await req.user.save();

    // Efetua o logout do usuário
    req.session.destroy(function (err) {
      res.redirect('/'); //Inside a callback… bulletproof!
    });
  } catch (error) {
    console.log('Erro ao atualizar senha:', error);
    res.status(500).send('Erro ao atualizar senha');
  }
});

app.get('/logout', function (req, res){
  req.session.destroy(function (err) {
    res.redirect('/'); //Inside a callback… bulletproof!
  });
});

  app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
  }));

    app.get('/', isAuthenticated, async (req, res) => {
      const user = req.user
      const usuario = user.username
      const totalRamaisData = await getTotalRamais();
      const quantidadeLigacoes = await getQuantidadeChamadasAtivas();
      const asteriskStatus = await checkAsteriskStatus();
      const asteriskUptime = await getAsteriskUptime();
      const ramaisData = await getOfflineAndOnlinePeers();
      const ramaisOffline = ramaisData.offline;
      const ramaisOnline = ramaisData.online;
      const totalRamais = totalRamaisData.totalRamais;
      const totalOnline = ramaisOnline.length;
      const totalOffline = ramaisOffline.length;
      const chamadasEmAndamento = await getChamadasEmAndamento();
      const mensagemChamadasEmAndamento = chamadasEmAndamento.mensagens;
      const mensagemChamadasEmAndamentoEntrada = chamadasEmAndamento.mensagens_entrada;
      const peersInUse = await getSIPPeersInUse();
      const totalTroncos = await getTotalTroncos();
<<<<<<< HEAD
=======
      const logs = getLogs();
>>>>>>> 430d7b4b885b69c312ea1155d9b9776e902ecc9b
      const atendimentosRecebidosUltimas24Horas = await getAtendimentosRecebidosUltimas24Horas()
      const atendimentosFinalizadosUltimas24Horas = await getAtendimentosFinalizadoUltimas24Horas()
      const atendimentosAbertosUltimas24Horas = await getAtendimentosAbertosUltimas24Horas()
      const atendimentosAguardandoUltimas24Horas = await getAtendimentosAguardandoUltimas24Horas()
            for (const peer of peersInUse) {
                if (peer.inUse !== '0/0/0') {
                    const owner = await getPeerOwner(peer.peerName);
                    const ownerWithoutTags = owner.replace(/<[^>]+>/g, '');
                    peer.owner = ownerWithoutTags;
                }
            }
<<<<<<< HEAD
      let updateMessage 
        res.render('dashboard', {hash: "no", updateMessage , atendimentosAguardandoUltimas24Horas, atendimentosAbertosUltimas24Horas, atendimentosFinalizadosUltimas24Horas, atendimentosRecebidosUltimas24Horas, usuario, ramaisOnline, ramaisOffline, totalTroncos, mensagemChamadasEmAndamentoEntrada, totalRamaisData, quantidadeLigacoes, asteriskStatus, asteriskUptime, ramaisData, totalOffline, totalOnline, totalRamais, mensagemChamadasEmAndamento, peersInUse});
=======

        res.render('dashboard', {atendimentosAguardandoUltimas24Horas, atendimentosAbertosUltimas24Horas, atendimentosFinalizadosUltimas24Horas, atendimentosRecebidosUltimas24Horas, usuario, ramaisOnline, ramaisOffline, totalTroncos, mensagemChamadasEmAndamentoEntrada, totalRamaisData, quantidadeLigacoes, asteriskStatus, asteriskUptime, ramaisData, totalOffline, totalOnline, totalRamais, mensagemChamadasEmAndamento, peersInUse, logs});
>>>>>>> 430d7b4b885b69c312ea1155d9b9776e902ecc9b
      });

    const updateData = async () => {
            const totalRamaisData = await getTotalRamais();
            const quantidadeLigacoes = await getQuantidadeChamadasAtivas();
            const asteriskStatus = await checkAsteriskStatus();
            const asteriskUptime = await getAsteriskUptime();
            const ramaisData = await getOfflineAndOnlinePeers();
            const ramaisOffline = ramaisData.offline;
            const ramaisOnline = ramaisData.online;
            const totalRamais = totalRamaisData.totalRamais; 
            const totalOnline = ramaisOnline.length; 
            const totalOffline = ramaisOffline.length; 
            const chamadasEmAndamento = await getChamadasEmAndamento();
            const mensagemChamadasEmAndamento = chamadasEmAndamento.mensagens;
            const mensagemChamadasEmAndamentoEntrada = chamadasEmAndamento.mensagens_entrada;
            const peersInUse = await getSIPPeersInUse();
            const totalTroncos = await getTotalTroncos();
            const atendimentosRecebidosUltimas24Horas = await getAtendimentosRecebidosUltimas24Horas()
            const atendimentosFinalizadosUltimas24Horas = await getAtendimentosFinalizadoUltimas24Horas()
            const atendimentosAbertosUltimas24Horas = await getAtendimentosAbertosUltimas24Horas()
            const atendimentosAguardandoUltimas24Horas = await getAtendimentosAguardandoUltimas24Horas()
<<<<<<< HEAD
=======
            logs = getLogs();
>>>>>>> 430d7b4b885b69c312ea1155d9b9776e902ecc9b
            for (const peer of peersInUse) {
                if (peer.inUse !== '0/0/0') {
                    const owner = await getPeerOwner(peer.peerName);

                    // Remover caracteres entre "<>"
                    const ownerWithoutTags = owner.replace(/<[^>]+>/g, '');
                    peer.owner = ownerWithoutTags;
                }
            }

            // Emitir os dados atualizados para os clientes conectados
<<<<<<< HEAD
            io.emit('dataUpdated', {atendimentosAguardandoUltimas24Horas, atendimentosAbertosUltimas24Horas, atendimentosFinalizadosUltimas24Horas, atendimentosRecebidosUltimas24Horas, totalRamaisData, quantidadeLigacoes, asteriskStatus, asteriskUptime, ramaisData, ramaisOffline, totalOffline, totalOnline, totalRamais, peersInUse, totalTroncos});
=======
            io.emit('dataUpdated', {atendimentosAguardandoUltimas24Horas, atendimentosAbertosUltimas24Horas, atendimentosFinalizadosUltimas24Horas, atendimentosRecebidosUltimas24Horas, totalRamaisData, quantidadeLigacoes, asteriskStatus, asteriskUptime, ramaisData, ramaisOffline, totalOffline, totalOnline, totalRamais, peersInUse, totalTroncos, logs});
>>>>>>> 430d7b4b885b69c312ea1155d9b9776e902ecc9b
            io.emit('ramaisOnlineUpdated', {ramaisOnline: ramaisOnline});
            io.emit('ramaisOfflineUpdated', {ramaisOffline: ramaisOffline});
            io.emit('chamadasAndamentoUpdated', {mensagemChamadasEmAndamento: mensagemChamadasEmAndamento});
            io.emit('chamadasAndamentoEntradaUpdated', {mensagemChamadasEmAndamentoEntrada: mensagemChamadasEmAndamentoEntrada});
            io.emit('totalTroncosUpdated', {totalTroncos: totalTroncos});
            io.emit('peersInUse', {peersInUse: peersInUse});
    }

    let interval;

    app.post("/updateInterval", (req, res) => {
        let selectedValue = req.body.interval;
        if (selectedValue < 5) {
            selectedValue = 5;
        }
        updateInterval(selectedValue);
        res.sendStatus(200);
    });
    

    function updateInterval(selectedValue) {
        clearInterval(interval);
        const intervalMilliseconds = selectedValue * 1000;
        interval = setInterval(updateData, intervalMilliseconds);
    }
    updateInterval(5);



// Inicie o banco e servidor HTTPS
const { connect } = require('./database/DB');
connect()
  .then(() => {
    httpsServer.listen(7000, () => {
      console.log('Dashboard Asterisk iniciada na porta 7000');
    });
  })
  .catch((error) => {
    console.error('Erro ao conectar ao banco de dados:', error);
  });